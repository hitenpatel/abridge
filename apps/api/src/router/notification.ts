import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const notificationRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(50),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const items = await ctx.prisma.notificationDelivery.findMany({
				where: {
					userId: ctx.user.id,
					createdAt: { gte: thirtyDaysAgo },
				},
				include: {
					message: {
						select: {
							id: true,
							subject: true,
							body: true,
							category: true,
							type: true,
							createdAt: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const next = items.pop();
				nextCursor = next?.id;
			}

			return { items, nextCursor };
		}),

	unreadCount: protectedProcedure.query(async ({ ctx }) => {
		const count = await ctx.prisma.notificationDelivery.count({
			where: {
				userId: ctx.user.id,
				openedAt: null,
				status: { in: ["SENT", "DELIVERED"] },
			},
		});
		return { count };
	}),

	markAsRead: protectedProcedure
		.input(z.object({ notificationId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.notificationDelivery.updateMany({
				where: {
					id: input.notificationId,
					userId: ctx.user.id,
				},
				data: { openedAt: new Date() },
			});
			return { success: true };
		}),

	markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.prisma.notificationDelivery.updateMany({
			where: {
				userId: ctx.user.id,
				openedAt: null,
			},
			data: { openedAt: new Date() },
		});
		return { success: true };
	}),
});
