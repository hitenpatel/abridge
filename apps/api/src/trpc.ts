import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { Context } from "./context";

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
	const staffMembers = await ctx.prisma.staffMember.findMany({
		where: { userId: ctx.user.id },
		select: { schoolId: true, role: true },
	});

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
	const isAdmin = ctx.staffMembers.some((s) => s.role === "ADMIN");
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
		const staffMember = await ctx.prisma.staffMember.findUnique({
			where: {
				userId_schoolId: {
					userId: ctx.user.id,
					schoolId: input.schoolId,
				},
			},
		});

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

// School-scoped admin procedure - verifies admin role for a specific school
export const schoolAdminProcedure = protectedProcedure
	.input(schoolInput)
	.use(async ({ ctx, input, next }) => {
		const staffMember = await ctx.prisma.staffMember.findUnique({
			where: {
				userId_schoolId: {
					userId: ctx.user.id,
					schoolId: input.schoolId,
				},
			},
		});

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
