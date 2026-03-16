import { z } from "zod";
import { isParentOrStudentOfChild } from "../lib/student-auth";
import { protectedProcedure, router } from "../trpc";

export const timetableRouter = router({
	getForChild: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent, student, or staff has access to this child
			const hasAccess = await isParentOrStudentOfChild(ctx.prisma, ctx.user.id, input.childId);
			if (!hasAccess) {
				const staffMember = await ctx.prisma.staffMember.findFirst({
					where: { userId: ctx.user.id },
				});
				if (!staffMember) {
					throw new Error("You do not have access to this child's timetable");
				}
			}

			const now = new Date();
			return ctx.prisma.timetableEntry.findMany({
				where: {
					childId: input.childId,
					termStart: { lte: now },
					termEnd: { gte: now },
				},
				orderBy: [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
			});
		}),
});
