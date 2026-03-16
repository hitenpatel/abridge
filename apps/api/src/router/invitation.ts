import { randomBytes } from "node:crypto";
import type { StaffRole } from "@schoolconnect/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logger } from "../lib/logger";
import { invalidateStaffCache } from "../lib/redis";
import { sendStaffInvitationEmail } from "../services/email";
import { publicProcedure, router, schoolAdminProcedure } from "../trpc";

interface RawInvitation {
	id: string;
	email: string;
	schoolId: string;
	role: StaffRole;
	schoolName: string;
	expiresAt: Date;
	acceptedAt: Date | null;
}

const tokenSchema = z
	.string()
	.length(64)
	.regex(/^[0-9a-f]+$/, "Invalid token format");

export const invitationRouter = router({
	send: schoolAdminProcedure
		.input(
			z.object({
				email: z.string().email().max(255),
				role: z.enum(["ADMIN", "TEACHER", "OFFICE"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const token = randomBytes(32).toString("hex");
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
			const id = `inv_${randomBytes(8).toString("hex")}`;

			// Get school details for email
			const school = await ctx.prisma.school.findUnique({
				where: { id: ctx.schoolId },
				select: { name: true },
			});

			if (!school) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "School not found",
				});
			}

			await ctx.prisma.$executeRaw`
				INSERT INTO invitations (id, email, "schoolId", role, token, "expiresAt", "createdAt")
				VALUES (${id}, ${input.email}, ${ctx.schoolId}, ${input.role}::"StaffRole", ${token}, ${expiresAt}, NOW())
			`;

			// Send invitation email
			const emailResult = await sendStaffInvitationEmail({
				recipientEmail: input.email,
				schoolName: school.name,
				role: input.role,
				invitationToken: token,
				expiresAt,
			});

			if (!emailResult.success) {
				logger.warn(
					{ email: input.email, invitationId: id },
					"Invitation created but email failed to send",
				);
			}

			return { success: true, token, emailSent: emailResult.success };
		}),

	accept: publicProcedure
		.input(z.object({ token: tokenSchema }))
		.mutation(async ({ ctx, input }) => {
			const results: RawInvitation[] = await ctx.prisma.$queryRaw`
				SELECT i.id, i.email, i."schoolId", i.role, i."expiresAt", i."acceptedAt", s.name as "schoolName"
				FROM invitations i
				JOIN schools s ON i."schoolId" = s.id
				WHERE i.token = ${input.token} LIMIT 1
			`;

			const invitation = results[0];

			if (!invitation) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid invitation token",
				});
			}

			if (new Date(invitation.expiresAt) < new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invitation has expired",
				});
			}

			if (invitation.acceptedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invitation has already been accepted",
				});
			}

			// Update the user (if needed)
			const existingUser = await ctx.prisma.user.findUnique({
				where: { email: invitation.email },
			});

			const userData = existingUser ?? {
				id: invitation.email,
				email: invitation.email,
				name: invitation.email.split("@")[0],
				emailVerified: true,
			};

			const user = await ctx.prisma.user.upsert({
				where: { email: invitation.email },
				update: { name: userData.name, emailVerified: true },
				create: userData,
			});

			// Apply school default notification preferences for new users
			if (!existingUser) {
				const school = await ctx.prisma.school.findUnique({
					where: { id: invitation.schoolId },
					select: {
						defaultNotifyByPush: true,
						defaultNotifyBySms: true,
						defaultNotifyByEmail: true,
					},
				});
				if (school) {
					await ctx.prisma.user.update({
						where: { id: user.id },
						data: {
							notifyByPush: school.defaultNotifyByPush,
							notifyBySms: school.defaultNotifyBySms,
							notifyByEmail: school.defaultNotifyByEmail,
						},
					});
				}
			}

			// Add staff member
			await ctx.prisma.staffMember.create({
				data: {
					userId: user.id,
					schoolId: invitation.schoolId,
					role: invitation.role,
				},
			});

			// Invalidate staff cache for the new member
			await invalidateStaffCache(user.id, invitation.schoolId);

			// Mark invitation as accepted
			await ctx.prisma.$executeRaw`
				UPDATE invitations SET "acceptedAt" = NOW() WHERE id = ${invitation.id}
			`;

			logger.info(
				{ email: user.email, schoolName: invitation.schoolName, role: invitation.role },
				"User accepted invitation",
			);

			return { success: true };
		}),

	verify: publicProcedure.input(z.object({ token: tokenSchema })).query(async ({ ctx, input }) => {
		const results: RawInvitation[] = await ctx.prisma.$queryRaw`
			SELECT i.id, i.email, i."schoolId", i.role, i."expiresAt", i."acceptedAt", s.name as "schoolName"
			FROM invitations i
			JOIN schools s ON i."schoolId" = s.id
			WHERE i.token = ${input.token} LIMIT 1
		`;

		const invitation = results[0];

		if (!invitation) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Invalid invitation token",
			});
		}

		if (new Date(invitation.expiresAt) < new Date()) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invitation has expired",
			});
		}

		if (invitation.acceptedAt) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invitation has already been accepted",
			});
		}

		return {
			email: invitation.email,
			role: invitation.role,
			schoolName: invitation.schoolName,
			schoolId: invitation.schoolId,
		};
	}),

	list: schoolAdminProcedure.query(async ({ ctx }) => {
		return ctx.prisma.$queryRaw`
			SELECT id, email, "schoolId", role, token, "expiresAt", "createdAt", "acceptedAt"
			FROM invitations WHERE "schoolId" = ${ctx.schoolId} ORDER BY "createdAt" DESC
		`;
	}),
});
