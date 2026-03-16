import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
					messagingEnabled: true,
					paymentsEnabled: true,
					attendanceEnabled: true,
					calendarEnabled: true,
					formsEnabled: true,
					translationEnabled: false,
					parentsEveningEnabled: false,
					wellbeingEnabled: false,
					emergencyCommsEnabled: false,
					analyticsEnabled: false,
					mealBookingEnabled: false,
					clubBookingEnabled: false,
					reportCardsEnabled: false,
					communityHubEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
					homeworkEnabled: false,
					readingDiaryEnabled: false,
					visitorManagementEnabled: false,
					misIntegrationEnabled: false,
					achievementsEnabled: true,
				}),
			},
			achievementCategory: {
				findFirst: vi.fn().mockResolvedValue({
					id: "cat-1",
					schoolId: "school-1",
					name: "Star of the Week",
					isActive: true,
				}),
				create: vi.fn().mockResolvedValue({
					id: "cat-1",
					schoolId: "school-1",
					name: "Star of the Week",
					icon: "star",
					pointValue: 10,
					type: "POINTS",
					isActive: true,
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "cat-1",
						name: "Star of the Week",
						icon: "star",
						pointValue: 10,
						type: "POINTS",
						isActive: true,
					},
				]),
				findUnique: vi.fn().mockResolvedValue({
					id: "cat-1",
					schoolId: "school-1",
					pointValue: 10,
				}),
				update: vi.fn().mockResolvedValue({
					id: "cat-1",
					isActive: false,
				}),
			},
			achievement: {
				create: vi.fn().mockResolvedValue({
					id: "award-1",
					schoolId: "school-1",
					childId: "child-1",
					categoryId: "cat-1",
					awardedBy: "user-1",
					points: 10,
					reason: "Great work",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "award-1",
						childId: "child-1",
						points: 10,
						reason: "Great work",
						createdAt: new Date(),
						category: { name: "Star of the Week", icon: "star", type: "POINTS" },
						awarder: { name: "Test Teacher" },
					},
				]),
				aggregate: vi.fn().mockResolvedValue({ _sum: { points: 45 } }),
				groupBy: vi.fn().mockResolvedValue([
					{ childId: "child-1", _sum: { points: 45 } },
					{ childId: "child-2", _sum: { points: 30 } },
				]),
				count: vi.fn().mockResolvedValue(5),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					parentId: "user-1",
					childId: "child-1",
				}),
				findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
			},
			child: {
				findMany: vi.fn().mockResolvedValue([
					{ id: "child-1", firstName: "Emily", lastName: "Johnson" },
					{ id: "child-2", firstName: "Jack", lastName: "Johnson" },
				]),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("achievement router", () => {
	describe("createCategory", () => {
		it("creates an achievement category", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.achievement.createCategory({
				schoolId: "school-1",
				name: "Star of the Week",
				icon: "star",
				pointValue: 10,
				type: "POINTS",
			});

			expect(result).toHaveProperty("id");
			expect(result.name).toBe("Star of the Week");
			expect(ctx.prisma.achievementCategory.create).toHaveBeenCalled();
		});
	});

	describe("awardAchievement", () => {
		it("creates an achievement copying points from category", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.achievement.awardAchievement({
				schoolId: "school-1",
				childId: "child-1",
				categoryId: "cat-1",
				reason: "Great work",
			});

			expect(result).toHaveProperty("id");
			expect(result.points).toBe(10);
			expect(ctx.prisma.achievement.create).toHaveBeenCalled();
		});
	});

	describe("getChildAchievements", () => {
		it("returns achievements with total points", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.achievement.getChildAchievements({
				childId: "child-1",
			});

			expect(result).toHaveProperty("totalPoints");
			expect(result).toHaveProperty("awards");
			expect(result.totalPoints).toBe(45);
		});
	});

	describe("getClassLeaderboard", () => {
		it("returns leaderboard sorted by points", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.achievement.getClassLeaderboard({
				schoolId: "school-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("deactivateCategory", () => {
		it("deactivates a category", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.achievement.deactivateCategory({
				schoolId: "school-1",
				categoryId: "cat-1",
			});

			expect(result.isActive).toBe(false);
			expect(ctx.prisma.achievementCategory.update).toHaveBeenCalled();
		});
	});
});
