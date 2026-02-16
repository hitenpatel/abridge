import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			parentChild: {
				findMany: vi
					.fn()
					.mockResolvedValue([{ childId: "child-1", child: { schoolId: "school-1" } }]),
			},
			event: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "evt-1",
						schoolId: "school-1",
						title: "Sports Day",
						body: "Annual sports day",
						startDate: new Date("2026-06-15T09:00:00Z"),
						endDate: new Date("2026-06-15T15:00:00Z"),
						allDay: true,
						category: "EVENT",
						createdAt: new Date(),
					},
				]),
				create: vi.fn().mockResolvedValue({ id: "evt-new", title: "New Event" }),
				findUnique: vi.fn().mockResolvedValue({ id: "evt-1", schoolId: "school-1" }),
				delete: vi.fn().mockResolvedValue({ id: "evt-1" }),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
			},
			school: {
				findUnique: vi.fn().mockResolvedValue({
					messagingEnabled: true,
					paymentsEnabled: true,
					attendanceEnabled: true,
					calendarEnabled: true,
					formsEnabled: true,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
		},
		req: {},
		res: {},
		user: { id: "parent-1" },
		session: {},
		...overrides,
	};
}

// Mock the indexer
vi.mock("../lib/search-indexer", () => ({
	indexEvent: vi.fn().mockResolvedValue(undefined),
}));

describe("calendar router", () => {
	describe("listEvents", () => {
		it("returns events for parent's children's schools", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.calendar.listEvents({
				startDate: new Date("2026-06-01"),
				endDate: new Date("2026-06-30"),
			});

			expect(result.length).toBe(1);
			expect(result[0]?.title).toBe("Sports Day");
			expect(ctx.prisma.parentChild.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { userId: "parent-1" },
				}),
			);
		});
	});

	describe("createEvent", () => {
		it("creates event for school", async () => {
			const ctx = createTestContext({
				user: { id: "staff-1" },
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.calendar.createEvent({
				schoolId: "school-1",
				title: "New Event",
				body: "Details",
				startDate: new Date("2026-07-01T09:00:00Z"),
				allDay: true,
				category: "EVENT",
			});

			expect(result.success).toBe(true);
			expect(ctx.prisma.event.create).toHaveBeenCalled();
		});
	});

	describe("deleteEvent", () => {
		it("deletes event belonging to school", async () => {
			const ctx = createTestContext({
				user: { id: "staff-1" },
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.calendar.deleteEvent({
				schoolId: "school-1",
				eventId: "evt-1",
			});

			expect(result.success).toBe(true);
		});
	});
});
