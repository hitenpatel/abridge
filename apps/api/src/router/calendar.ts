import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

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
			// Get schools via parent-child links
			const parentLinks = await ctx.prisma.parentChild.findMany({
				where: { userId: ctx.user.id },
				select: { child: { select: { schoolId: true } } },
			});
			// Also get schools via staff membership
			const staffLinks = await ctx.prisma.staffMember.findMany({
				where: { userId: ctx.user.id },
				select: { schoolId: true },
			});
			const schoolIds = [
				...new Set([
					...parentLinks.map((p: { child: { schoolId: string } }) => p.child.schoolId),
					...staffLinks.map((s: { schoolId: string }) => s.schoolId),
				]),
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

	createEvent: schoolFeatureProcedure
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
			assertFeatureEnabled(ctx, "calendar");
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

	deleteEvent: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				eventId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "calendar");
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
