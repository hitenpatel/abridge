import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { logger } from "../lib/logger";
import { generateWeeklySummary } from "../lib/progress-summary";
import { protectedProcedure, router, schoolAdminProcedure, schoolFeatureProcedure } from "../trpc";

export const progressSummaryRouter = router({
	getLatestSummary: protectedProcedure
		.input(z.object({ childId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			// Verify parent-child relationship
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this child's data",
				});
			}

			const summary = await ctx.prisma.progressSummary.findFirst({
				where: { childId: input.childId },
				orderBy: { weekStart: "desc" },
			});

			return summary;
		}),

	getSummaryHistory: protectedProcedure
		.input(
			z.object({
				childId: z.string().min(1),
				limit: z.number().min(1).max(50).default(10),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent-child relationship
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this child's data",
				});
			}

			const items = await ctx.prisma.progressSummary.findMany({
				where: { childId: input.childId },
				orderBy: { weekStart: "desc" },
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const nextItem = items.pop();
				nextCursor = nextItem?.id;
			}

			return { items, nextCursor };
		}),

	generateNow: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string().min(1),
				childId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "progressSummaries");

			// Short-circuit: if summary exists for this child+week and was updated less than 1 hour ago
			const now = new Date();
			const weekStart = getWeekStart(now);

			const existing = await ctx.prisma.progressSummary.findUnique({
				where: { childId_weekStart: { childId: input.childId, weekStart } },
			});

			if (existing) {
				const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
				if (existing.updatedAt > hourAgo) {
					return { id: existing.id, summary: existing.summary };
				}
			}

			return generateWeeklySummary(ctx.prisma, input.childId, weekStart);
		}),

	generateWeeklyBatch: schoolAdminProcedure
		.input(z.object({ schoolId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			// schoolAdminProcedure doesn't load features, load manually
			const school = await ctx.prisma.school.findUnique({
				where: { id: ctx.schoolId },
				select: { progressSummariesEnabled: true },
			});
			if (!school?.progressSummariesEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Progress Summaries is disabled for this school",
				});
			}

			const children = await ctx.prisma.child.findMany({
				where: { schoolId: ctx.schoolId },
				select: { id: true },
			});

			const weekStart = getWeekStart(new Date());

			// Run generation in background
			Promise.resolve().then(async () => {
				let successCount = 0;
				let errorCount = 0;
				for (const child of children) {
					try {
						await generateWeeklySummary(ctx.prisma, child.id, weekStart);
						successCount++;
					} catch (err) {
						errorCount++;
						logger.error(
							{ err, childId: child.id },
							"Failed to generate progress summary for child",
						);
					}
				}
				logger.info(
					{ schoolId: ctx.schoolId, successCount, errorCount, total: children.length },
					"Weekly batch generation completed",
				);
			});

			return { status: "started" as const, childCount: children.length };
		}),
});

function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	// Monday = 1, Sunday = 0
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
	return weekStart;
}
