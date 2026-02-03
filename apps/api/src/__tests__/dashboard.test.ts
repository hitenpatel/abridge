// Tests for dashboard router
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

// biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible typing
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
	});
});
