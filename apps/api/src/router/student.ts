import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { protectedProcedure, router, schoolStaffProcedure } from "../trpc";

export const studentRouter = router({
	/**
	 * Staff generates an invite code for a specific child.
	 * The code can be given to the student to register their own account.
	 */
	generateStudentInvite: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify school has student portal enabled
			const school = await ctx.prisma.school.findUnique({
				where: { id: input.schoolId },
				select: { studentPortalEnabled: true },
			});
			if (!school?.studentPortalEnabled) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Student Portal is disabled for this school",
				});
			}

			// Verify child belongs to this school
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
			});
			if (!child || child.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found in this school",
				});
			}

			// Check if child already has a linked user account
			if (child.userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This child already has a linked student account",
				});
			}

			// Generate a unique 8-character invite code
			const code = randomBytes(4).toString("hex").toUpperCase();

			// Expire in 7 days
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			const invite = await ctx.prisma.studentInvite.create({
				data: {
					childId: input.childId,
					schoolId: input.schoolId,
					code,
					expiresAt,
				},
			});

			return {
				code: invite.code,
				expiresAt: invite.expiresAt,
				childName: `${child.firstName} ${child.lastName}`,
			};
		}),

	/**
	 * Student accepts an invite code during registration.
	 * Links their user account to the child record.
	 */
	acceptStudentInvite: protectedProcedure
		.input(
			z.object({
				code: z.string().min(1).max(20),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Find the invite
			const invite = await ctx.prisma.studentInvite.findUnique({
				where: { code: input.code },
				include: { child: true },
			});

			if (!invite) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid invite code",
				});
			}

			if (invite.usedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This invite code has already been used",
				});
			}

			if (invite.expiresAt < new Date()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This invite code has expired",
				});
			}

			// Check if the child already has a linked user
			if (invite.child.userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This child already has a linked student account",
				});
			}

			// Check if this user is already linked to a child as a student
			const existingChild = await ctx.prisma.child.findUnique({
				where: { userId: ctx.user.id },
			});
			if (existingChild) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Your account is already linked to a student profile",
				});
			}

			// Link the child to the user and mark invite as used
			await ctx.prisma.$transaction([
				ctx.prisma.child.update({
					where: { id: invite.childId },
					data: { userId: ctx.user.id },
				}),
				ctx.prisma.studentInvite.update({
					where: { id: invite.id },
					data: {
						usedAt: new Date(),
						usedBy: ctx.user.id,
					},
				}),
			]);

			return {
				childId: invite.childId,
				childName: `${invite.child.firstName} ${invite.child.lastName}`,
				schoolId: invite.schoolId,
			};
		}),
});
