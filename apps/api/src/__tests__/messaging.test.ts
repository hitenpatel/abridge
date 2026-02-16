// Tests for messaging router
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

// Mock NotificationService
vi.mock("../services/notification", () => ({
	notificationService: {
		getInstance: vi.fn().mockReturnValue({
			sendPush: vi.fn().mockResolvedValue({ success: true, count: 1 }),
		}),
	},
}));

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
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
		});

		it("rejects when no recipients specified", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.messaging.send({
					schoolId: "school-1",
					subject: "Hello",
					body: "World",
					category: "STANDARD",
					allChildren: false,
					childIds: [],
				}),
			).rejects.toThrow("Must specify recipients");
		});

		it("rejects when no valid children found for school", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					child: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.messaging.send({
					schoolId: "school-1",
					subject: "Hello",
					body: "World",
					category: "STANDARD",
					allChildren: true,
				}),
			).rejects.toThrow("No valid recipients found");
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.messaging.send({
					schoolId: "school-1",
					subject: "Hello",
					body: "World",
					category: "STANDARD",
					allChildren: true,
				}),
			).rejects.toThrow("UNAUTHORIZED");
		});

		it("rejects non-staff user", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.messaging.send({
					schoolId: "school-1",
					subject: "Hello",
					body: "World",
					category: "STANDARD",
					allChildren: true,
				}),
			).rejects.toThrow();
		});
	});

	describe("listSent", () => {
		it("returns paginated sent messages for staff", async () => {
			const mockMessages = [
				{
					id: "msg-1",
					subject: "Update",
					body: "Content",
					category: "STANDARD",
					createdAt: new Date(),
					_count: { children: 10, reads: 5 },
				},
			];
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					message: {
						findMany: vi.fn().mockResolvedValue(mockMessages),
						count: vi.fn().mockResolvedValue(1),
					},
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.messaging.listSent({
				schoolId: "school-1",
				page: 1,
				limit: 20,
			});

			expect(result.data).toHaveLength(1);
			expect(result.data[0]!.recipientCount).toBe(10);
			expect(result.data[0]!.readCount).toBe(5);
			expect(result.total).toBe(1);
			expect(result.totalPages).toBe(1);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.messaging.listSent({ schoolId: "school-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});

		it("rejects non-staff user", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.messaging.listSent({ schoolId: "school-1" })).rejects.toThrow();
		});
	});

	describe("listReceived", () => {
		it("returns messages for parent with children", async () => {
			const mockMessages = [
				{
					id: "msg-1",
					subject: "School Trip",
					body: "Details here",
					category: "STANDARD",
					createdAt: new Date(),
					school: { name: "Oak Primary", logoUrl: null },
					reads: [{ readAt: new Date() }],
				},
			];
			const ctx = createTestContext({
				user: { id: "parent-1" },
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }, { childId: "child-2" }]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue(mockMessages),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.messaging.listReceived({ limit: 20 });

			expect(result.items).toHaveLength(1);
			expect(result.items[0]!.subject).toBe("School Trip");
			expect(result.items[0]!.schoolName).toBe("Oak Primary");
			expect(result.items[0]!.isRead).toBe(true);
		});

		it("returns empty list for parent with no children", async () => {
			const ctx = createTestContext({
				user: { id: "parent-no-kids" },
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.messaging.listReceived({ limit: 20 });

			expect(result.items).toEqual([]);
			expect(result.nextCursor).toBeUndefined();
		});

		it("marks unread messages correctly", async () => {
			const mockMessages = [
				{
					id: "msg-1",
					subject: "Unread Message",
					body: "Not read yet",
					category: "URGENT",
					createdAt: new Date(),
					school: { name: "School", logoUrl: null },
					reads: [], // No reads
				},
			];
			const ctx = createTestContext({
				user: { id: "parent-1" },
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue(mockMessages),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.messaging.listReceived({ limit: 20 });

			expect(result.items[0]!.isRead).toBe(false);
			expect(result.items[0]!.readAt).toBeUndefined();
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.messaging.listReceived({ limit: 20 })).rejects.toThrow("UNAUTHORIZED");
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

		it("throws NOT_FOUND if parent is not linked to message", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1" },
				prisma: {
					...createTestContext().prisma,
					messageChild: {
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.messaging.markRead({ messageId: "msg-other" })).rejects.toThrow(
				"Message not found or not accessible",
			);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.messaging.markRead({ messageId: "msg-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});
});
