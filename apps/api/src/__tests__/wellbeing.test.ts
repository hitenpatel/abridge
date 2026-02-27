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
					wellbeingEnabled: true,
					emergencyCommsEnabled: false,
					analyticsEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
			wellbeingCheckIn: {
				upsert: vi.fn().mockResolvedValue({
					id: "checkin-1",
					childId: "child-1",
					mood: "GOOD",
					date: new Date("2026-02-27"),
				}),
				findMany: vi.fn().mockResolvedValue([]),
			},
			wellbeingAlert: {
				findMany: vi.fn().mockResolvedValue([]),
				update: vi.fn().mockResolvedValue({ id: "alert-1", status: "ACKNOWLEDGED" }),
				create: vi.fn().mockResolvedValue({ id: "alert-1" }),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					parentId: "user-1",
					childId: "child-1",
				}),
			},
			child: {
				findUnique: vi.fn().mockResolvedValue({
					id: "child-1",
					schoolId: "school-1",
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "TEACHER",
				}),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("wellbeing router", () => {
	describe("submitCheckIn", () => {
		it("creates a check-in for a child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.wellbeing.submitCheckIn({
				childId: "child-1",
				mood: "GOOD",
				note: "Had a good day",
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.wellbeingCheckIn.upsert).toHaveBeenCalled();
		});
	});

	describe("getCheckIns", () => {
		it("returns check-ins for a child in date range", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.wellbeing.getCheckIns({
				childId: "child-1",
				startDate: new Date("2026-02-01"),
				endDate: new Date("2026-02-28"),
			});

			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("getAlerts", () => {
		it("returns open alerts for a school", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.wellbeing.getAlerts({
				schoolId: "school-1",
				status: "OPEN",
			});

			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("acknowledgeAlert", () => {
		it("updates alert status to acknowledged", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.wellbeing.acknowledgeAlert({
				schoolId: "school-1",
				alertId: "alert-1",
			});

			expect(result.status).toBe("ACKNOWLEDGED");
		});
	});
});
