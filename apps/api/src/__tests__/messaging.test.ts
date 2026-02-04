// Tests for messaging router
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { indexMessage } from "../lib/search-indexer";
import { appRouter } from "../router";

// Mock Search Indexer
vi.mock("../lib/search-indexer", () => ({
	indexMessage: vi.fn().mockResolvedValue(undefined),
}));

// Mock NotificationService
vi.mock("../services/notification", () => ({
	notificationService: {
		getInstance: vi.fn().mockReturnValue({
			sendPush: vi.fn().mockResolvedValue({ success: true, count: 1 }),
		}),
	},
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			child: {
				findMany: vi.fn().mockResolvedValue([{ id: "child-1" }, { id: "child-2" }]),
			},
			message: {
				create: vi.fn().mockResolvedValue({ id: "msg-1" }),
				findMany: vi.fn().mockResolvedValue([]),
				count: vi.fn().mockResolvedValue(0),
			},
			parentChild: {
				findMany: vi.fn().mockResolvedValue([{ userId: "parent-1" }]),
			},
			messageChild: {
				findFirst: vi.fn().mockResolvedValue({ messageId: "msg-1" }),
			},
			messageRead: {
				upsert: vi.fn().mockResolvedValue({}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
			},
		},
		req: {},
		res: {},
		user: { id: "staff-1", name: "Staff" },
		session: {},
		...overrides,
	};
}

describe("messaging router", () => {
	describe("send", () => {
		it("creates message and notifies parents", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.messaging.send({
				schoolId: "school-1",
				subject: "Hello",
				body: "World",
				category: "STANDARD",
				allChildren: true,
			});

			expect(result.success).toBe(true);
			expect(ctx.prisma.message.create).toHaveBeenCalled();
			expect(indexMessage).toHaveBeenCalled();
		});
	});

	describe("markRead", () => {
		it("marks message as read for parent", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1" },
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.messaging.markRead({ messageId: "msg-1" });

			expect(result.success).toBe(true);
			expect(ctx.prisma.messageRead.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						messageId_userId: {
							messageId: "msg-1",
							userId: "parent-1",
						},
					},
				}),
			);
		});
	});
});
