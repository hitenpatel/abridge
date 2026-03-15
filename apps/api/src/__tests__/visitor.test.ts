import { describe, expect, it, vi } from "vitest";
import { visitorRouter } from "../router/visitor";
import { router } from "../trpc";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
					messagingEnabled: false,
					paymentsEnabled: false,
					attendanceEnabled: false,
					calendarEnabled: false,
					formsEnabled: false,
					translationEnabled: false,
					parentsEveningEnabled: false,
					wellbeingEnabled: false,
					emergencyCommsEnabled: false,
					analyticsEnabled: false,
					mealBookingEnabled: false,
					clubBookingEnabled: false,
					reportCardsEnabled: false,
					communityHubEnabled: false,
					homeworkEnabled: false,
					readingDiaryEnabled: false,
					visitorManagementEnabled: true,
					misIntegrationEnabled: false,
					paymentDinnerMoneyEnabled: false,
					paymentTripsEnabled: false,
					paymentClubsEnabled: false,
					paymentUniformEnabled: false,
					paymentOtherEnabled: false,
				}),
			},
			visitor: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({
					id: "visitor-1",
					schoolId: "school-1",
					name: "John Smith",
					isRegular: false,
				}),
				update: vi.fn().mockResolvedValue({
					id: "visitor-1",
					schoolId: "school-1",
					name: "John Smith",
					isRegular: true,
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "visitor-1",
						name: "John Smith",
						isRegular: true,
					},
				]),
			},
			visitorLog: {
				create: vi.fn().mockResolvedValue({
					id: "log-1",
					visitorId: "visitor-1",
					purpose: "MEETING",
					signInAt: new Date(),
					signedInBy: "user-1",
				}),
				update: vi.fn().mockResolvedValue({
					id: "log-1",
					signOutAt: new Date(),
					signedOutBy: "user-1",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "log-1",
						visitorId: "visitor-1",
						signOutAt: null,
						visitor: { id: "visitor-1", name: "John Smith" },
					},
				]),
			},
			volunteerDbs: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({
					id: "dbs-1",
					name: "Jane Doe",
					dbsNumber: "DBS123456",
					dbsType: "ENHANCED",
					status: "VALID",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "dbs-1",
						name: "Jane Doe",
						dbsNumber: "DBS123456",
						status: "VALID",
					},
				]),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
				count: vi.fn().mockResolvedValue(12),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

const testRouter = router({ visitor: visitorRouter });

describe("visitor router", () => {
	describe("signIn", () => {
		it("creates a new visitor and log entry", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.signIn({
				schoolId: "school-1",
				name: "John Smith",
				purpose: "MEETING",
				isRegular: false,
			});

			expect(result).toHaveProperty("log");
			expect(result).toHaveProperty("dbsWarning");
			expect(result.dbsWarning).toBe(false);
			expect(ctx.prisma.visitor.create).toHaveBeenCalled();
			expect(ctx.prisma.visitorLog.create).toHaveBeenCalled();
		});

		it("updates existing visitor on sign in", async () => {
			const ctx = createTestContext();
			ctx.prisma.visitor.findFirst.mockResolvedValue({
				id: "visitor-1",
				schoolId: "school-1",
				name: "John Smith",
			});
			const caller = testRouter.createCaller(ctx);

			await caller.visitor.signIn({
				schoolId: "school-1",
				name: "John Smith",
				purpose: "MEETING",
				isRegular: true,
			});

			expect(ctx.prisma.visitor.update).toHaveBeenCalled();
			expect(ctx.prisma.visitor.create).not.toHaveBeenCalled();
		});

		it("returns dbsWarning when volunteer has no valid DBS", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.signIn({
				schoolId: "school-1",
				name: "John Smith",
				purpose: "VOLUNTEERING",
			});

			expect(result.dbsWarning).toBe(true);
			expect(ctx.prisma.volunteerDbs.findFirst).toHaveBeenCalled();
		});
	});

	describe("signOut", () => {
		it("updates the log with sign out time", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.signOut({
				schoolId: "school-1",
				logId: "log-1",
			});

			expect(result).toHaveProperty("signOutAt");
			expect(ctx.prisma.visitorLog.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "log-1" },
				}),
			);
		});
	});

	describe("searchVisitors", () => {
		it("returns matching visitors", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.searchVisitors({
				schoolId: "school-1",
				query: "John",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(1);
			expect(ctx.prisma.visitor.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						schoolId: "school-1",
						name: { contains: "John", mode: "insensitive" },
					},
					take: 10,
				}),
			);
		});
	});

	describe("getOnSite", () => {
		it("returns visitors without sign out", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.getOnSite({
				schoolId: "school-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(ctx.prisma.visitorLog.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { schoolId: "school-1", signOutAt: null },
					include: { visitor: true },
				}),
			);
		});
	});

	describe("addOrUpdateDbs", () => {
		it("creates a DBS record with computed status", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.addOrUpdateDbs({
				schoolId: "school-1",
				name: "Jane Doe",
				dbsNumber: "DBS123456",
				dbsType: "ENHANCED",
				issueDate: new Date("2026-01-15"),
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.volunteerDbs.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						name: "Jane Doe",
						dbsNumber: "DBS123456",
						dbsType: "ENHANCED",
						status: "VALID",
					}),
				}),
			);
		});

		it("computes EXPIRED status for past expiry date", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			await caller.visitor.addOrUpdateDbs({
				schoolId: "school-1",
				name: "Jane Doe",
				dbsNumber: "DBS789",
				dbsType: "BASIC",
				issueDate: new Date("2024-01-01"),
				expiryDate: new Date("2025-01-01"),
			});

			expect(ctx.prisma.volunteerDbs.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: "EXPIRED",
					}),
				}),
			);
		});
	});

	describe("getDbsRegister", () => {
		it("returns all DBS records for school", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.getDbsRegister({
				schoolId: "school-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(ctx.prisma.volunteerDbs.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { schoolId: "school-1" },
				}),
			);
		});
	});

	describe("getVisitorHistory", () => {
		it("returns paginated visitor logs", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.getVisitorHistory({
				schoolId: "school-1",
			});

			expect(result).toHaveProperty("logs");
			expect(result).toHaveProperty("nextCursor");
			expect(ctx.prisma.visitorLog.findMany).toHaveBeenCalled();
		});
	});

	describe("getFireRegister", () => {
		it("returns on-site visitors and staff count", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.visitor.getFireRegister({
				schoolId: "school-1",
			});

			expect(result).toHaveProperty("visitors");
			expect(result).toHaveProperty("staffCount");
			expect(result.staffCount).toBe(12);
			expect(ctx.prisma.staffMember.count).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { schoolId: "school-1" },
				}),
			);
		});
	});
});
