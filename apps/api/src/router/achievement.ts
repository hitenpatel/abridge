import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolAdminProcedure, schoolFeatureProcedure } from "../trpc";

export const achievementRouter = router({
	createCategory: schoolAdminProcedure
		.input(
			z.object({
				schoolId: z.string(),
				name: z.string().min(1).max(100),
				icon: z.string().max(100).optional(),
				pointValue: z.number().int().positive().default(1),
				type: z.enum(["POINTS", "BADGE"]).default("POINTS"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// schoolAdminProcedure doesn't load features, load manually
			const school = await ctx.prisma.school.findUnique({
				where: { id: ctx.schoolId },
				select: {
					achievementsEnabled: true,
					messagingEnabled: true,
					paymentsEnabled: true,
					attendanceEnabled: true,
					calendarEnabled: true,
					formsEnabled: true,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
					translationEnabled: true,
					parentsEveningEnabled: true,
					wellbeingEnabled: true,
					emergencyCommsEnabled: true,
					analyticsEnabled: true,
					mealBookingEnabled: true,
					clubBookingEnabled: true,
					reportCardsEnabled: true,
					communityHubEnabled: true,
					homeworkEnabled: true,
					readingDiaryEnabled: true,
					visitorManagementEnabled: true,
					misIntegrationEnabled: true,
					galleryEnabled: true,
					progressSummariesEnabled: true,
					liveChatEnabled: true,
				},
			});
			if (!school) {
				throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
			}
			assertFeatureEnabled({ schoolFeatures: school }, "achievements");

			const category = await ctx.prisma.achievementCategory.create({
				data: {
					schoolId: ctx.schoolId,
					name: input.name,
					icon: input.icon,
					pointValue: input.pointValue,
					type: input.type,
				},
			});

			return category;
		}),

	listCategories: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "achievements");

			const categories = await ctx.prisma.achievementCategory.findMany({
				where: { schoolId: input.schoolId, isActive: true },
				orderBy: { name: "asc" },
			});

			return categories;
		}),

	awardAchievement: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
				categoryId: z.string(),
				reason: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "achievements");

			// Look up category to get pointValue
			const category = await ctx.prisma.achievementCategory.findUnique({
				where: { id: input.categoryId },
			});
			if (!category || category.schoolId !== input.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
			}

			const achievement = await ctx.prisma.achievement.create({
				data: {
					schoolId: input.schoolId,
					childId: input.childId,
					categoryId: input.categoryId,
					awardedBy: ctx.user.id,
					points: category.pointValue,
					reason: input.reason,
				},
			});

			return achievement;
		}),

	getChildAchievements: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				cursor: z.string().optional(),
				limit: z.number().int().min(1).max(50).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent-child link
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not a parent of this child" });
			}

			const [awards, totalPointsResult] = await Promise.all([
				ctx.prisma.achievement.findMany({
					where: { childId: input.childId },
					include: {
						category: { select: { name: true, icon: true, type: true } },
						awarder: { select: { name: true } },
					},
					orderBy: { createdAt: "desc" },
					take: input.limit + 1,
					...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
				}),
				ctx.prisma.achievement.aggregate({
					where: { childId: input.childId },
					_sum: { points: true },
				}),
			]);

			let nextCursor: string | undefined;
			if (awards.length > input.limit) {
				const last = awards.pop();
				nextCursor = last?.id;
			}

			return {
				awards,
				totalPoints: totalPointsResult._sum.points ?? 0,
				nextCursor,
			};
		}),

	getClassLeaderboard: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "achievements");

			const grouped = await ctx.prisma.achievement.groupBy({
				by: ["childId"],
				where: { schoolId: input.schoolId },
				_sum: { points: true },
				orderBy: { _sum: { points: "desc" } },
				take: 20,
			});

			const childIds = grouped.map((g: { childId: string }) => g.childId);
			const children = await ctx.prisma.child.findMany({
				where: { id: { in: childIds } },
				select: { id: true, firstName: true, lastName: true },
			});

			const childMap = new Map(children.map((c) => [c.id, c]));

			return grouped.map(
				(g: { childId: string; _sum: { points: number | null } }, idx: number) => ({
					rank: idx + 1,
					childId: g.childId,
					childName: (() => {
						const c = childMap.get(g.childId);
						return c ? `${c.firstName} ${c.lastName}` : "Unknown";
					})(),
					totalPoints: g._sum.points ?? 0,
				}),
			);
		}),

	getRecentAwards: protectedProcedure.query(async ({ ctx }) => {
		// Get parent's children
		const parentLinks = await ctx.prisma.parentChild.findMany({
			where: { userId: ctx.user.id },
			select: { childId: true },
		});
		const childIds = parentLinks.map((p: { childId: string }) => p.childId);

		if (childIds.length === 0) return [];

		const awards = await ctx.prisma.achievement.findMany({
			where: { childId: { in: childIds } },
			include: {
				category: { select: { name: true, icon: true, type: true } },
				awarder: { select: { name: true } },
				child: { select: { firstName: true } },
			},
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		return awards;
	}),

	deactivateCategory: schoolAdminProcedure
		.input(
			z.object({
				schoolId: z.string(),
				categoryId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify category belongs to this school
			const existing = await ctx.prisma.achievementCategory.findFirst({
				where: { id: input.categoryId, schoolId: ctx.schoolId },
			});
			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
			}

			const category = await ctx.prisma.achievementCategory.update({
				where: { id: input.categoryId },
				data: { isActive: false },
			});

			return category;
		}),
});
