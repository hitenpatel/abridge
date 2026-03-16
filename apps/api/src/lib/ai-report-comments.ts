import type { PrismaClient } from "@schoolconnect/db";
import { callAIProvider } from "./ai-provider";
import { logger } from "./logger";
import {
	type ChildWeeklyMetrics,
	gatherChildMetrics,
	renderTemplateSummary,
} from "./progress-summary";

const REPORT_COMMENT_SYSTEM_PROMPT =
	"Generate a 2-3 sentence report card comment for a UK primary school pupil. Be professional, specific, and encouraging. Reference concrete data where available. Do not use generic phrases. Write in third person. Return ONLY the comment text, no quotes or labels.";

/**
 * Generate an AI report card comment for a child in a specific subject.
 *
 * Uses the child's metrics (attendance, homework, reading, achievements, wellbeing)
 * to produce a contextual, data-driven comment.
 */
export async function generateComment(
	prisma: PrismaClient,
	childId: string,
	subject: string,
	currentGrade?: string | null,
): Promise<string | null> {
	const provider = process.env.AI_SUMMARY_PROVIDER || "template";
	if (provider === "template" || provider === "none") return null;

	// Gather recent metrics (last 4 weeks for broader context)
	const weekEnd = new Date();
	const weekStart = new Date();
	weekStart.setDate(weekStart.getDate() - 28);

	let metrics: ChildWeeklyMetrics;
	try {
		metrics = await gatherChildMetrics(prisma, childId, weekStart, weekEnd);
	} catch (err) {
		logger.warn({ err, childId }, "Failed to gather child metrics for report comment");
		return null;
	}

	const metricsText = renderTemplateSummary(metrics);

	const userMessage = [
		`Child: ${metrics.childName}`,
		`Subject: ${subject}`,
		currentGrade ? `Current grade/level: ${currentGrade}` : null,
		"",
		"Recent data:",
		metricsText,
	]
		.filter(Boolean)
		.join("\n");

	const result = await callAIProvider(REPORT_COMMENT_SYSTEM_PROMPT, userMessage, {
		maxTokens: 200,
		timeoutMs: 5000,
	});

	return result;
}
