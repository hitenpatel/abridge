import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/chat/connection-manager", () => ({
	connectionManager: {
		broadcast: vi.fn(),
		isOnline: vi.fn().mockReturnValue(false),
	},
}));

const allFeatureToggles = {
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
	galleryEnabled: false,
	progressSummariesEnabled: false,
	liveChatEnabled: true,
};

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
					...allFeatureToggles,
				}),
			},
			staffMember: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "staff-1",
					schoolId: "school-1",
					role: "TEACHER",
				}),
				findUnique: vi.fn().mockResolvedValue({
					userId: "staff-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					parentId: "parent-1",
					childId: "child-1",
				}),
			},
			chatConversation: {
				upsert: vi.fn().mockResolvedValue({
					id: "conv-1",
					schoolId: "school-1",
					parentId: "parent-1",
					staffId: "staff-1",
					subject: "Homework question",
					lastMessageAt: new Date(),
					closedAt: null,
					createdAt: new Date(),
					staff: { id: "staff-1", name: "Mrs Teacher" },
					parent: { id: "parent-1", name: "Parent User" },
				}),
				findUnique: vi.fn().mockResolvedValue({
					id: "conv-1",
					schoolId: "school-1",
					parentId: "parent-1",
					staffId: "staff-1",
					lastMessageAt: new Date(),
					closedAt: null,
				}),
				findMany: vi.fn().mockResolvedValue([]),
				update: vi.fn().mockResolvedValue({
					id: "conv-1",
					lastMessageAt: new Date(),
					closedAt: null,
				}),
			},
			chatMessage: {
				create: vi.fn().mockResolvedValue({
					id: "msg-1",
					conversationId: "conv-1",
					senderId: "parent-1",
					body: "Hello teacher",
					readAt: null,
					createdAt: new Date(),
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "msg-1",
						conversationId: "conv-1",
						senderId: "parent-1",
						body: "Hello teacher",
						readAt: null,
						createdAt: new Date(),
						sender: { id: "parent-1", name: "Parent User" },
					},
				]),
				updateMany: vi.fn().mockResolvedValue({ count: 2 }),
			},
		},
		user: { id: "parent-1", name: "Parent User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("chat router", () => {
	describe("startConversation", () => {
		it("creates a new conversation between parent and staff", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.chat.startConversation({
				staffId: "staff-1",
				subject: "Homework question",
			});

			expect(result).toHaveProperty("id", "conv-1");
			expect(result.staff.name).toBe("Mrs Teacher");
			expect(ctx.prisma.chatConversation.upsert).toHaveBeenCalled();
		});

		it("reopens closed conversation for same parent+staff", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			// The upsert mock will return the same conversation
			const result = await caller.chat.startConversation({
				staffId: "staff-1",
				subject: "Follow-up question",
			});

			expect(result).toHaveProperty("id", "conv-1");
			// Verify upsert was called (which handles both create and reopen)
			const upsertCall = ctx.prisma.chatConversation.upsert.mock.calls[0][0];
			expect(upsertCall.update).toHaveProperty("closedAt", null);
		});
	});

	describe("sendMessage", () => {
		it("creates message and updates lastMessageAt", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.chat.sendMessage({
				conversationId: "conv-1",
				body: "Hello teacher",
			});

			expect(result).toHaveProperty("id", "msg-1");
			expect(result.body).toBe("Hello teacher");
			expect(ctx.prisma.chatMessage.create).toHaveBeenCalled();
			expect(ctx.prisma.chatConversation.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "conv-1" },
					data: expect.objectContaining({ closedAt: null }),
				}),
			);
		});

		it("rejects non-participant", async () => {
			const ctx = createTestContext({
				user: { id: "outsider-user", name: "Outsider" },
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.chat.sendMessage({
					conversationId: "conv-1",
					body: "I shouldn't be here",
				}),
			).rejects.toThrow("Not a participant of this conversation");
		});
	});

	describe("getMessages", () => {
		it("returns paginated messages for participant", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.chat.getMessages({
				conversationId: "conv-1",
			});

			expect(result.items).toHaveLength(1);
			expect(result.items[0]?.body).toBe("Hello teacher");
			expect(result.nextCursor).toBeUndefined();
		});
	});

	describe("adminGetConversation", () => {
		it("allows admin to view any school conversation", async () => {
			const ctx = createTestContext({
				user: { id: "admin-1", name: "Admin User" },
			});

			// Mock admin's staff membership
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "admin-1",
				schoolId: "school-1",
				role: "ADMIN",
			});

			// Mock the conversation with messages
			ctx.prisma.chatConversation.findUnique.mockResolvedValue({
				id: "conv-1",
				schoolId: "school-1",
				parentId: "parent-1",
				staffId: "staff-1",
				lastMessageAt: new Date(),
				closedAt: null,
				staff: { id: "staff-1", name: "Mrs Teacher" },
				parent: { id: "parent-1", name: "Parent User" },
				messages: [
					{
						id: "msg-1",
						senderId: "parent-1",
						body: "Hello",
						createdAt: new Date(),
						sender: { id: "parent-1", name: "Parent User" },
					},
				],
			});

			const caller = appRouter.createCaller(ctx);

			const result = await caller.chat.adminGetConversation({
				schoolId: "school-1",
				conversationId: "conv-1",
			});

			expect(result).toHaveProperty("id", "conv-1");
			expect(result.messages).toHaveLength(1);
		});
	});
});
