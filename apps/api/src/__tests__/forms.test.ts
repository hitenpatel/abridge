import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			formTemplate: {
				findMany: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue({ id: "template-1" }),
			},
			formResponse: {
				findMany: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue({ id: "response-1" }),
			},
			parentChild: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
			child: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
		},
		req: {},
		res: {},
		user: { id: "user-1", name: "User" },
		session: {},
		...overrides,
	};
}

describe("forms router", () => {
	describe("getTemplates", () => {
		it("returns templates for a school", async () => {
			const mockTemplates = [{ id: "t1", title: "Form 1" }];
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN" }),
					},
					formTemplate: {
						findMany: vi.fn().mockResolvedValue(mockTemplates),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.forms.getTemplates({ schoolId: "school-1" });

			expect(result).toEqual(mockTemplates);
			expect(ctx.prisma.formTemplate.findMany).toHaveBeenCalledWith({
				where: { schoolId: "school-1" },
				orderBy: { createdAt: "desc" },
			});
		});
	});

	describe("createTemplate", () => {
		it("creates a new template", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ id: "staff-1", role: "ADMIN" }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const input = {
				schoolId: "school-1",
				title: "Consent Form",
				description: "Please sign this",
				fields: [{ id: "q1", type: "text", label: "Name", required: true }],
			};

			const result = await caller.forms.createTemplate(input);

			expect(result).toEqual({ id: "template-1" });
			expect(ctx.prisma.formTemplate.create).toHaveBeenCalledWith({
				data: {
					schoolId: "school-1",
					title: input.title,
					description: input.description,
					fields: input.fields,
				},
			});
		});
	});

	describe("getPendingForms", () => {
		it("returns pending forms for a child", async () => {
			const mockTemplates = [{ id: "t1", title: "Form 1" }];
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({ id: "pc-1" }),
					},
					child: {
						findUnique: vi.fn().mockResolvedValue({ id: "child-1", schoolId: "school-1" }),
					},
					formTemplate: {
						findMany: vi.fn().mockResolvedValue(mockTemplates),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.forms.getPendingForms({ childId: "child-1" });

			expect(result).toEqual(mockTemplates);
		});

		it("throws error if user is not parent of child", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getPendingForms({ childId: "child-1" })).rejects.toThrow(
				"You are not a parent of this child",
			);
		});
	});

	describe("submitForm", () => {
		it("submits a form response", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({ id: "pc-1" }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const input = {
				templateId: "t1",
				childId: "child-1",
				data: { q1: "Answer" },
				signature: "base64-sig",
			};

			const result = await caller.forms.submitForm(input);

			expect(result).toEqual({ id: "response-1" });
			expect(ctx.prisma.formResponse.create).toHaveBeenCalledWith({
				data: {
					templateId: "t1",
					childId: "child-1",
					parentId: "user-1",
					data: input.data,
					signature: input.signature,
				},
			});
		});
	});
});
