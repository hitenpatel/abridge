import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

/* eslint-disable @typescript-eslint/no-explicit-any */
function createTestContext(overrides?: any): any {
	return {
		prisma: {
			parentChild: {
				findUnique: vi.fn(),
			},
			child: {
				findUnique: vi.fn(),
			},
			attendanceRecord: {
				findMany: vi.fn(),
				upsert: vi.fn(),
			},
			$transaction: vi.fn((promises) => Promise.all(promises)),
		},
		req: {},
		res: {},
		user: { id: "user-1" },
		session: {},
		...overrides,
	};
}

describe("attendance router", () => {
	describe("getAttendanceForChild", () => {
		it("returns attendance records if user is parent (verifying date boundaries)", async () => {
			const mockRecords = [
				{ id: "1", date: new Date("2023-10-01T00:00:00.000Z"), session: "AM", mark: "PRESENT" },
			];
			const ctx = createTestContext();
			ctx.prisma.parentChild.findUnique.mockResolvedValue({ userId: "user-1", childId: "child-1" });
			ctx.prisma.attendanceRecord.findMany.mockResolvedValue(mockRecords);

			const caller = appRouter.createCaller(ctx);

			// If startDate is midday, we still want it to include the record from the start of that day
			const result = await caller.attendance.getAttendanceForChild({
				childId: "child-1",
				startDate: new Date("2023-10-01T12:00:00.000Z"),
				endDate: new Date("2023-10-07T12:00:00.000Z"),
			});

			expect(result).toEqual(mockRecords);

			// Check what prisma was called with
			const call = ctx.prisma.attendanceRecord.findMany.mock.calls[0][0];
			expect(call.where.date.gte.toISOString()).toBe("2023-10-01T00:00:00.000Z");
			expect(call.where.date.lte.toISOString()).toBe("2023-10-07T23:59:59.999Z");
		});

		it("throws FORBIDDEN if user is not parent", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findUnique.mockResolvedValue(null);

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.attendance.getAttendanceForChild({
					childId: "child-1",
					startDate: new Date(),
					endDate: new Date(),
				}),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("reportAbsence", () => {
		it("creates attendance records for the date range", async () => {
			const ctx = createTestContext();
			ctx.prisma.child.findUnique.mockResolvedValue({
				id: "child-1",
				schoolId: "school-1",
				parentLinks: [{ userId: "user-1" }],
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.attendance.reportAbsence({
				childId: "child-1",
				startDate: new Date("2023-10-01"),
				endDate: new Date("2023-10-02"), // 2 days -> 4 records
				reason: "Sick",
			});

			expect(result.success).toBe(true);
			expect(result.recordCount).toBe(4);
			expect(ctx.prisma.attendanceRecord.upsert).toHaveBeenCalledTimes(4);
		});

		it("throws FORBIDDEN if user is not parent", async () => {
			const ctx = createTestContext();
			ctx.prisma.child.findUnique.mockResolvedValue({
				id: "child-1",
				schoolId: "school-1",
				parentLinks: [], // No parent link for this user
			});

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.attendance.reportAbsence({
					childId: "child-1",
					startDate: new Date(),
					endDate: new Date(),
					reason: "Sick",
				}),
			).rejects.toThrow(TRPCError);
		});
	});
});
