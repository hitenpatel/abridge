import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
	updatePushToken: protectedProcedure
		.input(
			z.object({
				pushToken: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: { pushToken: input.pushToken },
			});

			return { success: true };
		}),

	listChildren: protectedProcedure.query(async ({ ctx }) => {
		return ctx.prisma.parentChild.findMany({
			where: { userId: ctx.user.id },
			include: { child: true },
		});
	}),
});
