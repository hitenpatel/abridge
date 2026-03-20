import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const searchRouter = router({
	query: protectedProcedure
		.input(
			z.object({
				query: z.string().min(3).max(100),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Derive schoolId from parent-child link or staff membership
			let schoolId: string | null = ctx.session
				? ((
						await ctx.prisma.staffMember.findFirst({
							where: { userId: ctx.user.id },
							select: { schoolId: true },
						})
					)?.schoolId ?? null)
				: null;

			if (!schoolId) {
				const parentChild = await ctx.prisma.parentChild.findFirst({
					where: { userId: ctx.user.id },
					select: { child: { select: { schoolId: true } } },
				});
				schoolId = parentChild?.child.schoolId ?? null;
			}

			if (!schoolId) {
				return [];
			}

			const searchTerm = input.query;

			const [messages, events, paymentItems] = await Promise.all([
				ctx.prisma.message.findMany({
					where: {
						schoolId,
						OR: [
							{ subject: { contains: searchTerm, mode: "insensitive" } },
							{ body: { contains: searchTerm, mode: "insensitive" } },
						],
					},
					select: {
						id: true,
						subject: true,
						body: true,
						category: true,
						createdAt: true,
					},
					take: 10,
					orderBy: { createdAt: "desc" },
				}),
				ctx.prisma.event.findMany({
					where: {
						schoolId,
						OR: [
							{ title: { contains: searchTerm, mode: "insensitive" } },
							{ body: { contains: searchTerm, mode: "insensitive" } },
						],
					},
					select: {
						id: true,
						title: true,
						body: true,
						startDate: true,
						category: true,
					},
					take: 10,
					orderBy: { startDate: "desc" },
				}),
				ctx.prisma.paymentItem.findMany({
					where: {
						schoolId,
						OR: [
							{ title: { contains: searchTerm, mode: "insensitive" } },
							{ description: { contains: searchTerm, mode: "insensitive" } },
						],
					},
					select: {
						id: true,
						title: true,
						description: true,
						amount: true,
						dueDate: true,
					},
					take: 10,
					orderBy: { createdAt: "desc" },
				}),
			]);

			const results: Array<{ id: string; index: string; source: Record<string, unknown> }> = [];

			for (const msg of messages) {
				results.push({ id: msg.id, index: "messages", source: msg });
			}
			for (const evt of events) {
				results.push({ id: evt.id, index: "events", source: evt });
			}
			for (const item of paymentItems) {
				results.push({ id: item.id, index: "payment_items", source: item });
			}

			return results;
		}),
});
