import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const attendanceRouter = router({
	getAttendanceForChild: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent link
			const parentChild = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: {
						userId: ctx.user.id,
						childId: input.childId,
					},
				},
			});

			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to view attendance for this child",
				});
			}

			// Normalize dates to start and end of day in UTC
			const start = new Date(input.startDate);
			start.setUTCHours(0, 0, 0, 0);
			const end = new Date(input.endDate);
			end.setUTCHours(23, 59, 59, 999);

			return ctx.prisma.attendanceRecord.findMany({
				where: {
					childId: input.childId,
					date: {
						gte: start,
						lte: end,
					},
				},
				orderBy: { date: "desc" },
			});
		}),

	reportAbsence: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
				reason: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// 1. Verify parent link and get schoolId
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
				include: {
					parentLinks: {
						where: { userId: ctx.user.id },
					},
				},
			});

			if (!child || child.parentLinks.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to report absence for this child",
				});
			}

			// 2. Generate dates range
			const dates: Date[] = [];
			const current = new Date(input.startDate);
			current.setUTCHours(0, 0, 0, 0);
			const end = new Date(input.endDate);
			end.setUTCHours(0, 0, 0, 0);

			if (end < current) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "End date cannot be before start date",
				});
			}

			while (current <= end) {
				dates.push(new Date(current));
				current.setUTCDate(current.getUTCDate() + 1);
			}

			// 3. Create records for AM and PM
			await ctx.prisma.$transaction(
				dates.flatMap((date) => [
					ctx.prisma.attendanceRecord.upsert({
						where: {
							childId_date_session: {
								childId: input.childId,
								date,
								session: "AM",
							},
						},
						update: {
							mark: "ABSENT_AUTHORISED",
							note: input.reason,
						},
						create: {
							childId: input.childId,
							schoolId: child.schoolId,
							date,
							session: "AM",
							mark: "ABSENT_AUTHORISED",
							note: input.reason,
						},
					}),
					ctx.prisma.attendanceRecord.upsert({
						where: {
							childId_date_session: {
								childId: input.childId,
								date,
								session: "PM",
							},
						},
						update: {
							mark: "ABSENT_AUTHORISED",
							note: input.reason,
						},
						create: {
							childId: input.childId,
							schoolId: child.schoolId,
							date,
							session: "PM",
							mark: "ABSENT_AUTHORISED",
							note: input.reason,
						},
					}),
				]),
			);

			return { success: true, recordCount: dates.length * 2 };
		}),
});
