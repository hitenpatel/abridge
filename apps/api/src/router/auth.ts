import type { StaffRole, User } from "@schoolconnect/db/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logger } from "../lib/logger";
import { invalidateStaffCache } from "../lib/redis";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const authRouter = router({
	getSession: publicProcedure.query(async ({ ctx }) => {
		if (!ctx.user) return null;

		// Fetch roles
		let [parentLinks, staffMember] = await Promise.all([
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

		// If user has no staff membership, check for unprocessed invitations
		// (handles case where the signup hook failed to process them)
		if (!staffMember) {
			try {
				const invitations: { id: string; schoolId: string; role: StaffRole }[] =
					await ctx.prisma.$queryRawUnsafe(
						`SELECT * FROM invitations
					 WHERE email = $1 AND "acceptedAt" IS NULL AND "expiresAt" > NOW()`,
						ctx.user.email,
					);

				for (const invite of invitations) {
					await ctx.prisma.staffMember.create({
						data: {
							userId: ctx.user.id,
							schoolId: invite.schoolId,
							role: invite.role,
						},
					});
					logger.info({ userId: ctx.user.id, schoolId: invite.schoolId, role: invite.role }, "Recovered: created staff member from pending invitation");

					await invalidateStaffCache(ctx.user.id, invite.schoolId);

					await ctx.prisma.$executeRawUnsafe(
						`UPDATE invitations SET "acceptedAt" = NOW() WHERE id = $1`,
						invite.id,
					);
				}

				// Re-fetch staff member if invitations were processed
				if (invitations.length > 0) {
					staffMember = await ctx.prisma.staffMember.findFirst({
						where: { userId: ctx.user.id },
						select: { role: true, schoolId: true },
					});
				}
			} catch (error) {
				logger.error({ userId: ctx.user.id, error: error instanceof Error ? error.message : String(error) }, "Failed to recover pending invitations");
			}
		}

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
