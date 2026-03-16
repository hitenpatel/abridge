import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { connectionManager } from "../lib/chat/connection-manager";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolAdminProcedure, schoolFeatureProcedure } from "../trpc";

export const chatRouter = router({
	startConversation: protectedProcedure
		.input(
			z.object({
				staffId: z.string().min(1),
				subject: z.string().max(200).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;

			// Verify parent has a child at the staff member's school
			const staffMember = await ctx.prisma.staffMember.findFirst({
				where: { userId: input.staffId },
				select: { schoolId: true },
			});

			if (!staffMember) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Staff member not found",
				});
			}

			// Check that the school has live chat enabled
			const school = await ctx.prisma.school.findUnique({
				where: { id: staffMember.schoolId },
				select: { liveChatEnabled: true },
			});

			if (!school?.liveChatEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Live Chat is disabled for this school",
				});
			}

			// Verify parent has a child at the staff's school
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: {
					userId,
					child: { schoolId: staffMember.schoolId },
				},
			});

			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have a child at this staff member's school",
				});
			}

			// Upsert conversation (reopen if closed)
			const conversation = await ctx.prisma.chatConversation.upsert({
				where: {
					schoolId_parentId_staffId: {
						schoolId: staffMember.schoolId,
						parentId: userId,
						staffId: input.staffId,
					},
				},
				create: {
					schoolId: staffMember.schoolId,
					parentId: userId,
					staffId: input.staffId,
					subject: input.subject,
				},
				update: {
					closedAt: null,
					...(input.subject ? { subject: input.subject } : {}),
				},
				include: {
					staff: { select: { id: true, name: true } },
					parent: { select: { id: true, name: true } },
				},
			});

			return conversation;
		}),

	sendMessage: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().min(1),
				body: z.string().min(1).max(2000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;

			// Verify participant
			const conversation = await ctx.prisma.chatConversation.findUnique({
				where: { id: input.conversationId },
			});

			if (!conversation) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
			}

			if (conversation.parentId !== userId && conversation.staffId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a participant of this conversation",
				});
			}

			// Create message
			const message = await ctx.prisma.chatMessage.create({
				data: {
					conversationId: input.conversationId,
					senderId: userId,
					body: input.body,
				},
			});

			// Update lastMessageAt and reopen if closed
			await ctx.prisma.chatConversation.update({
				where: { id: input.conversationId },
				data: {
					lastMessageAt: new Date(),
					closedAt: null,
				},
			});

			// Broadcast via WebSocket
			const recipientId =
				conversation.parentId === userId ? conversation.staffId : conversation.parentId;

			const outgoing = {
				type: "chat:message",
				conversationId: input.conversationId,
				message: {
					id: message.id,
					senderId: userId,
					body: message.body,
					createdAt: message.createdAt,
					readAt: null,
				},
			};

			connectionManager.broadcast(recipientId, outgoing);

			return message;
		}),

	getMessages: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().min(1),
				limit: z.number().min(1).max(100).default(50),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.user.id;

			// Verify participant
			const conversation = await ctx.prisma.chatConversation.findUnique({
				where: { id: input.conversationId },
			});

			if (!conversation) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
			}

			if (conversation.parentId !== userId && conversation.staffId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a participant of this conversation",
				});
			}

			const items = await ctx.prisma.chatMessage.findMany({
				where: { conversationId: input.conversationId },
				orderBy: { createdAt: "asc" },
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
				include: {
					sender: { select: { id: true, name: true } },
				},
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const next = items.pop();
				nextCursor = next?.id;
			}

			return { items, nextCursor };
		}),

	markRead: protectedProcedure
		.input(z.object({ conversationId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;

			// Verify participant
			const conversation = await ctx.prisma.chatConversation.findUnique({
				where: { id: input.conversationId },
			});

			if (!conversation) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
			}

			if (conversation.parentId !== userId && conversation.staffId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a participant of this conversation",
				});
			}

			// Update all unread messages sent by the other participant
			const result = await ctx.prisma.chatMessage.updateMany({
				where: {
					conversationId: input.conversationId,
					senderId: { not: userId },
					readAt: null,
				},
				data: { readAt: new Date() },
			});

			return { markedCount: result.count };
		}),

	getConversations: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.user.id;

		const conversations = await ctx.prisma.chatConversation.findMany({
			where: {
				OR: [{ parentId: userId }, { staffId: userId }],
			},
			orderBy: { lastMessageAt: "desc" },
			include: {
				staff: { select: { id: true, name: true } },
				parent: { select: { id: true, name: true } },
				school: { select: { id: true, name: true } },
				_count: {
					select: {
						messages: {
							where: {
								senderId: { not: userId },
								readAt: null,
							},
						},
					},
				},
			},
		});

		return conversations.map((c) => ({
			...c,
			unreadCount: c._count.messages,
			_count: undefined,
		}));
	}),

	closeConversation: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				conversationId: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "liveChat");

			const conversation = await ctx.prisma.chatConversation.findUnique({
				where: { id: input.conversationId },
			});

			if (!conversation) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
			}

			if (conversation.schoolId !== ctx.schoolId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Conversation not in your school" });
			}

			// Only staff can close conversations
			if (conversation.staffId !== ctx.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the assigned staff member can close this conversation",
				});
			}

			const updated = await ctx.prisma.chatConversation.update({
				where: { id: input.conversationId },
				data: { closedAt: new Date() },
			});

			return updated;
		}),

	adminGetConversation: schoolAdminProcedure
		.input(
			z.object({
				schoolId: z.string(),
				conversationId: z.string().min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Manually load features since schoolAdminProcedure doesn't
			const school = await ctx.prisma.school.findUnique({
				where: { id: ctx.schoolId },
				select: { liveChatEnabled: true },
			});

			if (!school?.liveChatEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Live Chat is disabled for this school",
				});
			}

			const conversation = await ctx.prisma.chatConversation.findUnique({
				where: { id: input.conversationId },
				include: {
					staff: { select: { id: true, name: true } },
					parent: { select: { id: true, name: true } },
					messages: {
						orderBy: { createdAt: "asc" },
						include: {
							sender: { select: { id: true, name: true } },
						},
					},
				},
			});

			if (!conversation) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
			}

			if (conversation.schoolId !== ctx.schoolId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Conversation does not belong to your school",
				});
			}

			return conversation;
		}),
});
