import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			formTemplate: {
				findMany: vi.fn().mockResolvedValue([]),
				findUnique: vi.fn().mockResolvedValue(null),
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
		user: { id: "user-1", name: "User", email: "user@example.com" },
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
						findUnique: vi.fn(),
						create: vi.fn(),
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

		it("rejects non-staff user", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.getTemplates({ schoolId: "school-1" }),
			).rejects.toThrow();
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

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.createTemplate({
					schoolId: "school-1",
					title: "Form",
					fields: [{ id: "q1", type: "text", label: "Q", required: true }],
				}),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	describe("getTemplate", () => {
		it("returns a template by ID", async () => {
			const mockTemplate = { id: "t1", title: "Consent Form", fields: [] };
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					formTemplate: {
						findMany: vi.fn(),
						findUnique: vi.fn().mockResolvedValue(mockTemplate),
						create: vi.fn(),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.forms.getTemplate({ templateId: "t1" });

			expect(result).toEqual(mockTemplate);
		});

		it("throws NOT_FOUND if template does not exist", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.getTemplate({ templateId: "nonexistent" }),
			).rejects.toThrow("Template not found");
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.getTemplate({ templateId: "t1" }),
			).rejects.toThrow("UNAUTHORIZED");
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
						findUnique: vi.fn(),
						create: vi.fn(),
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

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.getPendingForms({ childId: "child-1" }),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	describe("getCompletedForms", () => {
		it("returns completed forms for a child", async () => {
			const mockResponses = [
				{ id: "resp-1", templateId: "t1", submittedAt: new Date(), template: { title: "Consent" } },
			];
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({ id: "pc-1" }),
					},
					formResponse: {
						findMany: vi.fn().mockResolvedValue(mockResponses),
						create: vi.fn(),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.forms.getCompletedForms({ childId: "child-1" });

			expect(result).toHaveLength(1);
			expect(result[0].template.title).toBe("Consent");
		});

		it("throws if user is not parent of child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.getCompletedForms({ childId: "child-1" }),
			).rejects.toThrow("You are not a parent of this child");
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.getCompletedForms({ childId: "child-1" }),
			).rejects.toThrow("UNAUTHORIZED");
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

		it("rejects if not parent of child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.submitForm({
					templateId: "t1",
					childId: "other-child",
					data: { q1: "Answer" },
				}),
			).rejects.toThrow("You are not a parent of this child");
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.forms.submitForm({
					templateId: "t1",
					childId: "child-1",
					data: { q1: "Answer" },
				}),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});
});
