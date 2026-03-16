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
				findUnique: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({ id: "response-1", submittedAt: new Date() }),
				update: vi.fn().mockResolvedValue({ id: "response-1" }),
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
			school: {
				findUnique: vi.fn().mockResolvedValue({
					messagingEnabled: true,
					paymentsEnabled: true,
					attendanceEnabled: true,
					calendarEnabled: true,
					formsEnabled: true,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
			user: {
				findUnique: vi.fn().mockResolvedValue({ language: null }),
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

			await expect(caller.forms.getTemplates({ schoolId: "school-1" })).rejects.toThrow();
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
			const mockTemplate = { id: "t1", title: "Consent Form", fields: [], schoolId: "school-1" };
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					formTemplate: {
						findMany: vi.fn(),
						findUnique: vi.fn().mockResolvedValue(mockTemplate),
						create: vi.fn(),
					},
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findFirst: vi.fn().mockResolvedValue({ id: "pc-1" }),
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

			await expect(caller.forms.getTemplate({ templateId: "nonexistent" })).rejects.toThrow(
				"Template not found",
			);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getTemplate({ templateId: "t1" })).rejects.toThrow("UNAUTHORIZED");
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

			await expect(caller.forms.getPendingForms({ childId: "child-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
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
						findUnique: vi.fn(),
						update: vi.fn(),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.forms.getCompletedForms({ childId: "child-1" });

			expect(result).toHaveLength(1);
			expect(result[0]!.template.title).toBe("Consent");
		});

		it("throws if user is not parent of child", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getCompletedForms({ childId: "child-1" })).rejects.toThrow(
				"You are not a parent of this child",
			);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getCompletedForms({ childId: "child-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});

	describe("submitForm", () => {
		it("submits a form response and generates PDF", async () => {
			const mockTemplate = {
				id: "t1",
				title: "Consent Form",
				schoolId: "school-1",
				fields: [{ id: "q1", type: "text", label: "Child Name" }],
				school: { name: "Test School" },
			};
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({ id: "pc-1" }),
					},
					formTemplate: {
						findMany: vi.fn(),
						findUnique: vi.fn().mockResolvedValue(mockTemplate),
						create: vi.fn(),
					},
					child: {
						findUnique: vi
							.fn()
							.mockResolvedValue({ firstName: "Emma", lastName: "Smith", schoolId: "school-1" }),
					},
					formResponse: {
						findMany: vi.fn(),
						findUnique: vi.fn(),
						create: vi.fn().mockResolvedValue({ id: "response-1", submittedAt: new Date() }),
						update: vi.fn().mockResolvedValue({ id: "response-1" }),
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

			expect(result).toEqual({ id: "response-1", submittedAt: expect.any(Date) });
			expect(ctx.prisma.formResponse.create).toHaveBeenCalledWith({
				data: {
					templateId: "t1",
					childId: "child-1",
					parentId: "user-1",
					data: input.data,
					signature: input.signature,
				},
			});
			// PDF should have been generated and stored
			expect(ctx.prisma.formResponse.update).toHaveBeenCalledWith({
				where: { id: "response-1" },
				data: { pdfData: expect.any(String) },
			});
		});

		it("still returns form even if PDF generation fails", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({ id: "pc-1" }),
					},
					formTemplate: {
						findMany: vi.fn(),
						// Template not found → PDF gen will fail but form still returned
						findUnique: vi.fn().mockResolvedValue(null),
						create: vi.fn(),
					},
					formResponse: {
						findMany: vi.fn(),
						findUnique: vi.fn(),
						create: vi.fn().mockResolvedValue({ id: "response-1", submittedAt: new Date() }),
						update: vi.fn(),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			// Should throw because template not found (before PDF generation)
			await expect(
				caller.forms.submitForm({
					templateId: "t1",
					childId: "child-1",
					data: { q1: "Answer" },
				}),
			).rejects.toThrow("Template not found");
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

	describe("getFormPdf", () => {
		it("returns PDF data for a form response", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					formResponse: {
						findMany: vi.fn(),
						create: vi.fn(),
						update: vi.fn(),
						findUnique: vi.fn().mockResolvedValue({
							id: "resp-1",
							parentId: "user-1",
							pdfData: "base64pdfdata",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.forms.getFormPdf({ responseId: "resp-1" });

			expect(result.pdfData).toBe("base64pdfdata");
		});

		it("throws NOT_FOUND when response does not exist", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getFormPdf({ responseId: "nonexistent" })).rejects.toThrow(
				"Form response not found",
			);
		});

		it("throws FORBIDDEN when user is not the parent who submitted", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					formResponse: {
						findMany: vi.fn(),
						create: vi.fn(),
						update: vi.fn(),
						findUnique: vi.fn().mockResolvedValue({
							id: "resp-1",
							parentId: "other-user",
							pdfData: "base64pdfdata",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getFormPdf({ responseId: "resp-1" })).rejects.toThrow(
				"You do not have access to this form",
			);
		});

		it("throws NOT_FOUND when PDF is not available", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					formResponse: {
						findMany: vi.fn(),
						create: vi.fn(),
						update: vi.fn(),
						findUnique: vi.fn().mockResolvedValue({
							id: "resp-1",
							parentId: "user-1",
							pdfData: null,
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getFormPdf({ responseId: "resp-1" })).rejects.toThrow(
				"PDF not available for this form",
			);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.forms.getFormPdf({ responseId: "resp-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});
});
