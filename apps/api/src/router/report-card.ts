import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateComment as generateAIComment } from "../lib/ai-report-comments";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { generateReportPdf } from "../lib/report-pdf";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const reportCardRouter = router({
	createCycle: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				name: z.string().min(1).max(100),
				type: z.enum(["TERMLY", "HALF_TERMLY", "END_OF_YEAR", "MOCK", "CUSTOM"]),
				assessmentModel: z.enum(["PRIMARY_DESCRIPTIVE", "SECONDARY_GRADES"]),
				publishDate: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			return ctx.prisma.reportCycle.create({
				data: {
					schoolId: input.schoolId,
					name: input.name,
					type: input.type,
					assessmentModel: input.assessmentModel,
					publishDate: input.publishDate,
					createdBy: ctx.user.id,
				},
			});
		}),

	listCycles: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			return ctx.prisma.reportCycle.findMany({
				where: { schoolId: input.schoolId },
				orderBy: { publishDate: "desc" },
				include: { _count: { select: { reportCards: true } } },
			});
		}),

	publishCycle: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				cycleId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			const cycle = await ctx.prisma.reportCycle.findUnique({
				where: { id: input.cycleId },
			});

			if (!cycle || cycle.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report cycle not found",
				});
			}

			if (cycle.status === "PUBLISHED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cycle is already published",
				});
			}

			return ctx.prisma.reportCycle.update({
				where: { id: input.cycleId },
				data: { status: "PUBLISHED" },
			});
		}),

	archiveCycle: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				cycleId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			const cycle = await ctx.prisma.reportCycle.findUnique({
				where: { id: input.cycleId },
			});

			if (!cycle || cycle.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report cycle not found",
				});
			}

			if (cycle.status !== "PUBLISHED") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Only published cycles can be archived",
				});
			}

			return ctx.prisma.reportCycle.update({
				where: { id: input.cycleId },
				data: { status: "ARCHIVED" },
			});
		}),

	saveGrades: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				cycleId: z.string(),
				childId: z.string(),
				generalComment: z.string().max(1000).optional(),
				attendancePct: z.number().min(0).max(100).optional(),
				grades: z.array(
					z.object({
						subject: z.string().min(1),
						sortOrder: z.number().int().default(0),
						level: z.enum(["EMERGING", "DEVELOPING", "EXPECTED", "EXCEEDING"]).optional(),
						effort: z.enum(["OUTSTANDING", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT"]).optional(),
						currentGrade: z.string().max(10).optional(),
						targetGrade: z.string().max(10).optional(),
						comment: z.string().max(500).optional(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			const reportCard = await ctx.prisma.reportCard.upsert({
				where: {
					cycleId_childId: {
						cycleId: input.cycleId,
						childId: input.childId,
					},
				},
				update: {
					generalComment: input.generalComment ?? null,
					attendancePct: input.attendancePct ?? null,
				},
				create: {
					cycleId: input.cycleId,
					childId: input.childId,
					schoolId: input.schoolId,
					generalComment: input.generalComment ?? null,
					attendancePct: input.attendancePct ?? null,
				},
			});

			// Replace all grades (delete + recreate)
			await ctx.prisma.subjectGrade.deleteMany({
				where: { reportCardId: reportCard.id },
			});

			if (input.grades.length > 0) {
				await ctx.prisma.subjectGrade.createMany({
					data: input.grades.map((g) => ({
						reportCardId: reportCard.id,
						subject: g.subject,
						sortOrder: g.sortOrder,
						level: g.level ?? null,
						effort: g.effort ?? null,
						currentGrade: g.currentGrade ?? null,
						targetGrade: g.targetGrade ?? null,
						comment: g.comment ?? null,
					})),
				});
			}

			return reportCard;
		}),

	getReportCard: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				cycleId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify access
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});

			if (!parentChild) {
				const child = await ctx.prisma.child.findUnique({
					where: { id: input.childId },
				});
				if (child) {
					const staff = await ctx.prisma.staffMember.findUnique({
						where: {
							userId_schoolId: {
								userId: ctx.user.id,
								schoolId: child.schoolId,
							},
						},
					});
					if (!staff) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "No access to this child's reports",
						});
					}
				}
			}

			return ctx.prisma.reportCard.findUnique({
				where: {
					cycleId_childId: {
						cycleId: input.cycleId,
						childId: input.childId,
					},
				},
				include: {
					subjectGrades: { orderBy: { sortOrder: "asc" } },
					child: {
						select: {
							firstName: true,
							lastName: true,
							yearGroup: true,
							className: true,
						},
					},
					cycle: {
						select: {
							name: true,
							type: true,
							assessmentModel: true,
							publishDate: true,
						},
					},
				},
			});
		}),

	listReportsForChild: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});

			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			return ctx.prisma.reportCard.findMany({
				where: {
					childId: input.childId,
					cycle: { status: "PUBLISHED" },
				},
				orderBy: { cycle: { publishDate: "desc" } },
				include: {
					cycle: {
						select: {
							id: true,
							name: true,
							type: true,
							assessmentModel: true,
							publishDate: true,
						},
					},
					subjectGrades: { orderBy: { sortOrder: "asc" } },
				},
			});
		}),

	getChildrenForCycle: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				cycleId: z.string(),
				yearGroup: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			const children = await ctx.prisma.child.findMany({
				where: {
					schoolId: input.schoolId,
					...(input.yearGroup ? { yearGroup: input.yearGroup } : {}),
				},
				orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
				include: {
					reportCards: {
						where: { cycleId: input.cycleId },
						include: { _count: { select: { subjectGrades: true } } },
					},
				},
			});

			return children.map((child) => ({
				id: child.id,
				firstName: child.firstName,
				lastName: child.lastName,
				yearGroup: child.yearGroup,
				hasReport: child.reportCards.length > 0,
				gradeCount: child.reportCards[0]?._count.subjectGrades ?? 0,
			}));
		}),

	generatePdf: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				cycleId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify access (same as getReportCard)
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});

			if (!parentChild) {
				const child = await ctx.prisma.child.findUnique({
					where: { id: input.childId },
				});
				if (child) {
					const staff = await ctx.prisma.staffMember.findUnique({
						where: {
							userId_schoolId: {
								userId: ctx.user.id,
								schoolId: child.schoolId,
							},
						},
					});
					if (!staff) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "No access",
						});
					}
				}
			}

			const reportCard = await ctx.prisma.reportCard.findUnique({
				where: {
					cycleId_childId: {
						cycleId: input.cycleId,
						childId: input.childId,
					},
				},
				include: {
					subjectGrades: { orderBy: { sortOrder: "asc" } },
					child: {
						select: {
							firstName: true,
							lastName: true,
							yearGroup: true,
							className: true,
						},
					},
					cycle: {
						select: {
							name: true,
							assessmentModel: true,
							publishDate: true,
						},
					},
					school: {
						select: {
							name: true,
							brandColor: true,
							secondaryColor: true,
							schoolMotto: true,
							brandFont: true,
						},
					},
				},
			});

			if (!reportCard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Report card not found",
				});
			}

			const pdfBuffer = await generateReportPdf({
				schoolName: reportCard.school.name,
				schoolMotto: reportCard.school.schoolMotto,
				brandColor: reportCard.school.brandColor ?? "#1E3A5F",
				secondaryColor: reportCard.school.secondaryColor,
				brandFont: reportCard.school.brandFont ?? "DEFAULT",
				childName: `${reportCard.child.firstName} ${reportCard.child.lastName}`,
				yearGroup: reportCard.child.yearGroup ?? "",
				className: reportCard.child.className,
				cycleName: reportCard.cycle.name,
				publishDate: reportCard.cycle.publishDate.toLocaleDateString("en-GB"),
				attendancePct: reportCard.attendancePct,
				assessmentModel: reportCard.cycle.assessmentModel,
				generalComment: reportCard.generalComment,
				grades: reportCard.subjectGrades.map((g) => ({
					subject: g.subject,
					level: g.level,
					effort: g.effort,
					currentGrade: g.currentGrade,
					targetGrade: g.targetGrade,
					comment: g.comment,
				})),
			});

			return {
				pdf: pdfBuffer.toString("base64"),
				filename: `Report-${reportCard.child.firstName}-${reportCard.child.lastName}-${reportCard.cycle.name.replace(/\s+/g, "-")}.pdf`,
			};
		}),

	generateComment: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
				subject: z.string().min(1).max(100),
				currentGrade: z.string().max(50).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "reportCards");

			// Verify the child belongs to this school
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
				select: { schoolId: true },
			});

			if (!child || child.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found in this school",
				});
			}

			// Check AI provider is configured
			const provider = process.env.AI_SUMMARY_PROVIDER || "template";
			if (provider === "template" || provider === "none") {
				return { comment: null };
			}

			const comment = await generateAIComment(
				ctx.prisma,
				input.childId,
				input.subject,
				input.currentGrade,
			);

			return { comment };
		}),
});
