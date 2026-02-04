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

	updateNotificationPreferences: protectedProcedure
		.input(
			z.object({
				quietStart: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.nullable(),
				quietEnd: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.nullable(),
				phone: z.string().nullable().optional(),
				language: z.string().default("en"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: {
					quietStart: input.quietStart,
					quietEnd: input.quietEnd,
					language: input.language,
					...(input.phone !== undefined ? { phone: input.phone } : {}),
				},
			});
			return { success: true };
		}),
});
