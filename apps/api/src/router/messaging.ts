import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { notificationService } from "../services/notification";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const messagingRouter = router({
	send: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				subject: z.string().min(1),
				body: z.string().min(1),
				category: z.enum(["STANDARD", "URGENT", "FYI"]),
				allChildren: z.boolean().default(false),
				childIds: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "messaging");

			if (!input.allChildren && (!input.childIds || input.childIds.length === 0)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Must specify recipients (allChildren=true or childIds list)",
				});
			}

			// 1. Resolve target children
			let targetChildIds: string[] = [];

			if (input.allChildren) {
				const children = await ctx.prisma.child.findMany({
					where: { schoolId: input.schoolId },
					select: { id: true },
				});
				targetChildIds = children.map((c: { id: string }) => c.id);
			} else if (input.childIds) {
				// Verify children belong to this school
				const validChildren = await ctx.prisma.child.findMany({
					where: {
						id: { in: input.childIds },
						schoolId: input.schoolId,
					},
					select: { id: true },
				});
				targetChildIds = validChildren.map((c: { id: string }) => c.id);
			}

			if (targetChildIds.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No valid recipients found",
				});
			}

			// 2. Create message + links
			const message = await ctx.prisma.message.create({
				data: {
					schoolId: input.schoolId,
					subject: input.subject,
					body: input.body,
					category: input.category,
					authorId: ctx.user.id,
					children: {
						createMany: {
							data: targetChildIds.map((cid) => ({ childId: cid })),
						},
					},
				},
			});

			// 3. Find parents to notify (async)
			// Don't await this if we want fast response, but for MVP safer to await
			// or fire-and-forget properly.
			(async () => {
				try {
					const parents = await ctx.prisma.parentChild.findMany({
						where: { childId: { in: targetChildIds } },
						select: { userId: true },
						distinct: ["userId"],
					});

					const userIds = parents.map((p: { userId: string }) => p.userId);
					if (userIds.length > 0) {
						const notificationSvc = notificationService.getInstance(ctx.prisma);
						await notificationSvc.sendPush(
							userIds,
							input.subject,
							input.body.length > 100 ? `${input.body.substring(0, 97)}...` : input.body,
							{ messageId: message.id },
						);
					}
				} catch (err) {
					console.error("Failed to send push notifications", err);
				}
			})();

			return { success: true, messageId: message.id, recipientCount: targetChildIds.length };
		}),

	listSent: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "messaging");
			const skip = (input.page - 1) * input.limit;

			const [messages, total] = await Promise.all([
				ctx.prisma.message.findMany({
					where: { schoolId: input.schoolId },
					orderBy: { createdAt: "desc" },
					take: input.limit,
					skip,
					include: {
						_count: {
							select: {
								children: true,
								reads: true,
							},
						},
					},
				}),
				ctx.prisma.message.count({ where: { schoolId: input.schoolId } }),
			]);

			return {
				data: messages.map(
					(m: {
						id: string;
						subject: string;
						body: string;
						category: string;
						createdAt: Date;
						_count: { children: number; reads: number };
					}) => ({
						...m,
						category: m.category as "STANDARD" | "URGENT" | "FYI",
						recipientCount: m._count.children,
						readCount: m._count.reads,
					}),
				),
				total,
				totalPages: Math.ceil(total / input.limit),
			};
		}),

	listReceived: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().nullish(), // message ID for pagination
			}),
		)
		.query(async ({ ctx, input }) => {
			// Find all children linked to this parent
			const parentLinks = await ctx.prisma.parentChild.findMany({
				where: { userId: ctx.user.id },
				select: { childId: true },
			});
			const childIds = parentLinks.map((p: { childId: string }) => p.childId);

			if (childIds.length === 0) {
				return { items: [], nextCursor: undefined };
			}

			// Find messages sent to these children
			const messages = await ctx.prisma.message.findMany({
				where: {
					children: {
						some: {
							childId: { in: childIds },
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: input.limit + 1, // Get one extra to check for next page
				cursor: input.cursor ? { id: input.cursor } : undefined,
				include: {
					school: { select: { name: true, logoUrl: true } },
					reads: {
						where: { userId: ctx.user.id },
						select: { readAt: true },
					},
				},
			});

			let nextCursor: typeof input.cursor | undefined = undefined;
			if (messages.length > input.limit) {
				const nextItem = messages.pop();
				nextCursor = nextItem?.id;
			}

			return {
				items: messages.map(
					(m: {
						id: string;
						subject: string;
						body: string;
						category: string;
						createdAt: Date;
						school: { name: string; logoUrl: string | null };
						reads: { readAt: Date }[];
					}) => ({
						id: m.id,
						subject: m.subject,
						body: m.body,
						category: m.category as "STANDARD" | "URGENT" | "FYI",
						createdAt: m.createdAt,
						schoolName: m.school.name,
						schoolLogo: m.school.logoUrl,
						isRead: m.reads.length > 0,
						readAt: m.reads[0]?.readAt,
					}),
				),
				nextCursor,
			};
		}),

	markRead: protectedProcedure
		.input(z.object({ messageId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Security check: Ensure user is linked to a child who received this message
			const messageChild = await ctx.prisma.messageChild.findFirst({
				where: {
					messageId: input.messageId,
					child: {
						parentLinks: {
							some: { userId: ctx.user.id },
						},
					},
				},
			});

			if (!messageChild) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Message not found or not accessible",
				});
			}

			// Upsert read record
			await ctx.prisma.messageRead.upsert({
				where: {
					messageId_userId: {
						messageId: input.messageId,
						userId: ctx.user.id,
					},
				},
				update: {}, // already read
				create: {
					messageId: input.messageId,
					userId: ctx.user.id,
				},
			});

			return { success: true };
		}),
});
