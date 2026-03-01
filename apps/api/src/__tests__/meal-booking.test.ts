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
					mealBookingEnabled: true,
					clubBookingEnabled: false,
					reportCardsEnabled: false,
					communityHubEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
			mealMenu: {
				create: vi.fn().mockResolvedValue({
					id: "menu-1",
					weekStarting: new Date("2026-03-02"),
				}),
				findMany: vi.fn().mockResolvedValue([]),
				findUnique: vi.fn().mockResolvedValue({
					id: "menu-1",
					publishedAt: new Date(),
					options: [],
				}),
				update: vi.fn().mockResolvedValue({
					id: "menu-1",
					publishedAt: new Date(),
				}),
			},
			mealOption: {
				createMany: vi.fn().mockResolvedValue({ count: 3 }),
				update: vi.fn().mockResolvedValue({
					id: "option-1",
					available: false,
				}),
			},
			mealBooking: {
				upsert: vi.fn().mockResolvedValue({
					id: "booking-1",
					status: "BOOKED",
				}),
				findMany: vi.fn().mockResolvedValue([]),
				groupBy: vi.fn().mockResolvedValue([]),
			},
			dietaryProfile: {
				upsert: vi.fn().mockResolvedValue({
					id: "diet-1",
					allergies: ["Nuts"],
				}),
				findUnique: vi.fn().mockResolvedValue(null),
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
					role: "ADMIN",
				}),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("meal booking router", () => {
	describe("createMenu", () => {
		it("creates a weekly menu", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.mealBooking.createMenu({
				schoolId: "school-1",
				weekStarting: new Date("2026-03-02"),
				options: [
					{
						day: "MONDAY",
						name: "Chicken Pie",
						category: "HOT_MAIN",
						allergens: ["Cereals"],
						priceInPence: 250,
					},
					{
						day: "MONDAY",
						name: "Veggie Pasta",
						category: "VEGETARIAN",
						allergens: ["Cereals"],
						priceInPence: 250,
					},
				],
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.mealMenu.create).toHaveBeenCalled();
		});
	});

	describe("bookMeal", () => {
		it("books a meal for a child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.mealBooking.bookMeal({
				childId: "child-1",
				mealOptionId: "option-1",
				date: new Date("2026-03-02"),
			});

			expect(result).toHaveProperty("id");
			expect(result.status).toBe("BOOKED");
		});
	});

	describe("updateDietaryProfile", () => {
		it("creates or updates a dietary profile", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.mealBooking.updateDietaryProfile({
				childId: "child-1",
				allergies: ["Nuts", "Milk"],
				dietaryNeeds: ["VEGETARIAN"],
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.dietaryProfile.upsert).toHaveBeenCalled();
		});
	});

	describe("getKitchenSummary", () => {
		it("returns aggregated booking counts", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.mealBooking.getKitchenSummary({
				schoolId: "school-1",
				date: new Date("2026-03-02"),
			});

			expect(Array.isArray(result)).toBe(true);
		});
	});
});
