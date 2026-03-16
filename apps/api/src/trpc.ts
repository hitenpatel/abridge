import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { Context } from "./context";
import { getCachedStaffMembership, setCachedStaffMembership } from "./lib/redis";

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.user || !ctx.session) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({
		ctx: {
			...ctx,
			// infers the `user` and `session` as non-nullable
			user: ctx.user,
			session: ctx.session,
		},
	});
});

// Unscoped staff procedure - for endpoints that operate across all schools
// (e.g. "list my schools")
export const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	// Try cache first
	const cached = await getCachedStaffMembership(ctx.user.id);
	let staffMembers = Array.isArray(cached) ? cached : null;

	if (!staffMembers) {
		// Cache miss - query database
		staffMembers = await ctx.prisma.staffMember.findMany({
			where: { userId: ctx.user.id },
			select: { schoolId: true, role: true },
		});

		// Cache the result
		await setCachedStaffMembership(ctx.user.id, staffMembers);
	}

	if (staffMembers.length === 0) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Staff access required",
		});
	}

	return next({
		ctx: {
			...ctx,
			staffMembers,
		},
	});
});

// Unscoped admin procedure - for endpoints that require admin at any school
export const adminProcedure = staffProcedure.use(({ ctx, next }) => {
	const isAdmin = ctx.staffMembers.some((s) => s?.role === "ADMIN");
	if (!isAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Admin access required",
		});
	}
	return next({ ctx });
});

// School-scoped input schema
const schoolInput = z.object({ schoolId: z.string() });

// School-scoped staff procedure - verifies membership for a specific school
export const schoolStaffProcedure = protectedProcedure
	.input(schoolInput)
	.use(async ({ ctx, input, next }) => {
		// Try cache first
		const cachedMember = await getCachedStaffMembership(ctx.user.id, input.schoolId);
		let staffMember = cachedMember && !Array.isArray(cachedMember) ? cachedMember : null;

		if (!staffMember) {
			// Cache miss - query database
			staffMember = await ctx.prisma.staffMember.findUnique({
				where: {
					userId_schoolId: {
						userId: ctx.user.id,
						schoolId: input.schoolId,
					},
				},
			});

			// Cache the result (even if null, to avoid repeated queries)
			await setCachedStaffMembership(ctx.user.id, staffMember, input.schoolId);
		}

		if (!staffMember) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Not a staff member of this school",
			});
		}

		return next({
			ctx: {
				...ctx,
				staffMember,
				schoolId: input.schoolId,
			},
		});
	});

// School-scoped staff procedure with feature toggles loaded into context
export const schoolFeatureProcedure = schoolStaffProcedure.use(async ({ ctx, next }) => {
	const school = await ctx.prisma.school.findUnique({
		where: { id: ctx.schoolId },
		select: {
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
		},
	});

	if (!school) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "School not found",
		});
	}

	return next({
		ctx: {
			...ctx,
			schoolFeatures: school,
		},
	});
});

// Student procedure - verifies user is linked to a child via Child.userId
export const studentProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const studentChild = await ctx.prisma.child.findUnique({
		where: { userId: ctx.user.id },
	});

	if (!studentChild) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Student access required",
		});
	}

	return next({
		ctx: {
			...ctx,
			studentChild,
		},
	});
});

// School-scoped admin procedure - verifies admin role for a specific school
export const schoolAdminProcedure = protectedProcedure
	.input(schoolInput)
	.use(async ({ ctx, input, next }) => {
		// Try cache first
		const cachedAdmin = await getCachedStaffMembership(ctx.user.id, input.schoolId);
		let staffMember = cachedAdmin && !Array.isArray(cachedAdmin) ? cachedAdmin : null;

		if (!staffMember) {
			// Cache miss - query database
			staffMember = await ctx.prisma.staffMember.findUnique({
				where: {
					userId_schoolId: {
						userId: ctx.user.id,
						schoolId: input.schoolId,
					},
				},
			});

			// Cache the result
			await setCachedStaffMembership(ctx.user.id, staffMember, input.schoolId);
		}

		if (!staffMember || staffMember.role !== "ADMIN") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Admin access required for this school",
			});
		}

		return next({
			ctx: {
				...ctx,
				staffMember,
				schoolId: input.schoolId,
			},
		});
	});
