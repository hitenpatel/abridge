import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, schoolStaffProcedure } from "../trpc";

const fieldSchema = z.object({
	id: z.string(),
	type: z.string(), // simplified for now, can be enum later
	label: z.string(),
	required: z.boolean(),
	options: z.array(z.string()).optional(),
});

export const formsRouter = router({
	getTemplates: schoolStaffProcedure.query(async ({ ctx, input }) => {
		return ctx.prisma.formTemplate.findMany({
			where: { schoolId: input.schoolId },
			orderBy: { createdAt: "desc" },
		});
	}),

	createTemplate: schoolStaffProcedure
		.input(
			z.object({
				title: z.string(),
				description: z.string().optional(),
				fields: z.array(fieldSchema),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.formTemplate.create({
				data: {
					schoolId: input.schoolId,
					title: input.title,
					description: input.description,
					fields: input.fields as Prisma.InputJsonValue, // Prisma Json type
				},
			});
		}),

	getTemplate: protectedProcedure
		.input(z.object({ templateId: z.string() }))
		.query(async ({ ctx, input }) => {
			const template = await ctx.prisma.formTemplate.findUnique({
				where: { id: input.templateId },
			});

			if (!template) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Template not found",
				});
			}

			return template;
		}),

	getPendingForms: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify parent owns child
			const ownership = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: {
						userId: ctx.user.id,
						childId: input.childId,
					},
				},
			});

			if (!ownership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a parent of this child",
				});
			}

			// Get child's school
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
				select: { schoolId: true },
			});

			if (!child) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found",
				});
			}

			// Find templates for school that haven't been responded to for this child
			return ctx.prisma.formTemplate.findMany({
				where: {
					schoolId: child.schoolId,
					isActive: true,
					responses: {
						none: {
							childId: input.childId,
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});
		}),

	getCompletedForms: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify parent owns child
			const ownership = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: {
						userId: ctx.user.id,
						childId: input.childId,
					},
				},
			});

			if (!ownership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a parent of this child",
				});
			}

			return ctx.prisma.formResponse.findMany({
				where: {
					childId: input.childId,
					parentId: ctx.user.id,
				},
				include: {
					template: true,
				},
				orderBy: { submittedAt: "desc" },
			});
		}),

	submitForm: protectedProcedure
		.input(
			z.object({
				templateId: z.string(),
				childId: z.string(),
				data: z.record(z.any()),
				signature: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify parent owns child
			const ownership = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: {
						userId: ctx.user.id,
						childId: input.childId,
					},
				},
			});

			if (!ownership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a parent of this child",
				});
			}

			const form = await ctx.prisma.formResponse.create({
				data: {
					templateId: input.templateId,
					childId: input.childId,
					parentId: ctx.user.id,
					data: input.data,
					signature: input.signature,
				},
			});

			console.log("Generating PDF for form", form.id);
			console.log("Emailing receipt to", ctx.user.email);

			return form;
		}),
});
