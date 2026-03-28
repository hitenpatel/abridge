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
						deletedAt: null,
						startDate: { gte: input.startDate, lte: input.endDate },
						...(input.category ? { category: input.category } : {}),
					},
					orderBy: { startDate: "asc" },
				}),
				ctx.prisma.event.findMany({
					where: {
						schoolId: { in: schoolIds },
						recurrencePattern: { not: null },
						deletedAt: null,
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
				title: z.string().min(1).max(200),
				body: z.string().max(5000).optional(),
				startDate: z.date(),
				endDate: z.date().optional(),
				allDay: z.boolean().default(false),
				category: z.enum(["TERM_DATE", "INSET_DAY", "EVENT", "DEADLINE", "CLUB"]),
				recurrencePattern: z.enum(RECURRENCE_PATTERNS).optional(),
				recurrenceEndDate: z.date().optional(),
				rsvpRequired: z.boolean().default(false),
				maxCapacity: z.number().int().positive().optional(),
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
					rsvpRequired: input.rsvpRequired,
					maxCapacity: input.maxCapacity,
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
				where: { id: realEventId, deletedAt: null },
			});

			if (!event || event.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				});
			}

			await ctx.prisma.event.update({
				where: { id: realEventId },
				data: { deletedAt: new Date() },
			});
			return { success: true };
		}),

	rsvpToEvent: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				childId: z.string(),
				response: z.enum(["YES", "NO", "MAYBE"]),
				note: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify parent-child link
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
				include: { child: { select: { schoolId: true } } },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			// Get event details
			const event = await ctx.prisma.event.findUnique({
				where: { id: input.eventId, deletedAt: null },
			});
			if (!event) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
			}

			// Verify event belongs to child's school
			if (event.schoolId !== parentChild.child.schoolId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This event does not belong to your child's school",
				});
			}

			// Check capacity if response is YES and maxCapacity is set
			if (input.response === "YES" && event.maxCapacity) {
				const yesCount = await ctx.prisma.eventRsvp.count({
					where: {
						eventId: input.eventId,
						response: "YES",
						childId: { not: input.childId },
					},
				});
				if (yesCount >= event.maxCapacity) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Event is at capacity",
					});
				}
			}

			const rsvp = await ctx.prisma.eventRsvp.upsert({
				where: {
					eventId_childId: {
						eventId: input.eventId,
						childId: input.childId,
					},
				},
				update: {
					response: input.response,
					note: input.note,
				},
				create: {
					eventId: input.eventId,
					childId: input.childId,
					userId: ctx.user.id,
					response: input.response,
					note: input.note,
				},
			});

			return rsvp;
		}),

	getRsvps: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Get parent's children IDs
			const parentLinks = await ctx.prisma.parentChild.findMany({
				where: { userId: ctx.user.id },
				select: { childId: true },
			});
			const childIds = parentLinks.map((p: { childId: string }) => p.childId);

			const rsvps = await ctx.prisma.eventRsvp.findMany({
				where: {
					eventId: input.eventId,
					childId: { in: childIds },
				},
				include: {
					child: { select: { firstName: true, lastName: true } },
				},
			});

			return rsvps;
		}),

	getRsvpSummary: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				eventId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "calendar");

			const event = await ctx.prisma.event.findUnique({
				where: { id: input.eventId, deletedAt: null },
			});

			if (!event || event.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found in this school",
				});
			}

			const counts = await ctx.prisma.eventRsvp.groupBy({
				by: ["response"],
				where: { eventId: input.eventId },
				_count: { id: true },
			});

			const attendees = await ctx.prisma.eventRsvp.findMany({
				where: { eventId: input.eventId },
				include: {
					child: { select: { firstName: true, lastName: true } },
				},
			});

			return {
				counts: counts.map((c: { response: string; _count: { id: number } }) => ({
					response: c.response,
					count: c._count.id,
				})),
				attendees,
				maxCapacity: event?.maxCapacity ?? null,
			};
		}),
});
