import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { logger } from "../lib/logger";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

const EMERGENCY_TITLES: Record<string, string> = {
	LOCKDOWN: "Lockdown in Effect",
	EVACUATION: "Evacuation in Progress",
	SHELTER_IN_PLACE: "Shelter in Place",
	MEDICAL: "Medical Emergency",
	OTHER: "Emergency Alert",
};

export const emergencyRouter = router({
	initiateAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				type: z.enum(["LOCKDOWN", "EVACUATION", "SHELTER_IN_PLACE", "MEDICAL", "OTHER"]),
				message: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "emergencyComms");

			const activeAlert = await ctx.prisma.emergencyAlert.findFirst({
				where: {
					schoolId: input.schoolId,
					status: "ACTIVE",
				},
			});

			if (activeAlert) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "An emergency alert is already active. Resolve it before creating a new one.",
				});
			}

			const alert = await ctx.prisma.emergencyAlert.create({
				data: {
					schoolId: input.schoolId,
					type: input.type,
					title: EMERGENCY_TITLES[input.type] ?? "Emergency Alert",
					message: input.message ?? null,
					initiatedBy: ctx.user.id,
				},
			});

			logger.warn(
				{ alertId: alert.id, schoolId: input.schoolId, type: input.type },
				"Emergency alert initiated",
			);

			return alert;
		}),

	getActiveAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "emergencyComms");

			return ctx.prisma.emergencyAlert.findFirst({
				where: {
					schoolId: input.schoolId,
					status: "ACTIVE",
				},
				include: {
					updates: {
						orderBy: { createdAt: "asc" },
					},
					initiator: {
						select: { name: true },
					},
				},
			});
		}),

	postUpdate: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				alertId: z.string(),
				message: z.string().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "emergencyComms");

			const update = await ctx.prisma.emergencyUpdate.create({
				data: {
					alertId: input.alertId,
					message: input.message,
					postedBy: ctx.user.id,
				},
			});

			logger.info({ alertId: input.alertId, updateId: update.id }, "Emergency update posted");

			return update;
		}),

	resolveAlert: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				alertId: z.string(),
				status: z.enum(["ALL_CLEAR", "CANCELLED"]),
				reason: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "emergencyComms");

			if (input.status === "CANCELLED" && !input.reason) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A reason is required when cancelling an alert.",
				});
			}

			const alert = await ctx.prisma.emergencyAlert.update({
				where: { id: input.alertId },
				data: {
					status: input.status,
					resolvedBy: ctx.user.id,
					resolvedAt: new Date(),
				},
			});

			logger.info(
				{
					alertId: input.alertId,
					status: input.status,
					resolvedBy: ctx.user.id,
				},
				"Emergency alert resolved",
			);

			return alert;
		}),

	acknowledgeAlert: protectedProcedure
		.input(z.object({ alertId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const ack = await ctx.prisma.emergencyAcknowledgement.upsert({
				where: {
					alertId_userId: { alertId: input.alertId, userId: ctx.user.id },
				},
				create: {
					alertId: input.alertId,
					userId: ctx.user.id,
				},
				update: {},
			});

			return ack;
		}),

	getActiveAlertForParent: protectedProcedure.query(async ({ ctx }) => {
		// Derive schoolId from parent's child link
		const parentChild = await ctx.prisma.parentChild.findFirst({
			where: { userId: ctx.user.id },
			select: { child: { select: { schoolId: true } } },
		});

		if (!parentChild) {
			return null;
		}

		const schoolId = parentChild.child.schoolId;

		// Check feature is enabled
		const school = await ctx.prisma.school.findUnique({
			where: { id: schoolId },
			select: { emergencyCommsEnabled: true },
		});

		if (!school?.emergencyCommsEnabled) {
			return null;
		}

		const alert = await ctx.prisma.emergencyAlert.findFirst({
			where: {
				schoolId,
				status: "ACTIVE",
			},
			include: {
				updates: {
					orderBy: { createdAt: "asc" },
				},
				initiator: {
					select: { name: true },
				},
				_count: {
					select: { acknowledgements: true },
				},
			},
		});

		if (!alert) return null;

		// Check if current user has acknowledged
		const userAck = await ctx.prisma.emergencyAcknowledgement.findUnique({
			where: {
				alertId_userId: { alertId: alert.id, userId: ctx.user.id },
			},
		});

		return { ...alert, hasAcknowledged: !!userAck };
	}),

	getAlertHistory: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "emergencyComms");

			const items = await ctx.prisma.emergencyAlert.findMany({
				where: { schoolId: input.schoolId },
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "desc" },
				include: {
					initiator: { select: { name: true } },
					resolver: { select: { name: true } },
					_count: { select: { updates: true } },
				},
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const next = items.pop();
				nextCursor = next?.id;
			}

			return { items, nextCursor };
		}),
});
