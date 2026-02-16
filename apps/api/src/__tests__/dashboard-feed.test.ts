// Tests for dashboard feed and action items
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
			parentChild: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "parent-1",
					childId: "child-1",
					child: { yearGroup: "Year 2", className: "2B", schoolId: "school-1" },
				}),
				findMany: vi.fn().mockResolvedValue([]),
			},
			classPost: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			message: {
				findMany: vi.fn().mockResolvedValue([]),
				count: vi.fn().mockResolvedValue(0),
			},
			attendanceRecord: {
				findMany: vi.fn().mockResolvedValue([]),
				count: vi.fn().mockResolvedValue(0),
			},
			paymentItem: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			event: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			formTemplate: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			user: {
				findMany: vi.fn().mockResolvedValue([]),
			},
		},
		req: {},
		res: {},
		user: { id: "parent-1" },
		session: {},
		...overrides,
	};
}

describe("dashboard router", () => {
	describe("getFeed", () => {
		it("returns mixed card types (classPost, message, attendance)", async () => {
			const now = new Date();
			const oneHourAgo = new Date(now.getTime() - 3600000);
			const twoHoursAgo = new Date(now.getTime() - 7200000);

			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { yearGroup: "Year 2", className: "2B", schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					classPost: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "post-1",
								body: "Great day in class!",
								mediaUrls: ["https://example.com/photo.jpg"],
								authorId: "staff-1",
								createdAt: now,
								schoolId: "school-1",
								yearGroup: "Year 2",
								className: "2B",
								reactions: [
									{ emoji: "heart", userId: "parent-1" },
									{ emoji: "heart", userId: "parent-2" },
									{ emoji: "thumbsup", userId: "parent-3" },
								],
							},
						]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "msg-1",
								subject: "School Trip",
								body: "Details about the upcoming school trip",
								category: "STANDARD",
								authorId: "staff-1",
								createdAt: oneHourAgo,
								reads: [{ readAt: new Date() }],
							},
						]),
						count: vi.fn().mockResolvedValue(0),
					},
					attendanceRecord: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "att-1",
								childId: "child-1",
								date: twoHoursAgo,
								session: "AM",
								mark: "PRESENT",
								note: null,
								child: { firstName: "Alice", lastName: "Smith" },
							},
						]),
						count: vi.fn().mockResolvedValue(0),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					event: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.dashboard.getFeed({ childId: "child-1" });

			expect(result.items).toHaveLength(3);

			// Items should be sorted by timestamp descending
			const types = result.items.map((item: any) => item.type);
			expect(types).toContain("classPost");
			expect(types).toContain("message");
			expect(types).toContain("attendance");

			// Verify classPost card data
			const postCard = result.items.find((item: any) => item.type === "classPost") as any;
			expect(postCard.id).toBe("post-1");
			expect(postCard.data.body).toBe("Great day in class!");
			expect(postCard.data.mediaUrls).toEqual(["https://example.com/photo.jpg"]);
			expect(postCard.data.reactionCounts).toEqual({ heart: 2, thumbsup: 1 });
			expect(postCard.data.totalReactions).toBe(3);
			expect(postCard.data.myReaction).toBe("heart");

			// Verify message card data
			const msgCard = result.items.find((item: any) => item.type === "message") as any;
			expect(msgCard.id).toBe("msg-1");
			expect(msgCard.data.subject).toBe("School Trip");
			expect(msgCard.data.isRead).toBe(true);

			// Verify attendance card data
			const attCard = result.items.find((item: any) => item.type === "attendance") as any;
			expect(attCard.id).toBe("att-1");
			expect(attCard.data.childName).toBe("Alice Smith");
			expect(attCard.data.session).toBe("AM");
			expect(attCard.data.mark).toBe("PRESENT");

			// Sorted newest first
			expect(result.items[0]!.type).toBe("classPost");
			expect(result.items[1]!.type).toBe("message");
			expect(result.items[2]!.type).toBe("attendance");
		});

		it("pagination works with cursor", async () => {
			const now = new Date();
			// Generate enough items to exceed the limit
			const posts = Array.from({ length: 5 }, (_, i) => ({
				id: `post-${i}`,
				body: `Post ${i}`,
				mediaUrls: [],
				authorId: "staff-1",
				createdAt: new Date(now.getTime() - i * 60000),
				schoolId: "school-1",
				yearGroup: "Year 2",
				className: "2B",
				reactions: [],
			}));

			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { yearGroup: "Year 2", className: "2B", schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					classPost: {
						findMany: vi.fn().mockResolvedValue(posts),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					attendanceRecord: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					event: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);

			// Request with limit of 3 - should get 3 items and a nextCursor
			const result = await caller.dashboard.getFeed({ childId: "child-1", limit: 3 });

			expect(result.items).toHaveLength(3);
			expect(result.nextCursor).not.toBeNull();
			expect(result.nextCursor).toEqual({
				timestamp: expect.any(String),
				id: expect.any(String),
			});

			// Second page with cursor
			const cursorCtx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { yearGroup: "Year 2", className: "2B", schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					classPost: {
						findMany: vi.fn().mockResolvedValue([posts[3], posts[4]]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					attendanceRecord: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					event: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const cursorCaller = appRouter.createCaller(cursorCtx);
			const page2 = await cursorCaller.dashboard.getFeed({
				childId: "child-1",
				limit: 3,
				cursor: result.nextCursor,
			});

			expect(page2.items).toHaveLength(2);
			expect(page2.nextCursor).toBeNull();
		});

		it("is child-scoped (different children get different feeds)", async () => {
			const now = new Date();

			// Context for child-1
			const ctx1 = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { yearGroup: "Year 2", className: "2B", schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					classPost: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "post-child1",
								body: "Year 2 class post",
								mediaUrls: [],
								authorId: "staff-1",
								createdAt: now,
								reactions: [],
							},
						]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					attendanceRecord: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					event: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller1 = appRouter.createCaller(ctx1);
			const result1 = await caller1.dashboard.getFeed({ childId: "child-1" });

			// Context for child-2 with different class
			const ctx2 = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-2",
							child: { yearGroup: "Year 4", className: "4A", schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					classPost: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "post-child2",
								body: "Year 4 class post",
								mediaUrls: [],
								authorId: "staff-2",
								createdAt: now,
								reactions: [],
							},
						]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					attendanceRecord: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					event: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller2 = appRouter.createCaller(ctx2);
			const result2 = await caller2.dashboard.getFeed({ childId: "child-2" });

			// Both should have posts but with different IDs
			expect(result1.items).toHaveLength(1);
			expect(result2.items).toHaveLength(1);

			const post1 = result1.items[0] as any;
			const post2 = result2.items[0] as any;
			expect(post1.id).toBe("post-child1");
			expect(post2.id).toBe("post-child2");
			expect(post1.data.body).toBe("Year 2 class post");
			expect(post2.data.body).toBe("Year 4 class post");

			// Verify parentChild.findUnique was called with different childIds
			expect(ctx1.prisma.parentChild.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { userId_childId: { userId: "parent-1", childId: "child-1" } },
				}),
			);
			expect(ctx2.prisma.parentChild.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { userId_childId: { userId: "parent-1", childId: "child-2" } },
				}),
			);
		});

		it("unauthorized child rejected with FORBIDDEN", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);

			await expect(caller.dashboard.getFeed({ childId: "child-not-mine" })).rejects.toThrow(
				"Not authorized for this child",
			);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.dashboard.getFeed({ childId: "child-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});

	describe("getActionItems", () => {
		it("returns outstanding payments with remaining balance calculation", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "item-1",
								title: "School Trip",
								amount: 2000,
								dueDate: new Date("2026-03-01"),
								category: "TRIP",
								children: [{ childId: "child-1" }],
								payments: [{ amount: 500 }], // Partially paid
							},
							{
								id: "item-2",
								title: "Uniform",
								amount: 1500,
								dueDate: new Date("2026-04-01"),
								category: "OTHER",
								children: [{ childId: "child-1" }],
								payments: [], // Unpaid
							},
							{
								id: "item-3",
								title: "Lunch Money",
								amount: 1000,
								dueDate: new Date("2026-02-01"),
								category: "DINNER_MONEY",
								children: [{ childId: "child-1" }],
								payments: [{ amount: 1000 }], // Fully paid - should NOT appear
							},
						]),
					},
					formTemplate: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.dashboard.getActionItems({ childId: "child-1" });

			const payments = result.filter((item: any) => item.type === "payment");
			expect(payments).toHaveLength(2);

			const trip = payments.find((p: any) => p.title === "School Trip") as any;
			expect(trip).toBeDefined();
			expect(trip.amountDuePence).toBe(1500); // 2000 - 500

			const uniform = payments.find((p: any) => p.title === "Uniform") as any;
			expect(uniform).toBeDefined();
			expect(uniform.amountDuePence).toBe(1500); // 1500 - 0

			// Fully paid item should not appear
			const lunch = payments.find((p: any) => p.title === "Lunch Money");
			expect(lunch).toBeUndefined();
		});

		it("returns pending forms", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					formTemplate: {
						findMany: vi.fn().mockResolvedValue([
							{
								id: "form-1",
								title: "Photo Consent",
								isActive: true,
								schoolId: "school-1",
								responses: [], // No response for this child
							},
							{
								id: "form-2",
								title: "Medical Info",
								isActive: true,
								schoolId: "school-1",
								responses: [{ id: "resp-1" }], // Already responded - should NOT appear
							},
							{
								id: "form-3",
								title: "Trip Permission",
								isActive: true,
								schoolId: "school-1",
								responses: [], // No response
							},
						]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.dashboard.getActionItems({ childId: "child-1" });

			const forms = result.filter((item: any) => item.type === "form");
			expect(forms).toHaveLength(2);

			expect(forms[0]!.title).toBe("Photo Consent");
			expect(forms[0]!.templateId).toBe("form-1");
			expect(forms[1]!.title).toBe("Trip Permission");
			expect(forms[1]!.templateId).toBe("form-3");

			// Already responded form should not appear
			const medical = forms.find((f: any) => f.title === "Medical Info");
			expect(medical).toBeUndefined();
		});

		it("returns unread urgent messages", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					formTemplate: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([
							{ id: "urgent-1", subject: "Emergency Closure" },
							{ id: "urgent-2", subject: "Immediate Action Required" },
						]),
						count: vi.fn().mockResolvedValue(0),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.dashboard.getActionItems({ childId: "child-1" });

			const urgentMessages = result.filter((item: any) => item.type === "urgentMessage");
			expect(urgentMessages).toHaveLength(2);

			expect(urgentMessages[0]!.subject).toBe("Emergency Closure");
			expect(urgentMessages[0]!.messageId).toBe("urgent-1");
			expect(urgentMessages[1]!.subject).toBe("Immediate Action Required");
			expect(urgentMessages[1]!.messageId).toBe("urgent-2");
		});

		it("empty case returns []", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { schoolId: "school-1" },
						}),
						findMany: vi.fn().mockResolvedValue([]),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					formTemplate: {
						findMany: vi.fn().mockResolvedValue([]),
					},
					message: {
						findMany: vi.fn().mockResolvedValue([]),
						count: vi.fn().mockResolvedValue(0),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.dashboard.getActionItems({ childId: "child-1" });

			expect(result).toEqual([]);
		});

		it("unauthorized child rejected with FORBIDDEN", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
			});

			const caller = appRouter.createCaller(ctx);

			await expect(caller.dashboard.getActionItems({ childId: "child-not-mine" })).rejects.toThrow(
				"Not authorized for this child",
			);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.dashboard.getActionItems({ childId: "child-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});
});
