import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/notification", () => ({
	notificationService: {
		getInstance: vi.fn().mockReturnValue({
			sendPush: vi.fn().mockResolvedValue({ success: true, count: 1 }),
		}),
	},
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
					id: "school-1",
					name: "Test School",
					messagingEnabled: true,
					paymentsEnabled: true,
					attendanceEnabled: true,
					calendarEnabled: true,
					formsEnabled: true,
					translationEnabled: false,
					parentsEveningEnabled: false,
					wellbeingEnabled: false,
					emergencyCommsEnabled: true,
					analyticsEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
			emergencyAlert: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({
					id: "alert-1",
					type: "LOCKDOWN",
					status: "ACTIVE",
					title: "Lockdown in Effect",
				}),
				update: vi.fn().mockResolvedValue({
					id: "alert-1",
					status: "ALL_CLEAR",
				}),
				findMany: vi.fn().mockResolvedValue([]),
			},
			emergencyUpdate: {
				create: vi.fn().mockResolvedValue({
					id: "update-1",
					message: "Stay calm",
				}),
				findMany: vi.fn().mockResolvedValue([]),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
		},
		user: { id: "user-1", name: "Admin User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("emergency router", () => {
	describe("initiateAlert", () => {
		it("creates an emergency alert", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.emergency.initiateAlert({
				schoolId: "school-1",
				type: "LOCKDOWN",
				message: "Please stay indoors",
			});

			expect(result).toHaveProperty("id");
			expect(result.status).toBe("ACTIVE");
			expect(ctx.prisma.emergencyAlert.create).toHaveBeenCalled();
		});

		it("rejects if active alert exists", async () => {
			const ctx = createTestContext();
			ctx.prisma.emergencyAlert.findFirst.mockResolvedValue({
				id: "existing",
				status: "ACTIVE",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.emergency.initiateAlert({
					schoolId: "school-1",
					type: "LOCKDOWN",
				}),
			).rejects.toThrow();
		});
	});

	describe("getActiveAlert", () => {
		it("returns null when no active alert", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.emergency.getActiveAlert({
				schoolId: "school-1",
			});

			expect(result).toBeNull();
		});
	});

	describe("resolveAlert", () => {
		it("resolves an active alert", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.emergency.resolveAlert({
				schoolId: "school-1",
				alertId: "alert-1",
				status: "ALL_CLEAR",
			});

			expect(result.status).toBe("ALL_CLEAR");
		});
	});
});
