import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

const CLUB_DAYS = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
	"SUNDAY",
] as const;

export const clubBookingRouter = router({
	listClubs: protectedProcedure
		.input(
			z.object({
				schoolId: z.string(),
				activeOnly: z.boolean().default(true),
			}),
		)
		.query(async ({ ctx, input }) => {
			return ctx.prisma.club.findMany({
				where: {
					schoolId: input.schoolId,
					...(input.activeOnly ? { isActive: true } : {}),
				},
				include: {
					_count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
				},
				orderBy: [{ day: "asc" }, { startTime: "asc" }],
			});
		}),

	getClub: protectedProcedure
		.input(z.object({ clubId: z.string() }))
		.query(async ({ ctx, input }) => {
			const club = await ctx.prisma.club.findUnique({
				where: { id: input.clubId },
				include: {
					enrollments: {
						where: { status: "ACTIVE" },
						include: {
							child: { select: { id: true, firstName: true, lastName: true, yearGroup: true } },
						},
						orderBy: { createdAt: "asc" },
					},
					_count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
				},
			});

			if (!club) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
			}

			return club;
		}),

	createClub: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				name: z.string().min(1).max(200),
				description: z.string().max(1000).optional(),
				staffLead: z.string().max(200).optional(),
				day: z.enum(CLUB_DAYS),
				startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
				endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
				maxCapacity: z.number().int().min(1).max(500),
				feeInPence: z.number().int().min(0).default(0),
				yearGroups: z.array(z.string()).default([]),
				termStartDate: z.date(),
				termEndDate: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "clubBooking");

			const club = await ctx.prisma.club.create({
				data: {
					schoolId: input.schoolId,
					name: input.name,
					description: input.description,
					staffLead: input.staffLead,
					day: input.day,
					startTime: input.startTime,
					endTime: input.endTime,
					maxCapacity: input.maxCapacity,
					feeInPence: input.feeInPence,
					yearGroups: input.yearGroups,
					termStartDate: input.termStartDate,
					termEndDate: input.termEndDate,
					createdBy: ctx.user.id,
				},
			});

			return { success: true, clubId: club.id };
		}),

	updateClub: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				clubId: z.string(),
				name: z.string().min(1).max(200).optional(),
				description: z.string().max(1000).nullable().optional(),
				staffLead: z.string().max(200).nullable().optional(),
				day: z.enum(CLUB_DAYS).optional(),
				startTime: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.optional(),
				endTime: z
					.string()
					.regex(/^\d{2}:\d{2}$/)
					.optional(),
				maxCapacity: z.number().int().min(1).max(500).optional(),
				feeInPence: z.number().int().min(0).optional(),
				yearGroups: z.array(z.string()).optional(),
				isActive: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "clubBooking");

			const club = await ctx.prisma.club.findUnique({ where: { id: input.clubId } });
			if (!club || club.schoolId !== input.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
			}

			const { schoolId, clubId, ...data } = input;
			await ctx.prisma.club.update({ where: { id: clubId }, data });

			return { success: true };
		}),

	deleteClub: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				clubId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "clubBooking");

			const club = await ctx.prisma.club.findUnique({ where: { id: input.clubId } });
			if (!club || club.schoolId !== input.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
			}

			await ctx.prisma.club.delete({ where: { id: input.clubId } });
			return { success: true };
		}),

	enroll: protectedProcedure
		.input(
			z.object({
				clubId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify parent-child link
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
				include: { child: { select: { schoolId: true, yearGroup: true } } },
			});

			if (!parentChild) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised for this child" });
			}

			const club = await ctx.prisma.club.findUnique({
				where: { id: input.clubId },
				include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
			});

			if (!club || !club.isActive) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Club not found or inactive" });
			}

			if (club.schoolId !== parentChild.child.schoolId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Club is not at child's school" });
			}

			// Check year group restriction
			if (club.yearGroups.length > 0 && parentChild.child.yearGroup) {
				if (!club.yearGroups.includes(parentChild.child.yearGroup)) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "This club is not available for your child's year group",
					});
				}
			}

			// Check capacity
			if (club._count.enrollments >= club.maxCapacity) {
				throw new TRPCError({ code: "CONFLICT", message: "Club is full" });
			}

			// Check for existing enrollment
			const existing = await ctx.prisma.clubEnrollment.findUnique({
				where: { clubId_childId: { clubId: input.clubId, childId: input.childId } },
			});

			if (existing && existing.status === "ACTIVE") {
				throw new TRPCError({ code: "CONFLICT", message: "Child is already enrolled" });
			}

			if (existing) {
				// Re-enroll (previously cancelled)
				await ctx.prisma.clubEnrollment.update({
					where: { id: existing.id },
					data: { status: "ACTIVE", enrolledBy: ctx.user.id },
				});
			} else {
				await ctx.prisma.clubEnrollment.create({
					data: {
						clubId: input.clubId,
						childId: input.childId,
						enrolledBy: ctx.user.id,
					},
				});
			}

			return { success: true };
		}),

	unenroll: protectedProcedure
		.input(
			z.object({
				clubId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify parent-child link
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});

			if (!parentChild) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised for this child" });
			}

			const enrollment = await ctx.prisma.clubEnrollment.findUnique({
				where: { clubId_childId: { clubId: input.clubId, childId: input.childId } },
			});

			if (!enrollment || enrollment.status !== "ACTIVE") {
				throw new TRPCError({ code: "NOT_FOUND", message: "No active enrollment found" });
			}

			await ctx.prisma.clubEnrollment.update({
				where: { id: enrollment.id },
				data: { status: "CANCELLED" },
			});

			return { success: true };
		}),

	getEnrollmentsForChild: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify parent-child link
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});

			if (!parentChild) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised for this child" });
			}

			return ctx.prisma.clubEnrollment.findMany({
				where: { childId: input.childId, status: "ACTIVE" },
				include: {
					club: {
						select: {
							id: true,
							name: true,
							day: true,
							startTime: true,
							endTime: true,
							staffLead: true,
							feeInPence: true,
						},
					},
				},
				orderBy: { createdAt: "asc" },
			});
		}),
});
