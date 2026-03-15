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
					clubBookingEnabled: false,
					reportCardsEnabled: false,
					communityHubEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
					homeworkEnabled: false,
					readingDiaryEnabled: false,
					visitorManagementEnabled: false,
					misIntegrationEnabled: false,
					achievementsEnabled: false,
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					parentId: "user-1",
					childId: "child-1",
				}),
				findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
			},
			event: {
				findUnique: vi.fn().mockResolvedValue({
					id: "event-1",
					schoolId: "school-1",
					rsvpRequired: true,
					maxCapacity: 30,
				}),
			},
			eventRsvp: {
				upsert: vi.fn().mockResolvedValue({
					id: "rsvp-1",
					eventId: "event-1",
					childId: "child-1",
					userId: "user-1",
					response: "YES",
					note: null,
				}),
				count: vi.fn().mockResolvedValue(5),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "rsvp-1",
						eventId: "event-1",
						childId: "child-1",
						userId: "user-1",
						response: "YES",
						note: null,
						child: { firstName: "Emily", lastName: "Johnson" },
					},
				]),
				groupBy: vi.fn().mockResolvedValue([
					{ response: "YES", _count: { id: 20 } },
					{ response: "NO", _count: { id: 5 } },
					{ response: "MAYBE", _count: { id: 3 } },
				]),
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

describe("event RSVP", () => {
	describe("rsvpToEvent", () => {
		it("creates/updates RSVP for a child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.calendar.rsvpToEvent({
				eventId: "event-1",
				childId: "child-1",
				response: "YES",
			});

			expect(result).toHaveProperty("id");
			expect(result.response).toBe("YES");
			expect(ctx.prisma.eventRsvp.upsert).toHaveBeenCalled();
		});

		it("rejects when at capacity", async () => {
			const ctx = createTestContext();
			// Set count to match maxCapacity
			ctx.prisma.eventRsvp.count.mockResolvedValue(30);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.calendar.rsvpToEvent({
					eventId: "event-1",
					childId: "child-1",
					response: "YES",
				}),
			).rejects.toThrow(/capacity/i);
		});
	});

	describe("getRsvps", () => {
		it("returns RSVPs for parent's children", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.calendar.getRsvps({
				eventId: "event-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(ctx.prisma.eventRsvp.findMany).toHaveBeenCalled();
		});
	});

	describe("getRsvpSummary", () => {
		it("returns headcount by response", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.calendar.getRsvpSummary({
				schoolId: "school-1",
				eventId: "event-1",
			});

			expect(result).toHaveProperty("counts");
			expect(result).toHaveProperty("maxCapacity");
			expect(result.counts).toEqual(
				expect.arrayContaining([expect.objectContaining({ response: "YES" })]),
			);
		});
	});
});
