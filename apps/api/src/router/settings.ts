import { z } from "zod";
import { protectedProcedure, router, schoolAdminProcedure } from "../trpc";

export const settingsRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUniqueOrThrow({
			where: { id: ctx.user.id },
			select: { name: true, email: true, phone: true },
		});
		return user;
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, "Name is required"),
				phone: z.string().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: { name: input.name, phone: input.phone },
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
});
