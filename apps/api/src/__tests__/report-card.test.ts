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
					reportCardsEnabled: true,
					communityHubEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
					// Branding fields
					logoUrl: null,
					brandColor: "#1E3A5F",
					secondaryColor: null,
					schoolMotto: null,
					brandFont: "DEFAULT",
					name: "Test School",
				}),
			},
			reportCycle: {
				create: vi.fn().mockResolvedValue({
					id: "cycle-1",
					name: "Autumn Term 2026",
					status: "DRAFT",
				}),
				findMany: vi.fn().mockResolvedValue([]),
				findUnique: vi.fn().mockResolvedValue({
					id: "cycle-1",
					status: "DRAFT",
					schoolId: "school-1",
				}),
				update: vi.fn().mockResolvedValue({
					id: "cycle-1",
					status: "PUBLISHED",
				}),
			},
			reportCard: {
				upsert: vi.fn().mockResolvedValue({ id: "card-1" }),
				findMany: vi.fn().mockResolvedValue([]),
				findUnique: vi.fn().mockResolvedValue({
					id: "card-1",
					generalComment: "Good progress",
					subjectGrades: [
						{
							subject: "Maths",
							level: "EXPECTED",
							effort: "GOOD",
							comment: "Well done",
						},
					],
					child: {
						firstName: "Test",
						lastName: "Child",
						yearGroup: "4",
					},
					cycle: {
						name: "Autumn 2026",
						assessmentModel: "PRIMARY_DESCRIPTIVE",
					},
				}),
			},
			subjectGrade: {
				createMany: vi.fn().mockResolvedValue({ count: 5 }),
				deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					parentId: "user-1",
					childId: "child-1",
				}),
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

describe("report card router", () => {
	describe("createCycle", () => {
		it("creates a report cycle", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.createCycle({
				schoolId: "school-1",
				name: "Autumn Term 2026",
				type: "TERMLY",
				assessmentModel: "PRIMARY_DESCRIPTIVE",
				publishDate: new Date("2026-12-20"),
			});

			expect(result).toHaveProperty("id");
			expect(result.status).toBe("DRAFT");
		});
	});

	describe("saveGrades", () => {
		it("saves subject grades for a child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.saveGrades({
				schoolId: "school-1",
				cycleId: "cycle-1",
				childId: "child-1",
				generalComment: "Good term overall",
				grades: [
					{
						subject: "Mathematics",
						sortOrder: 1,
						level: "EXPECTED",
						effort: "GOOD",
						comment: "Solid progress",
					},
					{
						subject: "English",
						sortOrder: 2,
						level: "EXCEEDING",
						effort: "OUTSTANDING",
						comment: "Excellent reading",
					},
				],
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.subjectGrade.createMany).toHaveBeenCalled();
		});
	});

	describe("publishCycle", () => {
		it("publishes a report cycle", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.publishCycle({
				schoolId: "school-1",
				cycleId: "cycle-1",
			});

			expect(result.status).toBe("PUBLISHED");
		});
	});

	describe("getReportCard", () => {
		it("returns report card with grades for a child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.getReportCard({
				childId: "child-1",
				cycleId: "cycle-1",
			});

			expect(result).toHaveProperty("subjectGrades");
			expect(result?.subjectGrades.length).toBeGreaterThan(0);
		});
	});
});
