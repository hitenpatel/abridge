import { TRPCError } from "@trpc/server";
import { endOfDay, startOfDay } from "date-fns";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure, schoolStaffProcedure } from "../trpc";

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
				include: { child: { select: { school: { select: { attendanceEnabled: true } } } } },
			});

			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to view attendance for this child",
				});
			}

			if (!parentChild.child.school.attendanceEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Attendance is disabled for this school",
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
				reason: z.string().min(1).max(1000),
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
					school: { select: { attendanceEnabled: true } },
				},
			});

			if (!child || child.parentLinks.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not authorized to report absence for this child",
				});
			}

			if (!child.school.attendanceEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Attendance is disabled for this school",
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

			// Limit absence reporting to 30 days max
			const daysDiff = Math.ceil((end.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)) + 1;
			if (daysDiff > 30) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot report absence for more than 30 days at once",
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

	getSchoolAttendanceToday: schoolStaffProcedure.query(async ({ ctx }) => {
		const today = new Date();
		const children = await ctx.prisma.child.findMany({
			where: { schoolId: ctx.schoolId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				className: true,
				yearGroup: true,
				attendance: {
					where: {
						date: { gte: startOfDay(today), lte: endOfDay(today) },
					},
					select: { session: true, mark: true, note: true },
				},
			},
			orderBy: [{ yearGroup: "asc" }, { lastName: "asc" }],
		});

		let present = 0;
		let absent = 0;
		let late = 0;
		let unmarked = 0;

		const rows = children.map((child) => {
			const am = child.attendance.find((a) => a.session === "AM");
			const pm = child.attendance.find((a) => a.session === "PM");
			const amMark = am?.mark ?? null;
			const pmMark = pm?.mark ?? null;

			if (amMark === "PRESENT" || pmMark === "PRESENT") present++;
			if (amMark === "LATE" || pmMark === "LATE") late++;
			if (
				amMark === "ABSENT_AUTHORISED" ||
				amMark === "ABSENT_UNAUTHORISED" ||
				pmMark === "ABSENT_AUTHORISED" ||
				pmMark === "ABSENT_UNAUTHORISED"
			)
				absent++;
			if (!amMark && !pmMark) unmarked++;

			return {
				childId: child.id,
				firstName: child.firstName,
				lastName: child.lastName,
				className: child.className,
				yearGroup: child.yearGroup,
				am: amMark,
				pm: pmMark,
				amNote: am?.note ?? null,
				pmNote: pm?.note ?? null,
			};
		});

		return { summary: { present, absent, late, unmarked, total: children.length }, rows };
	}),

	getAlerts: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "attendanceAlerts");

			const where: Record<string, unknown> = { schoolId: input.schoolId };
			if (input.status) {
				where.status = input.status;
			}

			const alerts = await ctx.prisma.attendanceAlert.findMany({
				where,
				orderBy: { createdAt: "desc" },
				include: {
					child: { select: { firstName: true, lastName: true, className: true, yearGroup: true } },
					acknowledger: { select: { name: true } },
				},
			});

			return alerts;
		}),

	acknowledgeAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				alertId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "attendanceAlerts");

			const alert = await ctx.prisma.attendanceAlert.findFirst({
				where: { id: input.alertId, schoolId: input.schoolId },
			});

			if (!alert) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
			}

			if (alert.status !== "OPEN") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Alert is not in OPEN status" });
			}

			const updated = await ctx.prisma.attendanceAlert.update({
				where: { id: input.alertId },
				data: {
					status: "ACKNOWLEDGED",
					acknowledgedBy: ctx.user.id,
				},
			});

			return updated;
		}),

	resolveAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				alertId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "attendanceAlerts");

			const alert = await ctx.prisma.attendanceAlert.findFirst({
				where: { id: input.alertId, schoolId: input.schoolId },
			});

			if (!alert) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
			}

			if (alert.status === "RESOLVED") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Alert is already resolved" });
			}

			const updated = await ctx.prisma.attendanceAlert.update({
				where: { id: input.alertId },
				data: {
					status: "RESOLVED",
					resolvedAt: new Date(),
				},
			});

			return updated;
		}),
});
