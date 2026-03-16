import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invalidateStaffCache } from "../lib/redis";
import { router, schoolAdminProcedure } from "../trpc";

export const staffRouter = router({
	list: schoolAdminProcedure.query(async ({ ctx }) => {
		const staff = await ctx.prisma.staffMember.findMany({
			where: { schoolId: ctx.schoolId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
			orderBy: { role: "asc" },
		});

		return staff;
	}),

	remove: schoolAdminProcedure
		.input(z.object({ userId: z.string().max(128) }))
		.mutation(async ({ ctx, input }) => {
			// Prevent removing yourself
			if (input.userId === ctx.user.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You cannot remove yourself from the school staff",
				});
			}

			await ctx.prisma.staffMember.delete({
				where: {
					userId_schoolId: {
						userId: input.userId,
						schoolId: ctx.schoolId,
					},
				},
			});

			// Invalidate cache for removed user
			await invalidateStaffCache(input.userId, ctx.schoolId);

			return { success: true };
		}),

	updateRole: schoolAdminProcedure
		.input(
			z.object({
				userId: z.string().max(128),
				role: z.enum(["ADMIN", "TEACHER", "OFFICE"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Prevent changing your own role to something else (safety)
			if (input.userId === ctx.user.id && input.role !== "ADMIN") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You cannot downgrade your own role",
				});
			}

			await ctx.prisma.staffMember.update({
				where: {
					userId_schoolId: {
						userId: input.userId,
						schoolId: ctx.schoolId,
					},
				},
				data: { role: input.role },
			});

			// Invalidate cache for updated user
			await invalidateStaffCache(input.userId, ctx.schoolId);

			return { success: true };
		}),
});
