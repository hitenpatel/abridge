import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger";

/**
 * Shared AI provider caller.
 *
 * Supported AI_SUMMARY_PROVIDER values:
 *   "claude"  - Anthropic Claude API (requires ANTHROPIC_API_KEY)
 *   "openai"  - OpenAI-compatible API (requires AI_API_KEY, optional AI_BASE_URL)
 *   "template" - no AI, returns null (zero cost)
 */
export async function callAIProvider(
	systemPrompt: string,
	userMessage: string,
	options?: { maxTokens?: number; timeoutMs?: number },
): Promise<string | null> {
	const provider = process.env.AI_SUMMARY_PROVIDER || "template";
	if (provider === "template" || provider === "none") return null;

	const maxTokens = options?.maxTokens ?? 200;
	const timeoutMs = options?.timeoutMs ?? 5000;

	try {
		const result = await Promise.race([
			callProvider(provider, systemPrompt, userMessage, maxTokens),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("AI timeout")), timeoutMs),
			),
		]);
		return result;
	} catch (err) {
		logger.warn({ err, provider }, "AI provider call failed");
		return null;
	}
}

async function callProvider(
	provider: string,
	systemPrompt: string,
	userMessage: string,
	maxTokens: number,
): Promise<string | null> {
	if (provider === "claude") {
		const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
		const model = process.env.AI_MODEL || "claude-haiku-4-5-20251001";
		const response = await client.messages.create({
			model,
			max_tokens: maxTokens,
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
				max_tokens: maxTokens,
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

	logger.warn({ provider }, "Unknown AI provider");
	return null;
}
