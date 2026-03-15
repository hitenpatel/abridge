import { describe, expect, it, vi } from "vitest";
import { misRouter } from "../router/mis";
import { router } from "../trpc";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

const testRouter = router({ mis: misRouter });

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
					visitorManagementEnabled: false,
					misIntegrationEnabled: true,
					paymentDinnerMoneyEnabled: false,
					paymentTripsEnabled: false,
					paymentClubsEnabled: false,
					paymentUniformEnabled: false,
					paymentOtherEnabled: false,
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
			misConnection: {
				upsert: vi.fn().mockResolvedValue({
					id: "conn-1",
					schoolId: "school-1",
					provider: "CSV_MANUAL",
					status: "CONNECTED",
					syncFrequency: "MANUAL",
				}),
				findUnique: vi.fn().mockResolvedValue({
					id: "conn-1",
					schoolId: "school-1",
					provider: "CSV_MANUAL",
					status: "CONNECTED",
					syncFrequency: "MANUAL",
					lastSyncAt: null,
					lastSyncStatus: null,
					lastSyncError: null,
				}),
				update: vi.fn().mockResolvedValue({
					id: "conn-1",
					status: "CONNECTED",
				}),
			},
			misSyncLog: {
				create: vi.fn().mockResolvedValue({
					id: "log-1",
					connectionId: "conn-1",
					syncType: "STUDENTS",
					status: "STARTED",
				}),
				update: vi.fn().mockResolvedValue({
					id: "log-1",
					status: "SUCCESS",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "log-1",
						connectionId: "conn-1",
						syncType: "STUDENTS",
						status: "SUCCESS",
						recordsProcessed: 2,
						recordsCreated: 2,
						recordsUpdated: 0,
						recordsSkipped: 0,
						errors: null,
						startedAt: new Date("2026-03-15T10:00:00Z"),
						completedAt: new Date("2026-03-15T10:00:01Z"),
						durationMs: 1000,
					},
				]),
			},
			child: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockImplementation((args) => ({
					id: `child-${Date.now()}`,
					...args.data,
				})),
				update: vi.fn().mockImplementation((args) => ({
					id: args.where.id,
					...args.data,
				})),
			},
			attendanceRecord: {
				upsert: vi.fn().mockResolvedValue({
					id: "att-1",
					mark: "PRESENT",
				}),
			},
		},
		user: { id: "user-1", name: "Test Admin" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("mis router", () => {
	describe("setupConnection", () => {
		it("creates a MIS connection", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.mis.setupConnection({
				schoolId: "school-1",
				provider: "CSV_MANUAL",
				credentials: "csv-manual",
				syncFrequency: "MANUAL",
			});

			expect(result).toHaveProperty("id");
			expect(result.provider).toBe("CSV_MANUAL");
			expect(result.status).toBe("CONNECTED");
			expect(ctx.prisma.misConnection.upsert).toHaveBeenCalled();
		});
	});

	describe("uploadStudentsCsv", () => {
		it("processes CSV and creates children", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const csvData = [
				"first_name,last_name,date_of_birth,year_group,class_name",
				"Alice,Smith,2018-03-15,Year 1,1A",
				"Bob,Jones,2017-09-01,Year 2,2B",
			].join("\n");

			const result = await caller.mis.uploadStudentsCsv({
				schoolId: "school-1",
				csvData,
			});

			expect(result.created).toBe(2);
			expect(result.updated).toBe(0);
			expect(result.skipped).toBe(0);
			expect(result.errors).toHaveLength(0);
			expect(result.total).toBe(2);
			expect(ctx.prisma.child.create).toHaveBeenCalledTimes(2);
			expect(ctx.prisma.misSyncLog.create).toHaveBeenCalled();
			expect(ctx.prisma.misSyncLog.update).toHaveBeenCalled();
		});

		it("reports validation errors for missing fields", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const csvData = [
				"first_name,last_name,date_of_birth,year_group",
				"Alice,,2018-03-15,Year 1",
			].join("\n");

			const result = await caller.mis.uploadStudentsCsv({
				schoolId: "school-1",
				csvData,
			});

			expect(result.created).toBe(0);
			expect(result.skipped).toBe(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.field).toBe("last_name");
		});
	});

	describe("uploadAttendanceCsv", () => {
		it("processes attendance CSV and upserts records", async () => {
			const ctx = createTestContext();
			// Make child.findFirst return a child for attendance matching
			ctx.prisma.child.findFirst.mockResolvedValue({
				id: "child-1",
				schoolId: "school-1",
				firstName: "Alice",
				lastName: "Smith",
			});
			const caller = testRouter.createCaller(ctx);

			const csvData = [
				"first_name,last_name,date_of_birth,date,session,mark",
				"Alice,Smith,2018-03-15,2026-03-10,AM,PRESENT",
			].join("\n");

			const result = await caller.mis.uploadAttendanceCsv({
				schoolId: "school-1",
				csvData,
			});

			expect(result.created).toBe(1);
			expect(result.errors).toHaveLength(0);
			expect(ctx.prisma.attendanceRecord.upsert).toHaveBeenCalled();
		});

		it("skips rows with invalid marks", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const csvData = [
				"first_name,last_name,date_of_birth,date,session,mark",
				"Alice,Smith,2018-03-15,2026-03-10,AM,INVALID_MARK",
			].join("\n");

			const result = await caller.mis.uploadAttendanceCsv({
				schoolId: "school-1",
				csvData,
			});

			expect(result.created).toBe(0);
			expect(result.skipped).toBe(1);
			expect(result.errors[0]?.field).toBe("mark");
		});
	});

	describe("getSyncHistory", () => {
		it("returns sync logs", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.mis.getSyncHistory({
				schoolId: "school-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(1);
			expect(result[0]?.syncType).toBe("STUDENTS");
			expect(result[0]?.status).toBe("SUCCESS");
			expect(ctx.prisma.misSyncLog.findMany).toHaveBeenCalled();
		});
	});

	describe("getConnectionStatus", () => {
		it("returns connection details", async () => {
			const ctx = createTestContext();
			const caller = testRouter.createCaller(ctx);

			const result = await caller.mis.getConnectionStatus({
				schoolId: "school-1",
			});

			expect(result).not.toBeNull();
			expect(result?.provider).toBe("CSV_MANUAL");
			expect(result?.status).toBe("CONNECTED");
		});

		it("returns null when no connection exists", async () => {
			const ctx = createTestContext();
			ctx.prisma.misConnection.findUnique.mockResolvedValue(null);
			const caller = testRouter.createCaller(ctx);

			const result = await caller.mis.getConnectionStatus({
				schoolId: "school-1",
			});

			expect(result).toBeNull();
		});
	});

	describe("disconnect", () => {
		it("sets connection status to DISCONNECTED", async () => {
			const ctx = createTestContext();
			ctx.prisma.misConnection.update.mockResolvedValue({
				id: "conn-1",
				status: "DISCONNECTED",
			});
			const caller = testRouter.createCaller(ctx);

			const result = await caller.mis.disconnect({
				schoolId: "school-1",
			});

			expect(result.status).toBe("DISCONNECTED");
			expect(ctx.prisma.misConnection.update).toHaveBeenCalled();
		});
	});
});
