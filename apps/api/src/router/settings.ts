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
	clubBookingEnabled: true,
	reportCardsEnabled: true,
	communityHubEnabled: true,
	homeworkEnabled: true,
	readingDiaryEnabled: true,
	visitorManagementEnabled: true,
	misIntegrationEnabled: true,
	achievementsEnabled: true,
	galleryEnabled: true,
	progressSummariesEnabled: true,
	liveChatEnabled: true,
	aiDraftingEnabled: true,
	attendanceAlertsEnabled: true,
	studentPortalEnabled: true,
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
				name: z.string().min(1, "Name is required").max(100),
				phone: z.string().max(20).nullable(),
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
				name: z.string().min(1, "School name is required").max(200),
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
				clubBookingEnabled: z.boolean().optional(),
				reportCardsEnabled: z.boolean().optional(),
				communityHubEnabled: z.boolean().optional(),
				homeworkEnabled: z.boolean().optional(),
				readingDiaryEnabled: z.boolean().optional(),
				visitorManagementEnabled: z.boolean().optional(),
				misIntegrationEnabled: z.boolean().optional(),
				achievementsEnabled: z.boolean().optional(),
				galleryEnabled: z.boolean().optional(),
				progressSummariesEnabled: z.boolean().optional(),
				liveChatEnabled: z.boolean().optional(),
				aiDraftingEnabled: z.boolean().optional(),
				attendanceAlertsEnabled: z.boolean().optional(),
				studentPortalEnabled: z.boolean().optional(),
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

	exportUserData: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.user.id;

		const [
			user,
			accounts,
			children,
			payments,
			formResponses,
			messageReads,
			wellbeingCheckIns,
			mealBookings,
			clubEnrollments,
			homeworkCompletions,
			eventRsvps,
			achievements,
			chatMessages,
			communityPosts,
			communityComments,
			volunteerSignups,
		] = await Promise.all([
			ctx.prisma.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					language: true,
					emailVerified: true,
					notifyByPush: true,
					notifyBySms: true,
					notifyByEmail: true,
					quietStart: true,
					quietEnd: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			ctx.prisma.account.findMany({
				where: { userId },
				select: {
					id: true,
					providerId: true,
					accountId: true,
					createdAt: true,
				},
			}),
			ctx.prisma.parentChild.findMany({
				where: { userId },
				select: {
					relation: true,
					child: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							yearGroup: true,
							className: true,
						},
					},
				},
			}),
			ctx.prisma.payment.findMany({
				where: { userId },
				select: {
					id: true,
					totalAmount: true,
					status: true,
					receiptNumber: true,
					createdAt: true,
					completedAt: true,
					lineItems: {
						select: {
							amount: true,
							paymentItem: { select: { title: true, category: true } },
						},
					},
				},
			}),
			ctx.prisma.formResponse.findMany({
				where: { parentId: userId },
				select: {
					id: true,
					data: true,
					submittedAt: true,
					template: { select: { title: true } },
					child: { select: { firstName: true, lastName: true } },
				},
			}),
			ctx.prisma.messageRead.findMany({
				where: { userId },
				select: { messageId: true, readAt: true },
			}),
			ctx.prisma.wellbeingCheckIn.findMany({
				where: {
					child: { parentLinks: { some: { userId } } },
				},
				select: {
					mood: true,
					note: true,
					checkedInBy: true,
					date: true,
					child: { select: { firstName: true } },
				},
			}),
			ctx.prisma.mealBooking.findMany({
				where: { bookedBy: userId },
				select: {
					date: true,
					status: true,
					mealOption: { select: { name: true, category: true } },
					child: { select: { firstName: true } },
				},
			}),
			ctx.prisma.clubEnrollment.findMany({
				where: { enrolledBy: userId },
				select: {
					status: true,
					createdAt: true,
					club: { select: { name: true, day: true } },
					child: { select: { firstName: true } },
				},
			}),
			ctx.prisma.homeworkCompletion.findMany({
				where: {
					child: { parentLinks: { some: { userId } } },
				},
				select: {
					status: true,
					completedAt: true,
					grade: true,
					feedback: true,
					assignment: { select: { title: true, subject: true } },
					child: { select: { firstName: true } },
				},
			}),
			ctx.prisma.eventRsvp.findMany({
				where: { userId },
				select: {
					response: true,
					note: true,
					createdAt: true,
					event: { select: { title: true, startDate: true } },
				},
			}),
			ctx.prisma.achievement.findMany({
				where: {
					child: { parentLinks: { some: { userId } } },
				},
				select: {
					points: true,
					reason: true,
					createdAt: true,
					category: { select: { name: true } },
					child: { select: { firstName: true } },
				},
			}),
			ctx.prisma.chatMessage.findMany({
				where: { senderId: userId },
				select: {
					body: true,
					createdAt: true,
					readAt: true,
				},
			}),
			ctx.prisma.communityPost.findMany({
				where: { authorId: userId },
				select: {
					type: true,
					title: true,
					body: true,
					tags: true,
					status: true,
					createdAt: true,
				},
			}),
			ctx.prisma.communityComment.findMany({
				where: { authorId: userId },
				select: {
					body: true,
					status: true,
					createdAt: true,
				},
			}),
			ctx.prisma.volunteerSignup.findMany({
				where: { userId },
				select: {
					createdAt: true,
					slot: {
						select: {
							description: true,
							date: true,
							post: { select: { title: true } },
						},
					},
				},
			}),
		]);

		return {
			exportedAt: new Date().toISOString(),
			user,
			accounts,
			children,
			payments,
			formResponses,
			messageReads,
			wellbeingCheckIns,
			mealBookings,
			clubEnrollments,
			homeworkCompletions,
			eventRsvps,
			achievements,
			chatMessages,
			communityPosts,
			communityComments,
			volunteerSignups,
		};
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
