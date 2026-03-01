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
					communityHubEnabled: true,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
			communityPost: {
				create: vi.fn().mockResolvedValue({
					id: "post-1",
					type: "DISCUSSION",
					title: "Test Post",
					status: "ACTIVE",
				}),
				findMany: vi.fn().mockResolvedValue([]),
				update: vi.fn().mockResolvedValue({
					id: "post-1",
					status: "REMOVED",
				}),
				count: vi.fn().mockResolvedValue(0),
			},
			communityComment: {
				create: vi.fn().mockResolvedValue({
					id: "comment-1",
					body: "Great post!",
				}),
				findMany: vi.fn().mockResolvedValue([]),
			},
			volunteerSlot: {
				findUnique: vi.fn().mockResolvedValue({
					id: "slot-1",
					spotsTotal: 4,
					spotsTaken: 1,
				}),
				update: vi.fn().mockResolvedValue({
					id: "slot-1",
					spotsTaken: 2,
				}),
			},
			volunteerSignup: {
				create: vi.fn().mockResolvedValue({ id: "signup-1" }),
				findUnique: vi.fn().mockResolvedValue(null),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "TEACHER",
				}),
			},
			user: {
				findUnique: vi.fn().mockResolvedValue({
					id: "user-1",
					createdAt: new Date("2025-01-01"),
				}),
			},
		},
		user: {
			id: "user-1",
			name: "Test User",
			createdAt: new Date("2025-01-01"),
		},
		session: { id: "session-1" },
		...overrides,
	};
}

describe("community router", () => {
	describe("createPost", () => {
		it("creates a discussion post", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.community.createPost({
				schoolId: "school-1",
				type: "DISCUSSION",
				title: "Book Recommendation",
				body: "Can anyone recommend a good Year 3 maths workbook?",
				tags: ["Year 3", "Maths"],
			});

			expect(result).toHaveProperty("id");
			expect(result.type).toBe("DISCUSSION");
		});
	});

	describe("listPosts", () => {
		it("returns paginated posts", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.community.listPosts({
				schoolId: "school-1",
			});

			expect(result).toHaveProperty("items");
			expect(result).toHaveProperty("nextCursor");
		});
	});

	describe("addComment", () => {
		it("adds a comment to a post", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.community.addComment({
				postId: "post-1",
				body: "Great question! Try CGP books.",
			});

			expect(result).toHaveProperty("id");
		});
	});

	describe("signUpForSlot", () => {
		it("signs up for a volunteer slot", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.community.signUpForSlot({
				slotId: "slot-1",
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.volunteerSlot.update).toHaveBeenCalled();
		});
	});

	describe("removePost", () => {
		it("staff can remove a post with reason", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.community.removePost({
				schoolId: "school-1",
				postId: "post-1",
				reason: "Inappropriate content",
			});

			expect(result.status).toBe("REMOVED");
		});
	});
});
