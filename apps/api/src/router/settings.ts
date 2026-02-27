import { z } from "zod";
import { protectedProcedure, router, schoolAdminProcedure, schoolStaffProcedure } from "../trpc";

const featureToggleSelect = {
	messagingEnabled: true,
	paymentsEnabled: true,
	attendanceEnabled: true,
	calendarEnabled: true,
	formsEnabled: true,
	paymentDinnerMoneyEnabled: true,
	paymentTripsEnabled: true,
	paymentClubsEnabled: true,
	paymentUniformEnabled: true,
	paymentOtherEnabled: true,
	translationEnabled: true,
	parentsEveningEnabled: true,
	wellbeingEnabled: true,
	emergencyCommsEnabled: true,
	analyticsEnabled: true,
	mealBookingEnabled: true,
	reportCardsEnabled: true,
	communityHubEnabled: true,
} as const;

export const settingsRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUniqueOrThrow({
			where: { id: ctx.user.id },
			select: { name: true, email: true, phone: true, language: true },
		});
		return user;
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, "Name is required"),
				phone: z.string().nullable(),
				language: z.string().min(2).max(5).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: { name: input.name, phone: input.phone, language: input.language },
			});
			return { success: true };
		}),

	getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUniqueOrThrow({
			where: { id: ctx.user.id },
			select: {
				notifyByPush: true,
				notifyBySms: true,
				notifyByEmail: true,
				quietStart: true,
				quietEnd: true,
			},
		});
		return user;
	}),

	updateNotificationPreferences: protectedProcedure
		.input(
			z.object({
				notifyByPush: z.boolean(),
				notifyBySms: z.boolean(),
				notifyByEmail: z.boolean(),
				quietStart: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
					.nullable(),
				quietEnd: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: {
					notifyByPush: input.notifyByPush,
					notifyBySms: input.notifyBySms,
					notifyByEmail: input.notifyByEmail,
					quietStart: input.quietStart,
					quietEnd: input.quietEnd,
				},
			});
			return { success: true };
		}),

	getSchoolSettings: schoolAdminProcedure.query(async ({ ctx }) => {
		const school = await ctx.prisma.school.findUniqueOrThrow({
			where: { id: ctx.schoolId },
			select: {
				name: true,
				defaultNotifyByPush: true,
				defaultNotifyBySms: true,
				defaultNotifyByEmail: true,
			},
		});
		return school;
	}),

	updateSchoolSettings: schoolAdminProcedure
		.input(
			z.object({
				name: z.string().min(1, "School name is required"),
				defaultNotifyByPush: z.boolean(),
				defaultNotifyBySms: z.boolean(),
				defaultNotifyByEmail: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.school.update({
				where: { id: ctx.schoolId },
				data: {
					name: input.name,
					defaultNotifyByPush: input.defaultNotifyByPush,
					defaultNotifyBySms: input.defaultNotifyBySms,
					defaultNotifyByEmail: input.defaultNotifyByEmail,
				},
			});
			return { success: true };
		}),

	getFeatureToggles: schoolStaffProcedure.query(async ({ ctx }) => {
		const school = await ctx.prisma.school.findUniqueOrThrow({
			where: { id: ctx.schoolId },
			select: featureToggleSelect,
		});
		return school;
	}),

	getFeatureTogglesForParent: protectedProcedure.query(async ({ ctx }) => {
		const parentChild = await ctx.prisma.parentChild.findFirst({
			where: { userId: ctx.user.id },
			select: { child: { select: { schoolId: true } } },
		});
		if (!parentChild) {
			return null;
		}
		const school = await ctx.prisma.school.findUniqueOrThrow({
			where: { id: parentChild.child.schoolId },
			select: featureToggleSelect,
		});
		return school;
	}),

	updateFeatureToggles: schoolAdminProcedure
		.input(
			z.object({
				messagingEnabled: z.boolean().optional(),
				paymentsEnabled: z.boolean().optional(),
				attendanceEnabled: z.boolean().optional(),
				calendarEnabled: z.boolean().optional(),
				formsEnabled: z.boolean().optional(),
				paymentDinnerMoneyEnabled: z.boolean().optional(),
				paymentTripsEnabled: z.boolean().optional(),
				paymentClubsEnabled: z.boolean().optional(),
				paymentUniformEnabled: z.boolean().optional(),
				paymentOtherEnabled: z.boolean().optional(),
				translationEnabled: z.boolean().optional(),
				parentsEveningEnabled: z.boolean().optional(),
				wellbeingEnabled: z.boolean().optional(),
				emergencyCommsEnabled: z.boolean().optional(),
				analyticsEnabled: z.boolean().optional(),
				mealBookingEnabled: z.boolean().optional(),
				reportCardsEnabled: z.boolean().optional(),
				communityHubEnabled: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { schoolId, ...toggles } = input;
			const data: Record<string, boolean> = {};
			for (const [key, value] of Object.entries(toggles)) {
				if (value !== undefined) {
					data[key] = value;
				}
			}

			const school = await ctx.prisma.school.update({
				where: { id: ctx.schoolId },
				data,
				select: featureToggleSelect,
			});
			return school;
		}),

	getBranding: schoolAdminProcedure.query(async ({ ctx }) => {
		const school = await ctx.prisma.school.findUniqueOrThrow({
			where: { id: ctx.schoolId },
			select: {
				brandColor: true,
				secondaryColor: true,
				schoolMotto: true,
				brandFont: true,
			},
		});
		return school;
	}),

	updateBranding: schoolAdminProcedure
		.input(
			z.object({
				brandColor: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex colour")
					.optional(),
				secondaryColor: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex colour")
					.nullable()
					.optional(),
				schoolMotto: z.string().max(200).nullable().optional(),
				brandFont: z
					.enum([
						"DEFAULT",
						"ARIAL",
						"TIMES_NEW_ROMAN",
						"GEORGIA",
						"VERDANA",
						"COMIC_SANS",
						"OPEN_SANS",
						"ROBOTO",
						"LATO",
						"MONTSERRAT",
					])
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { schoolId, ...data } = input;
			const school = await ctx.prisma.school.update({
				where: { id: ctx.schoolId },
				data,
				select: {
					brandColor: true,
					secondaryColor: true,
					schoolMotto: true,
					brandFont: true,
				},
			});
			return school;
		}),
});
