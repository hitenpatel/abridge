import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, schoolStaffProcedure } from "../trpc";

export const calendarRouter = router({
	listEvents: protectedProcedure
		.input(
			z.object({
				startDate: z.date(),
				endDate: z.date(),
				category: z.enum(["TERM_DATE", "INSET_DAY", "EVENT", "DEADLINE", "CLUB"]).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get schools the parent's children attend
			const parentLinks = await ctx.prisma.parentChild.findMany({
				where: { userId: ctx.user.id },
				select: { child: { select: { schoolId: true } } },
			});
			const schoolIds = [
				...new Set(parentLinks.map((p: { child: { schoolId: string } }) => p.child.schoolId)),
			];

			if (schoolIds.length === 0) return [];

			return ctx.prisma.event.findMany({
				where: {
					schoolId: { in: schoolIds },
					startDate: { gte: input.startDate, lte: input.endDate },
					...(input.category ? { category: input.category } : {}),
				},
				orderBy: { startDate: "asc" },
			});
		}),

	createEvent: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				title: z.string().min(1),
				body: z.string().optional(),
				startDate: z.date(),
				endDate: z.date().optional(),
				allDay: z.boolean().default(false),
				category: z.enum(["TERM_DATE", "INSET_DAY", "EVENT", "DEADLINE", "CLUB"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const event = await ctx.prisma.event.create({
				data: {
					schoolId: input.schoolId,
					title: input.title,
					body: input.body,
					startDate: input.startDate,
					endDate: input.endDate,
					allDay: input.allDay,
					category: input.category,
				},
			});

				return { success: true, eventId: event.id };
		}),

	deleteEvent: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				eventId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const event = await ctx.prisma.event.findUnique({
				where: { id: input.eventId },
			});

			if (!event || event.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				});
			}

			await ctx.prisma.event.delete({ where: { id: input.eventId } });
			return { success: true };
		}),
});
