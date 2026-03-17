import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

const TONE_PROMPTS: Record<string, string> = {
	formal: `You are a professional school communications officer. Write formal, polished messages from school to parents. Use "Dear Parents/Carers" greeting. Be concise but thorough. Maintain a respectful, professional tone throughout. Do not invent specific details not mentioned in the prompt.`,
	friendly: `You are a warm, approachable primary school teacher writing to parents. Use a friendly, conversational tone. Start with "Hi everyone" or similar. Keep it warm but informative. Do not invent specific details not mentioned in the prompt.`,
	urgent: `You are a school administrator sending an urgent communication to parents. Use a direct, clear tone. Start with "IMPORTANT:" or "Action Required:". Be concise and emphasise deadlines or required actions. Do not invent specific details not mentioned in the prompt.`,
};

// In-memory rate limiting: userId -> { count, windowStart }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(userId: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(userId);

	if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
		rateLimitMap.set(userId, { count: 1, windowStart: now });
		return true;
	}

	if (entry.count >= RATE_LIMIT_MAX) {
		return false;
	}

	entry.count++;
	return true;
}

async function callAIProvider(
	provider: string,
	systemPrompt: string,
	userMessage: string,
): Promise<string | null> {
	if (provider === "claude") {
		const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
		const model = process.env.AI_MODEL || "claude-haiku-4-5-20251001";
		const response = await client.messages.create({
			model,
			max_tokens: 500,
			system: systemPrompt,
			messages: [{ role: "user", content: userMessage }],
		});
		return response.content[0]?.type === "text" ? response.content[0].text : null;
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
				max_tokens: 500,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userMessage },
				],
			}),
		});

		if (!response.ok) {
			throw new Error(`AI API error: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		return data.choices?.[0]?.message?.content ?? null;
	}

	logger.warn({ provider }, "Unknown AI provider for drafting");
	return null;
}

export async function generateDraft(
	prompt: string,
	tone: "formal" | "friendly" | "urgent",
	schoolName: string,
): Promise<string | null> {
	const provider = process.env.AI_SUMMARY_PROVIDER || "template";
	if (provider === "template" || provider === "none") return null;

	const systemPrompt = `${TONE_PROMPTS[tone]}\n\nSchool name: ${schoolName}. Write the message based on the staff member's prompt below. Output only the message text, no subject line.`;
	const userMessage = prompt;

	try {
		const result = await Promise.race([
			callAIProvider(provider, systemPrompt, userMessage),
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 5000)),
		]);
		return result;
	} catch (err) {
		logger.warn({ err }, "AI draft generation failed");
		return null;
	}
}
