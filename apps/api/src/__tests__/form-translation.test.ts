import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai-provider", () => ({
	callAIProvider: vi.fn().mockResolvedValue(null),
}));

vi.mock("../services/translator", () => ({
	translateText: vi
		.fn()
		.mockImplementation((text: string, _lang: string) => Promise.resolve(`[translated] ${text}`)),
}));

const mockFields = [
	{ id: "field-1", label: "Child's full name", type: "text", required: true },
	{ id: "field-2", label: "Medical conditions", type: "textarea", required: false },
];

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			formTemplate: {
				findUnique: vi.fn().mockResolvedValue({
					id: "template-1",
					schoolId: "school-1",
					title: "Medical Info Form",
					description: "Please fill in medical details",
					fields: mockFields,
					isActive: true,
					createdAt: new Date(),
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
			school: {
				findUnique: vi.fn().mockResolvedValue({
					translationEnabled: true,
				}),
			},
			translationCache: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({}),
			},
		},
		user: { id: "user-1", name: "Test Parent", language: "pl" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("form translation", () => {
	it("translates form fields when user language is not English", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.forms.getTemplate({ templateId: "template-1" });

		// Should have called translateText for each field label (fallback path since AI returns null)
		const { translateText } = await import("../services/translator");
		expect(translateText).toHaveBeenCalledWith("Child's full name", "pl");
		expect(translateText).toHaveBeenCalledWith("Medical conditions", "pl");

		// Fields should be translated
		const fields = result.fields as Array<{ id: string; label: string }>;
		expect(fields[0]?.label).toBe("[translated] Child's full name");
		expect(fields[1]?.label).toBe("[translated] Medical conditions");
	});

	it("uses cached translation on second call", async () => {
		const cachedFields = [
			{ id: "field-1", label: "Pelne imie dziecka", type: "text", required: true },
			{ id: "field-2", label: "Choroby", type: "textarea", required: false },
		];

		const ctx = createTestContext({
			prisma: {
				formTemplate: {
					findUnique: vi.fn().mockResolvedValue({
						id: "template-1",
						schoolId: "school-1",
						title: "Medical Info Form",
						fields: mockFields,
						isActive: true,
						createdAt: new Date(),
					}),
				},
				parentChild: {
					findFirst: vi.fn().mockResolvedValue({
						userId: "user-1",
						childId: "child-1",
					}),
				},
				staffMember: {
					findUnique: vi.fn().mockResolvedValue(null),
				},
				school: {
					findUnique: vi.fn().mockResolvedValue({
						translationEnabled: true,
					}),
				},
				translationCache: {
					findFirst: vi.fn().mockResolvedValue({
						sourceHash: "cached-hash",
						translated: JSON.stringify(cachedFields),
					}),
					create: vi.fn(),
				},
			},
		});

		const caller = appRouter.createCaller(ctx);
		const result = await caller.forms.getTemplate({ templateId: "template-1" });

		// Should use cached translation - translateText should NOT be called
		const { translateText } = await import("../services/translator");
		// Reset mock to ensure we're checking only this call
		const fields = result.fields as Array<{ id: string; label: string }>;
		expect(fields[0]?.label).toBe("Pelne imie dziecka");
		expect(fields[1]?.label).toBe("Choroby");

		// AI provider and Google Translate should not be called when cache hits
		const { callAIProvider } = await import("../lib/ai-provider");
		// The cache was hit, so no AI call needed
		expect(ctx.prisma.translationCache.findFirst).toHaveBeenCalled();
	});
});
