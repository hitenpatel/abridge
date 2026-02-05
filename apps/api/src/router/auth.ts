import type { User } from "@schoolconnect/db/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const authRouter = router({
	getSession: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.user) return null;

		// Fetch roles
		const [parentLinks, staffMember] = await Promise.all([
			ctx.prisma.parentChild.findMany({
				where: { userId: ctx.user.id },
				select: { id: true }, // Just check existence
				take: 1,
			}),
			ctx.prisma.staffMember.findFirst({
				where: { userId: ctx.user.id },
				select: { role: true, schoolId: true },
			}),
		]);

		return {
			...ctx.user,
			isParent: parentLinks.length > 0,
			staffRole: staffMember?.role || null,
			schoolId: staffMember?.schoolId || null,
		};
	}),
	getSecretMessage: protectedProcedure.query(({ ctx }) => {
		const displayName = ctx.user.name || ctx.user.email.split("@")[0];
		return `Hello ${displayName}, this is a secret message!`;
	}),
});
