import { describe, expect, it, vi } from "vitest";
import { detectPatterns } from "../lib/attendance-alerts";

function createDate(daysAgo: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

function makeRecord(daysAgo: number, mark: string) {
	return { date: createDate(daysAgo), mark, session: "AM", childId: "child-1", schoolId: "school-1" };
}

function createMockPrisma(children: any[], records: any[], existingAlerts: any[] = []) {
	return {
		child: {
			findMany: vi.fn().mockResolvedValue(children),
		},
		attendanceRecord: {
			findMany: vi.fn().mockResolvedValue(records),
		},
		attendanceAlert: {
			findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
				return existingAlerts.find(
					(a) => a.childId === where.childId && a.type === where.type,
				) ?? null;
			}),
			create: vi.fn().mockImplementation(async ({ data }: any) => ({
				id: `alert-${Date.now()}`,
				...data,
				status: "OPEN",
				createdAt: new Date(),
			})),
		},
	} as any;
}

describe("attendance-alerts", () => {
	it("detects 3+ consecutive absences", async () => {
		const children = [{ id: "child-1", firstName: "Amir", lastName: "Khan" }];
		// 5 consecutive absent days (most recent)
		const records = [
			makeRecord(1, "ABSENT_UNAUTHORISED"),
			makeRecord(2, "ABSENT_UNAUTHORISED"),
			makeRecord(3, "ABSENT_UNAUTHORISED"),
			makeRecord(4, "ABSENT_UNAUTHORISED"),
			makeRecord(5, "ABSENT_UNAUTHORISED"),
			makeRecord(10, "PRESENT"),
			makeRecord(11, "PRESENT"),
		];
		const prisma = createMockPrisma(children, records);

		const result = await detectPatterns(prisma, "school-1");

		expect(result.alertsCreated).toBeGreaterThanOrEqual(1);
		const createCalls = prisma.attendanceAlert.create.mock.calls;
		const consecutiveAlert = createCalls.find(
			(c: any) => c[0].data.type === "CONSECUTIVE_ABSENCE",
		);
		expect(consecutiveAlert).toBeDefined();
		expect(consecutiveAlert[0].data.description).toContain("5 consecutive days");
	});

	it("detects day pattern (3+ same-day absences in 6 weeks)", async () => {
		const children = [{ id: "child-1", firstName: "Sophie", lastName: "Brown" }];

		// Create 3 Monday absences spread across 6 weeks
		// Find the most recent Monday offsets
		const now = new Date();
		const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
		const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		const records = [
			{ date: createDate(daysToLastMonday), mark: "ABSENT_UNAUTHORISED", session: "AM", childId: "child-1", schoolId: "school-1" },
			{ date: createDate(daysToLastMonday + 7), mark: "ABSENT_UNAUTHORISED", session: "AM", childId: "child-1", schoolId: "school-1" },
			{ date: createDate(daysToLastMonday + 14), mark: "ABSENT_UNAUTHORISED", session: "AM", childId: "child-1", schoolId: "school-1" },
			// Some present days
			{ date: createDate(daysToLastMonday + 1), mark: "PRESENT", session: "AM", childId: "child-1", schoolId: "school-1" },
			{ date: createDate(daysToLastMonday + 2), mark: "PRESENT", session: "AM", childId: "child-1", schoolId: "school-1" },
			{ date: createDate(daysToLastMonday + 8), mark: "PRESENT", session: "AM", childId: "child-1", schoolId: "school-1" },
			{ date: createDate(daysToLastMonday + 9), mark: "PRESENT", session: "AM", childId: "child-1", schoolId: "school-1" },
		];
		const prisma = createMockPrisma(children, records);

		await detectPatterns(prisma, "school-1");

		const createCalls = prisma.attendanceAlert.create.mock.calls;
		const dayAlert = createCalls.find(
			(c: any) => c[0].data.type === "DAY_PATTERN",
		);
		expect(dayAlert).toBeDefined();
		expect(dayAlert[0].data.description).toContain("Monday");
	});

	it("detects below 90% threshold", async () => {
		const children = [{ id: "child-1", firstName: "Liam", lastName: "Davis" }];
		// 10 records total, 2 absent = 80%
		const records = [
			makeRecord(1, "ABSENT_UNAUTHORISED"),
			makeRecord(2, "ABSENT_UNAUTHORISED"),
			makeRecord(3, "PRESENT"),
			makeRecord(4, "PRESENT"),
			makeRecord(5, "PRESENT"),
			makeRecord(6, "PRESENT"),
			makeRecord(7, "PRESENT"),
			makeRecord(8, "PRESENT"),
			makeRecord(9, "PRESENT"),
			makeRecord(10, "PRESENT"),
		];
		const prisma = createMockPrisma(children, records);

		await detectPatterns(prisma, "school-1");

		const createCalls = prisma.attendanceAlert.create.mock.calls;
		const thresholdAlert = createCalls.find(
			(c: any) => c[0].data.type === "BELOW_THRESHOLD",
		);
		expect(thresholdAlert).toBeDefined();
		expect(thresholdAlert[0].data.description).toContain("80%");
	});

	it("does not flag authorised absences as consecutive for false positives", async () => {
		const children = [{ id: "child-1", firstName: "Emma", lastName: "Wilson" }];
		// All present except 2 authorised absences (not consecutive enough to trigger)
		const records = [
			makeRecord(1, "PRESENT"),
			makeRecord(2, "ABSENT_AUTHORISED"),
			makeRecord(3, "PRESENT"),
			makeRecord(4, "ABSENT_AUTHORISED"),
			makeRecord(5, "PRESENT"),
			makeRecord(6, "PRESENT"),
			makeRecord(7, "PRESENT"),
			makeRecord(8, "PRESENT"),
			makeRecord(9, "PRESENT"),
			makeRecord(10, "PRESENT"),
			makeRecord(11, "PRESENT"),
			makeRecord(12, "PRESENT"),
		];
		const prisma = createMockPrisma(children, records);

		const result = await detectPatterns(prisma, "school-1");

		const createCalls = prisma.attendanceAlert.create.mock.calls;
		// Should NOT have consecutive absence alert (only 1 at a time, not 3+)
		const consecutiveAlert = createCalls.find(
			(c: any) => c[0].data.type === "CONSECUTIVE_ABSENCE",
		);
		expect(consecutiveAlert).toBeUndefined();

		// Should NOT have below threshold (10/12 = 83% would trigger, but let's check)
		// Actually 10/12 = 83.3% which IS below 90%, so that would trigger.
		// This test is about no FALSE POSITIVE for consecutive — the threshold alert is correct.
		// The key assertion: no consecutive alert for non-consecutive absences.
	});
});
