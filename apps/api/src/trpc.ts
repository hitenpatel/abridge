import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
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

export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
	if (ctx.staffMembers.length === 0) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only staff members can access this resource",
		});
	}
	return next({ ctx });
});

export const adminProcedure = staffProcedure.use(({ ctx, next }) => {
	const isAdmin = ctx.staffMembers.some((s) => s.role === "ADMIN");
	if (!isAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only administrators can access this resource",
		});
	}
	return next({ ctx });
});
