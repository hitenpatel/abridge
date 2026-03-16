import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/progress-summary", () => ({
	generateWeeklySummary: vi.fn().mockResolvedValue({
		id: "summary-new",
		summary: "Generated summary text",
	}),
}));

const allFeatureToggles = {
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
	achievementsEnabled: false,
	galleryEnabled: false,
	progressSummariesEnabled: true,
};

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue(allFeatureToggles),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
				}),
			},
			progressSummary: {
				findFirst: vi.fn().mockResolvedValue({
					id: "summary-1",
					childId: "child-1",
					schoolId: "school-1",
					weekStart: new Date("2026-03-09"),
					templateData: {},
					insight: null,
					summary: "Attendance: 100% (5/5 days).",
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "summary-1",
						childId: "child-1",
						weekStart: new Date("2026-03-09"),
						summary: "Week 1 summary",
					},
					{
						id: "summary-2",
						childId: "child-1",
						weekStart: new Date("2026-03-02"),
						summary: "Week 2 summary",
					},
				]),
				findUnique: vi.fn().mockResolvedValue({
					id: "summary-1",
					childId: "child-1",
					weekStart: new Date("2026-03-09"),
					summary: "Existing summary",
					updatedAt: new Date(), // just now, should short-circuit
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
			child: {
				findMany: vi.fn().mockResolvedValue([{ id: "child-1" }, { id: "child-2" }]),
				findUnique: vi.fn().mockResolvedValue(null),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("progress summary router", () => {
	it("getLatestSummary returns latest summary for parent's child", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.progressSummary.getLatestSummary({
			childId: "child-1",
		});

		expect(result).toHaveProperty("id", "summary-1");
		expect(result).toHaveProperty("summary");
		expect(ctx.prisma.parentChild.findFirst).toHaveBeenCalledWith({
			where: { userId: "user-1", childId: "child-1" },
		});
	});

	it("getLatestSummary rejects non-parent access", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				parentChild: {
					findFirst: vi.fn().mockResolvedValue(null),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(caller.progressSummary.getLatestSummary({ childId: "child-1" })).rejects.toThrow(
			"You do not have access to this child's data",
		);
	});

	it("getSummaryHistory returns paginated results", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.progressSummary.getSummaryHistory({
			childId: "child-1",
			limit: 10,
		});

		expect(result).toHaveProperty("items");
		expect(result).toHaveProperty("nextCursor");
		expect(Array.isArray(result.items)).toBe(true);
	});

	it("generateNow short-circuits when recent summary exists", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.progressSummary.generateNow({
			schoolId: "school-1",
			childId: "child-1",
		});

		// Should return the existing summary without calling generateWeeklySummary
		expect(result).toHaveProperty("id", "summary-1");
		expect(result).toHaveProperty("summary", "Existing summary");
	});
});
