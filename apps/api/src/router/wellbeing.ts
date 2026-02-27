import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const wellbeingRouter = router({
	submitCheckIn: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				mood: z.enum(["GREAT", "GOOD", "OK", "LOW", "STRUGGLING"]),
				note: z.string().max(200).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: {
					userId: ctx.user.id,
					childId: input.childId,
				},
			});

			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
			});

			if (!child) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });
			}

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const checkIn = await ctx.prisma.wellbeingCheckIn.upsert({
				where: {
					childId_date: {
						childId: input.childId,
						date: today,
					},
				},
				update: {
					mood: input.mood,
					note: input.note ?? null,
				},
				create: {
					childId: input.childId,
					schoolId: child.schoolId,
					mood: input.mood,
					note: input.note ?? null,
					checkedInBy: "PARENT",
					date: today,
				},
			});

			return checkIn;
		}),

	staffCheckIn: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
				mood: z.enum(["GREAT", "GOOD", "OK", "LOW", "STRUGGLING"]),
				note: z.string().max(200).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "wellbeing");

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const checkIn = await ctx.prisma.wellbeingCheckIn.upsert({
				where: {
					childId_date: {
						childId: input.childId,
						date: today,
					},
				},
				update: {
					mood: input.mood,
					note: input.note ?? null,
				},
				create: {
					childId: input.childId,
					schoolId: input.schoolId,
					mood: input.mood,
					note: input.note ?? null,
					checkedInBy: "STAFF",
					date: today,
				},
			});

			return checkIn;
		}),

	getCheckIns: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: {
					userId: ctx.user.id,
					childId: input.childId,
				},
			});

			if (!parentChild) {
				const child = await ctx.prisma.child.findUnique({
					where: { id: input.childId },
				});
				if (child) {
					const staff = await ctx.prisma.staffMember.findUnique({
						where: {
							userId_schoolId: {
								userId: ctx.user.id,
								schoolId: child.schoolId,
							},
						},
					});
					if (!staff) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "No access to this child",
						});
					}
				}
			}

			return ctx.prisma.wellbeingCheckIn.findMany({
				where: {
					childId: input.childId,
					date: {
						gte: input.startDate,
						lte: input.endDate,
					},
				},
				orderBy: { date: "desc" },
			});
		}),

	getClassOverview: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				date: z.date().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "wellbeing");

			const targetDate = input.date ?? new Date();
			targetDate.setHours(0, 0, 0, 0);

			const checkIns = await ctx.prisma.wellbeingCheckIn.findMany({
				where: {
					schoolId: input.schoolId,
					date: targetDate,
				},
				include: {
					child: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							yearGroup: true,
						},
					},
				},
				orderBy: { child: { lastName: "asc" } },
			});

			return checkIns;
		}),

	getAlerts: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "wellbeing");

			return ctx.prisma.wellbeingAlert.findMany({
				where: {
					schoolId: input.schoolId,
					...(input.status ? { status: input.status } : {}),
				},
				include: {
					child: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							yearGroup: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: 50,
			});
		}),

	acknowledgeAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				alertId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "wellbeing");

			return ctx.prisma.wellbeingAlert.update({
				where: { id: input.alertId },
				data: {
					status: "ACKNOWLEDGED",
					acknowledgedBy: ctx.user.id,
					acknowledgedAt: new Date(),
				},
			});
		}),

	resolveAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				alertId: z.string(),
				note: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "wellbeing");

			return ctx.prisma.wellbeingAlert.update({
				where: { id: input.alertId },
				data: {
					status: "RESOLVED",
					resolvedBy: ctx.user.id,
					resolvedAt: new Date(),
					note: input.note ?? null,
				},
			});
		}),

	createManualAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
				note: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "wellbeing");

			return ctx.prisma.wellbeingAlert.create({
				data: {
					childId: input.childId,
					schoolId: input.schoolId,
					triggerRule: "MANUAL",
					note: input.note ?? null,
				},
			});
		}),
});
