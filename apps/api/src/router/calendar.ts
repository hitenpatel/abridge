import type { RecurrencePattern } from "@schoolconnect/db/client";
import { TRPCError } from "@trpc/server";
import { addDays, addMonths, addWeeks } from "date-fns";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

const RECURRENCE_PATTERNS = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;

function expandRecurringEvent(
	event: {
		id: string;
		schoolId: string;
		title: string;
		body: string | null;
		startDate: Date;
		endDate: Date | null;
		allDay: boolean;
		category: string;
		recurrencePattern: RecurrencePattern | null;
		recurrenceEndDate: Date | null;
		createdAt: Date;
	},
	rangeStart: Date,
	rangeEnd: Date,
) {
	if (!event.recurrencePattern) return [event];

	const occurrences: (typeof event & { isRecurrenceInstance: boolean; originalEventId: string })[] =
		[];
	const duration = event.endDate ? event.endDate.getTime() - event.startDate.getTime() : 0;
	const recEnd = event.recurrenceEndDate
		? new Date(Math.min(event.recurrenceEndDate.getTime(), rangeEnd.getTime()))
		: rangeEnd;

	let current = new Date(event.startDate);
	const maxOccurrences = 366; // safety limit
	let count = 0;

	while (current <= recEnd && count < maxOccurrences) {
		if (current >= rangeStart && current <= rangeEnd) {
			occurrences.push({
				...event,
				id: `${event.id}_${current.toISOString()}`,
				startDate: new Date(current),
				endDate: duration ? new Date(current.getTime() + duration) : null,
				isRecurrenceInstance: true,
				originalEventId: event.id,
			});
		}

		count++;
		switch (event.recurrencePattern) {
			case "DAILY":
				current = addDays(current, 1);
				break;
			case "WEEKLY":
				current = addWeeks(current, 1);
				break;
			case "BIWEEKLY":
				current = addWeeks(current, 2);
				break;
			case "MONTHLY":
				current = addMonths(current, 1);
				break;
		}
	}

	return occurrences;
}

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

			// Fetch non-recurring events in range + all recurring events that started before range end
			const [singleEvents, recurringEvents] = await Promise.all([
				ctx.prisma.event.findMany({
					where: {
						schoolId: { in: schoolIds },
						recurrencePattern: null,
						startDate: { gte: input.startDate, lte: input.endDate },
						...(input.category ? { category: input.category } : {}),
					},
					orderBy: { startDate: "asc" },
				}),
				ctx.prisma.event.findMany({
					where: {
						schoolId: { in: schoolIds },
						recurrencePattern: { not: null },
						startDate: { lte: input.endDate },
						...(input.category ? { category: input.category } : {}),
					},
				}),
			]);

			// Expand recurring events into occurrences within the range
			const expandedOccurrences = recurringEvents.flatMap((event) =>
				expandRecurringEvent(event, input.startDate, input.endDate),
			);

			// Merge and sort
			const allEvents = [...singleEvents, ...expandedOccurrences].sort(
				(a, b) => a.startDate.getTime() - b.startDate.getTime(),
			);

			return allEvents;
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
				recurrencePattern: z.enum(RECURRENCE_PATTERNS).optional(),
				recurrenceEndDate: z.date().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "calendar");

			if (input.recurrencePattern && !input.recurrenceEndDate) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Recurring events require an end date for the recurrence",
				});
			}

			const event = await ctx.prisma.event.create({
				data: {
					schoolId: input.schoolId,
					title: input.title,
					body: input.body,
					startDate: input.startDate,
					endDate: input.endDate,
					allDay: input.allDay,
					category: input.category,
					recurrencePattern: input.recurrencePattern,
					recurrenceEndDate: input.recurrenceEndDate,
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

			// Handle recurring event instance IDs (format: originalId_isoDate)
			const realEventId = input.eventId.includes("_") ? input.eventId.split("_")[0] : input.eventId;

			const event = await ctx.prisma.event.findUnique({
				where: { id: realEventId },
			});

			if (!event || event.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				});
			}

			await ctx.prisma.event.delete({ where: { id: realEventId } });
			return { success: true };
		}),
});
