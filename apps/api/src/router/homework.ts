import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateHint } from "../lib/ai-homework-hints";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { getPresignedUploadUrl } from "../lib/s3";
import { isParentOrStudentOfChild } from "../lib/student-auth";
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

			const hasAccess = await isParentOrStudentOfChild(ctx.prisma, ctx.user.id, input.childId);
			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorised to view this child's homework",
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
				attachmentUrl: z.string().url().max(2000).optional(),
				attachmentName: z.string().max(255).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const hasAccess = await isParentOrStudentOfChild(ctx.prisma, ctx.user.id, input.childId);
			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorised to mark this child's homework",
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
					...(input.attachmentUrl !== undefined && { attachmentUrl: input.attachmentUrl }),
					...(input.attachmentName !== undefined && { attachmentName: input.attachmentName }),
				},
				create: {
					assignmentId: input.assignmentId,
					childId: input.childId,
					status: "COMPLETED",
					completedAt: new Date(),
					markedBy: "PARENT",
					attachmentUrl: input.attachmentUrl ?? null,
					attachmentName: input.attachmentName ?? null,
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
			const hasAccess = await isParentOrStudentOfChild(ctx.prisma, ctx.user.id, input.childId);
			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorised to update this child's homework",
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

	getSubmissionUploadUrl: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				filename: z.string().min(1).max(255),
				contentType: z.string().min(1).max(127),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const hasAccess = await isParentOrStudentOfChild(ctx.prisma, ctx.user.id, input.childId);
			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorised to upload for this child",
				});
			}

			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
				select: { schoolId: true },
			});
			if (!child) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });
			}

			const allowedTypes = [
				"image/jpeg",
				"image/png",
				"image/webp",
				"application/pdf",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			];
			if (!allowedTypes.includes(input.contentType)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "File type not allowed. Permitted types: images, PDF, Word documents.",
				});
			}

			return getPresignedUploadUrl({
				schoolId: child.schoolId,
				filename: input.filename,
				contentType: input.contentType,
			});
		}),

	getSubmissions: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				assignmentId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "homework");

			const assignment = await ctx.prisma.homeworkAssignment.findUnique({
				where: { id: input.assignmentId },
				select: { schoolId: true, setBy: true },
			});
			if (!assignment || assignment.schoolId !== input.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
			}

			return ctx.prisma.homeworkCompletion.findMany({
				where: { assignmentId: input.assignmentId },
				include: {
					child: {
						select: { id: true, firstName: true, lastName: true, yearGroup: true },
					},
				},
				orderBy: { completedAt: "desc" },
			});
		}),

	getHint: protectedProcedure
		.input(
			z.object({
				assignmentId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify parent-child or student relationship
			const hasAccess = await isParentOrStudentOfChild(ctx.prisma, ctx.user.id, input.childId);
			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not authorised to get hints for this child",
				});
			}

			// Get assignment details
			const assignment = await ctx.prisma.homeworkAssignment.findUnique({
				where: { id: input.assignmentId },
			});
			if (!assignment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Assignment not found",
				});
			}

			// Get or create completion record to track hint count
			let completion = await ctx.prisma.homeworkCompletion.findUnique({
				where: {
					assignmentId_childId: {
						assignmentId: input.assignmentId,
						childId: input.childId,
					},
				},
			});

			if (!completion) {
				completion = await ctx.prisma.homeworkCompletion.create({
					data: {
						assignmentId: input.assignmentId,
						childId: input.childId,
						status: "NOT_STARTED",
						hintCount: 0,
					},
				});
			}

			// Check hint limit (max 3 per assignment per child)
			if (completion.hintCount >= 3) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Maximum hints reached for this assignment (3 of 3 used)",
				});
			}

			// Get child's year group for age-appropriate hints
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
				select: { yearGroup: true },
			});

			// Generate hint via AI
			const hint = await generateHint(
				assignment.title,
				assignment.description,
				assignment.subject,
				child?.yearGroup ?? "Year 4",
			);

			// Increment hint count
			await ctx.prisma.homeworkCompletion.update({
				where: { id: completion.id },
				data: { hintCount: completion.hintCount + 1 },
			});

			return {
				hint,
				hintsUsed: completion.hintCount + 1,
				hintsRemaining: 2 - completion.hintCount,
			};
		}),
});
