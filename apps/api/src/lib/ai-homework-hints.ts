import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

const HINT_SYSTEM_PROMPT =
	"You are a teaching assistant helping a primary school pupil. Give one short guiding hint (not the answer). Age-appropriate. Max 200 characters.";

/**
 * Generate a homework hint using the configured AI provider.
 * Returns null if the provider is "template" or if generation fails.
 */
export async function generateHint(
	title: string,
	description: string | null,
	subject: string,
	yearGroup: string,
): Promise<string | null> {
	const provider = process.env.AI_SUMMARY_PROVIDER || "template";
	if (provider === "template" || provider === "none") return null;

	const userMessage = [
		`Subject: ${subject}`,
		`Year Group: ${yearGroup}`,
		`Title: ${title}`,
		description ? `Description: ${description}` : "",
	]
		.filter(Boolean)
		.join("\n");

	try {
		const result = await Promise.race([
			callHintProvider(provider, userMessage),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("AI timeout")), 5000),
			),
		]);

		// Enforce 200 character limit
		if (result && result.length > 200) {
			return result.slice(0, 200);
		}

		return result;
	} catch (err) {
		logger.warn({ err }, "AI hint generation failed");
		return null;
	}
}

async function callHintProvider(
	provider: string,
	userMessage: string,
): Promise<string | null> {
	if (provider === "claude") {
		const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
		const model = process.env.AI_MODEL || "claude-haiku-4-5-20251001";
		const response = await client.messages.create({
			model,
			max_tokens: 100,
			system: HINT_SYSTEM_PROMPT,
			messages: [{ role: "user", content: userMessage }],
		});
		return response.content[0]?.type === "text"
			? response.content[0].text
			: null;
	}

	if (provider === "openai") {
		const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
		const apiKey = process.env.AI_API_KEY || "";
		const model = process.env.AI_MODEL || "gpt-4o-mini";

		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
			},
			body: JSON.stringify({
				model,
				max_tokens: 100,
				messages: [
					{ role: "system", content: HINT_SYSTEM_PROMPT },
					{ role: "user", content: userMessage },
				],
			}),
		});

		if (!response.ok) {
			throw new Error(
				`AI API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		return data.choices?.[0]?.message?.content ?? null;
	}

	logger.warn({ provider }, "Unknown AI provider for hint generation");
	return null;
}
