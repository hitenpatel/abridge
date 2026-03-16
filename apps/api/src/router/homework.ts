import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const homeworkRouter = router({
	setHomework: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				subject: z.string().min(1).max(100),
				title: z.string().min(1).max(200),
				description: z.string().max(2000).optional(),
				yearGroup: z.string().min(1).max(50),
				className: z.string().max(100).optional(),
				setDate: z.date(),
				dueDate: z.date(),
				attachmentUrls: z.array(z.string().url().max(2000)).max(10).default([]),
				isReadingTask: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "homework");

			return ctx.prisma.homeworkAssignment.create({
				data: {
					schoolId: input.schoolId,
					setBy: ctx.user.id,
					subject: input.subject,
					title: input.title,
					description: input.description ?? null,
					yearGroup: input.yearGroup,
					className: input.className ?? null,
					setDate: input.setDate,
					dueDate: input.dueDate,
					attachmentUrls: input.attachmentUrls,
					isReadingTask: input.isReadingTask,
				},
			});
		}),

	listForChild: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				cursor: z.string().optional(),
				limit: z.number().min(1).max(50).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
			});
			if (!child) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found",
				});
			}

			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			const assignments = await ctx.prisma.homeworkAssignment.findMany({
				where: {
					schoolId: child.schoolId,
					yearGroup: child.yearGroup ?? undefined,
					status: "ACTIVE",
				},
				orderBy: { dueDate: "desc" },
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
				include: {
					completions: {
						where: { childId: input.childId },
					},
				},
			});

			let nextCursor: string | undefined;
			if (assignments.length > input.limit) {
				const next = assignments.pop();
				nextCursor = next?.id;
			}

			return { assignments, nextCursor };
		}),

	listForTeacher: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "homework");

			return ctx.prisma.homeworkAssignment.findMany({
				where: {
					schoolId: input.schoolId,
					setBy: ctx.user.id,
				},
				orderBy: { dueDate: "desc" },
				include: {
					_count: { select: { completions: true } },
				},
			});
		}),

	markComplete: protectedProcedure
		.input(
			z.object({
				assignmentId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			return ctx.prisma.homeworkCompletion.upsert({
				where: {
					assignmentId_childId: {
						assignmentId: input.assignmentId,
						childId: input.childId,
					},
				},
				update: {
					status: "COMPLETED",
					completedAt: new Date(),
					markedBy: "PARENT",
				},
				create: {
					assignmentId: input.assignmentId,
					childId: input.childId,
					status: "COMPLETED",
					completedAt: new Date(),
					markedBy: "PARENT",
				},
			});
		}),

	markInProgress: protectedProcedure
		.input(
			z.object({
				assignmentId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			return ctx.prisma.homeworkCompletion.upsert({
				where: {
					assignmentId_childId: {
						assignmentId: input.assignmentId,
						childId: input.childId,
					},
				},
				update: {
					status: "IN_PROGRESS",
				},
				create: {
					assignmentId: input.assignmentId,
					childId: input.childId,
					status: "IN_PROGRESS",
				},
			});
		}),

	gradeHomework: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				completionId: z.string(),
				grade: z.string().min(1).max(10),
				feedback: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "homework");

			const completion = await ctx.prisma.homeworkCompletion.findUnique({
				where: { id: input.completionId },
				include: { assignment: { select: { schoolId: true } } },
			});
			if (!completion || completion.assignment.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Completion not found",
				});
			}

			return ctx.prisma.homeworkCompletion.update({
				where: { id: input.completionId },
				data: {
					grade: input.grade,
					feedback: input.feedback ?? null,
					gradedBy: ctx.user.id,
					gradedAt: new Date(),
				},
			});
		}),

	bulkGrade: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				assignmentId: z.string(),
				grades: z
					.array(
						z.object({
							childId: z.string(),
							grade: z.string().min(1).max(10),
							feedback: z.string().max(500).optional(),
						}),
					)
					.max(100),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "homework");

			return ctx.prisma.$transaction(
				input.grades.map((g) =>
					ctx.prisma.homeworkCompletion.upsert({
						where: {
							assignmentId_childId: {
								assignmentId: input.assignmentId,
								childId: g.childId,
							},
						},
						update: {
							grade: g.grade,
							feedback: g.feedback ?? null,
							gradedBy: ctx.user.id,
							gradedAt: new Date(),
						},
						create: {
							assignmentId: input.assignmentId,
							childId: g.childId,
							status: "COMPLETED",
							grade: g.grade,
							feedback: g.feedback ?? null,
							gradedBy: ctx.user.id,
							gradedAt: new Date(),
						},
					}),
				),
			);
		}),

	cancelHomework: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				assignmentId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "homework");

			const assignment = await ctx.prisma.homeworkAssignment.findUnique({
				where: { id: input.assignmentId },
			});
			if (!assignment || assignment.schoolId !== input.schoolId) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assignment not found",
				});
			}

			return ctx.prisma.homeworkAssignment.update({
				where: { id: input.assignmentId },
				data: { status: "CANCELLED" },
			});
		}),
});
