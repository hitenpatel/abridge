import type { PrismaClient } from "@schoolconnect/db";
import { NotificationService } from "../services/notification";
import { logger } from "./logger";
import { generateWeeklySummary } from "./progress-summary";

const MAX_WEEKLY_TOKENS = 500_000;

function getWeekStart(): Date {
	const now = new Date();
	const day = now.getDay();
	const diff = now.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(now);
	monday.setDate(diff);
	monday.setHours(0, 0, 0, 0);
	return monday;
}

async function runWeeklySummaries(prisma: PrismaClient): Promise<void> {
	const schools = await prisma.school.findMany({
		where: { progressSummariesEnabled: true },
		select: { id: true, name: true },
	});

	if (schools.length === 0) {
		logger.info("No schools with progress summaries enabled");
		return;
	}

	const weekStart = getWeekStart();
	const notificationService = new NotificationService(prisma);

	for (const school of schools) {
		let tokenUsage = 0;
		let generated = 0;
		let errors = 0;

		const children = await prisma.child.findMany({
			where: { schoolId: school.id },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				parentLinks: { select: { userId: true } },
			},
		});

		logger.info(
			{ schoolId: school.id, schoolName: school.name, childCount: children.length },
			"Starting progress summary generation",
		);

		for (const child of children) {
			// Hard cap: stop AI insights if budget exceeded
			if (tokenUsage >= MAX_WEEKLY_TOKENS) {
				logger.warn(
					{ schoolId: school.id, tokenUsage },
					"Weekly token budget exceeded, falling back to template-only",
				);
			}

			try {
				const result = await generateWeeklySummary(prisma, child.id, weekStart);
				generated++;

				// Track token usage from templateData if available
				const summary = await prisma.progressSummary.findUnique({
					where: { id: result.id },
					select: { templateData: true },
				});
				if (summary?.templateData && typeof summary.templateData === "object") {
					const data = summary.templateData as Record<string, unknown>;
					if (data.tokensUsed && typeof data.tokensUsed === "object") {
						const tokens = data.tokensUsed as { input?: number; output?: number };
						tokenUsage += (tokens.input || 0) + (tokens.output || 0);
					}
				}

				// Budget alert at 80%
				if (tokenUsage >= MAX_WEEKLY_TOKENS * 0.8 && tokenUsage < MAX_WEEKLY_TOKENS) {
					logger.warn(
						{ schoolId: school.id, tokenUsage, cap: MAX_WEEKLY_TOKENS },
						"Weekly token usage at 80% of cap",
					);
				}

				// Send push notification to parents
				const parentUserIds = child.parentLinks.map((link) => link.userId);
				if (parentUserIds.length > 0) {
					try {
						await notificationService.sendPush(
							parentUserIds,
							"Weekly Progress Summary",
							`${child.firstName}'s weekly summary is ready`,
							{ route: "/dashboard/progress" },
						);
					} catch (notifErr) {
						logger.warn(
							{ err: notifErr, childId: child.id },
							"Failed to send progress summary notification",
						);
					}
				}
			} catch (err) {
				errors++;
				logger.error(
					{ err, childId: child.id, schoolId: school.id },
					"Failed to generate progress summary for child",
				);
			}
		}

		logger.info(
			{ schoolId: school.id, generated, errors, tokenUsage, childCount: children.length },
			"Progress summary generation complete for school",
		);
	}
}

export function startProgressSummaryCron(prisma: PrismaClient): void {
	const cronHour = Number.parseInt(process.env.SUMMARY_CRON_HOUR || "6", 10);
	logger.info({ cronHour }, "Starting progress summary cron (checks every hour, runs Monday)");

	setInterval(
		() => {
			const now = new Date();
			// Only run on Monday (day 1) at the configured hour
			if (now.getDay() !== 1 || now.getHours() !== cronHour) return;

			runWeeklySummaries(prisma).catch((err) => {
				logger.error({ err }, "Progress summary cron failed");
			});
		},
		60 * 60 * 1000,
	);
}
