import { createHash } from "node:crypto";
import type { PrismaClient } from "@schoolconnect/db";
import { logger } from "../lib/logger";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";

function hashText(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

export async function translateTexts(
	prisma: PrismaClient,
	texts: string[],
	targetLang: string,
	sourceLang = "en",
): Promise<string[]> {
	if (targetLang === sourceLang) return texts;

	const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
	if (!apiKey) {
		logger.warn("GOOGLE_TRANSLATE_API_KEY not set, returning original texts");
		return texts;
	}

	// Check cache for each text
	const hashes = texts.map((t) => hashText(t));
	const cached = await prisma.translationCache.findMany({
		where: {
			sourceHash: { in: hashes },
			sourceLang,
			targetLang,
		},
	});

	const cacheMap = new Map(cached.map((c) => [c.sourceHash, c.translated]));
	const results: string[] = [];
	const misses: { index: number; text: string; hash: string }[] = [];

	for (let i = 0; i < texts.length; i++) {
		const hash = hashes[i] as string;
		const hit = cacheMap.get(hash);
		if (hit) {
			results[i] = hit;
		} else {
			misses.push({ index: i, text: texts[i] as string, hash });
		}
	}

	if (misses.length === 0) return results;

	// Call Google Translate for cache misses (batch)
	const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			q: misses.map((m) => m.text),
			source: sourceLang,
			target: targetLang,
			format: "text",
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		logger.error({ status: response.status, body: errorText }, "Google Translate API error");
		// Return original texts on failure
		for (const miss of misses) {
			results[miss.index] = miss.text;
		}
		return results;
	}

	const data = await response.json();
	const translations = data.data.translations as {
		translatedText: string;
	}[];

	// Cache results and fill in misses
	const cacheData = misses.map((miss, i) => ({
		sourceHash: miss.hash,
		sourceLang,
		targetLang,
		sourceText: miss.text,
		translated: (translations[i] as { translatedText: string }).translatedText,
	}));

	// Bulk insert cache entries (ignore conflicts)
	await prisma.translationCache.createMany({
		data: cacheData,
		skipDuplicates: true,
	});

	for (let i = 0; i < misses.length; i++) {
		const miss = misses[i] as { index: number; text: string; hash: string };
		results[miss.index] = (translations[i] as { translatedText: string }).translatedText;
	}

	return results;
}
