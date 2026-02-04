// Tests for dashboard router
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			parentChild: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			message: {
				count: vi.fn().mockResolvedValue(0),
			},
			paymentItem: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			attendanceRecord: {
				count: vi.fn().mockResolvedValue(0),
				findMany: vi.fn().mockResolvedValue([]),
			},
			event: {
				findMany: vi.fn().mockResolvedValue([]),
			},
		},
		req: {},
		res: {},
		user: { id: "user-1", name: "User" },
		session: {},
		...overrides,
	};
}

describe("dashboard router", () => {
	describe("getSummary", () => {
		it("returns empty metrics if no children", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.dashboard.getSummary();

			expect(result).toEqual({
				children: [],
				metrics: {
					unreadMessages: 0,
					paymentsCount: 0,
					paymentsTotal: 0,
					attendanceAlerts: 0,
				},
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
			});
		});

		it("calculates metrics correctly for children", async () => {
			const mockChildren = [
				{ id: "child-1", firstName: "Alice" },
				{ id: "child-2", firstName: "Bob" },
			];

			const ctx = createTestContext({
				prisma: {
					parentChild: {
						findMany: vi.fn().mockResolvedValue([
							{ childId: "child-1", child: mockChildren[0] },
							{ childId: "child-2", child: mockChildren[1] },
						]),
					},
					message: {
						count: vi.fn().mockResolvedValue(5),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "item-1",
								amount: 1000,
								children: [{ childId: "child-1" }],
								payments: [], // No payments made
							},
							{
								id: "item-2",
								amount: 2000,
								children: [{ childId: "child-2" }],
								payments: [{ childId: "child-2", amount: 2000 }], // Fully paid
							},
							{
								id: "item-3",
								amount: 1500,
								children: [{ childId: "child-1" }],
								payments: [{ childId: "child-1", amount: 500 }], // Partially paid
							},
						]),
					},
					attendanceRecord: {
						count: vi.fn().mockResolvedValue(2),
						findMany: vi.fn().mockResolvedValue([]),
					},
					event: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);

			const result = await caller.dashboard.getSummary();

			expect(result.children).toEqual(mockChildren);
			expect(result.metrics.unreadMessages).toBe(5);

			// Payment calc:
			// Item 1: 1000 outstanding (0 paid)
			// Item 2: 0 outstanding (2000 paid)
			// Item 3: 1000 outstanding (500 paid of 1500)
			// Total count: 2 (Item 1 and Item 3)
			// Total amount: 2000
			expect(result.metrics.paymentsCount).toBe(2);
			expect(result.metrics.paymentsTotal).toBe(2000);

			expect(result.metrics.attendanceAlerts).toBe(2);
		});

		it("returns extended summary data", async () => {
			const mockChildren = [{ id: "child-1", firstName: "Alice" }];

			const today = new Date();
			const mockAttendance = [
				{
					childId: "child-1",
					session: "AM",
					mark: "PRESENT",
					date: today,
				},
			];

			const mockEvents = [
				{
					id: "event-1",
					title: "Sports Day",
					start: new Date(today.getTime() + 86400000), // Tomorrow
				},
			];

			// Mock historical attendance for percentage calculation (last 30 days)
			// 1 Present, 1 Late, 1 Absent = 2/3 = 66.6% => roughly 67%
			// Actually let's do 1 Present, 1 Late = 100% attendance (since Late is present)
			// Wait, the instruction says: Calculate percentage (Present + Late / Total)
			// So if I have Present, Late, Absent_Unauthorised.
			// Present + Late = 2. Total = 3. 2/3 = 66.66%

			const ctx = createTestContext({
				prisma: {
					parentChild: {
						findMany: vi.fn().mockResolvedValue([{ childId: "child-1", child: mockChildren[0] }]),
					},
					message: { count: vi.fn().mockResolvedValue(0) },
					paymentItem: { findMany: vi.fn().mockResolvedValue([]) },
					attendanceRecord: {
						count: vi.fn().mockResolvedValue(0),
						findMany: vi.fn().mockImplementation((args: any) => {
							// If checking for today's attendance
							if (args.where.date?.gte && args.where.date?.lte) {
								return Promise.resolve(mockAttendance);
							}
							// If checking for historical attendance (percentage)
							return Promise.resolve([
								{ childId: "child-1", mark: "PRESENT" },
								{ childId: "child-1", mark: "LATE" },
								{ childId: "child-1", mark: "ABSENT_UNAUTHORISED" },
							]);
						}),
					},
					event: {
						findMany: vi.fn().mockResolvedValue(mockEvents),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result: any = await caller.dashboard.getSummary();

			expect(result.todayAttendance).toHaveLength(1);
			expect(result.todayAttendance[0]).toEqual(
				expect.objectContaining({
					childId: "child-1",
					session: "AM",
					mark: "PRESENT",
				}),
			);

			expect(result.upcomingEvents).toHaveLength(1);
			expect(result.upcomingEvents[0].title).toBe("Sports Day");

			expect(result.attendancePercentage).toHaveLength(1);
			expect(result.attendancePercentage[0]).toEqual({
				childId: "child-1",
				percentage: 67, // Math.round(2/3 * 100)
			});
		});
	});
});
