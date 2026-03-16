import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the AI provider module before importing
vi.mock("../lib/ai-drafting", async (importOriginal) => {
	const original = (await importOriginal()) as any;
	return {
		...original,
		generateDraft: vi.fn(),
	};
});

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

import { generateDraft, checkRateLimit } from "../lib/ai-drafting";
import { appRouter } from "../router";

const allFeatureToggles = {
	messagingEnabled: true,
	paymentsEnabled: true,
	attendanceEnabled: true,
	calendarEnabled: true,
	formsEnabled: true,
	translationEnabled: false,
	parentsEveningEnabled: false,
	wellbeingEnabled: false,
	emergencyCommsEnabled: false,
	analyticsEnabled: false,
	mealBookingEnabled: false,
	clubBookingEnabled: false,
	reportCardsEnabled: false,
	communityHubEnabled: false,
	paymentDinnerMoneyEnabled: true,
	paymentTripsEnabled: true,
	paymentClubsEnabled: true,
	paymentUniformEnabled: true,
	paymentOtherEnabled: true,
	homeworkEnabled: false,
	readingDiaryEnabled: false,
	visitorManagementEnabled: false,
	misIntegrationEnabled: false,
	achievementsEnabled: false,
	galleryEnabled: false,
	progressSummariesEnabled: false,
	liveChatEnabled: false,
	aiDraftingEnabled: true,
	attendanceAlertsEnabled: false,
};

function createTestContext(): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue(allFeatureToggles),
				findUniqueOrThrow: vi.fn().mockResolvedValue({ name: "Test Primary School" }),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
		},
		user: { id: "user-1", name: "Test Staff" },
		session: { id: "session-1" },
	};
}

describe("AI drafting", () => {
	const originalEnv = process.env.AI_SUMMARY_PROVIDER;

	afterEach(() => {
		process.env.AI_SUMMARY_PROVIDER = originalEnv;
		vi.restoreAllMocks();
	});

	it("generates a draft with mocked AI provider", async () => {
		process.env.AI_SUMMARY_PROVIDER = "claude";
		const mockGenerateDraft = vi.mocked(generateDraft);
		mockGenerateDraft.mockResolvedValue(
			"Dear Parents, A reminder about Friday's trip. Please ensure packed lunches are ready.",
		);

		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.messaging.generateDraft({
			schoolId: "school-1",
			prompt: "reminder about friday trip, packed lunch",
			tone: "formal",
		});

		expect(result.draft).toBe(
			"Dear Parents, A reminder about Friday's trip. Please ensure packed lunches are ready.",
		);
	});

	it("returns error when provider is template", async () => {
		process.env.AI_SUMMARY_PROVIDER = "template";

		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.messaging.generateDraft({
				schoolId: "school-1",
				prompt: "reminder about friday trip",
				tone: "formal",
			}),
		).rejects.toThrow("AI drafting is not available when using template provider");
	});

	it("respects rate limit", async () => {
		// checkRateLimit is the real implementation (not mocked)
		const actual = (await vi.importActual("../lib/ai-drafting")) as any;
		const realCheckRateLimit = actual.checkRateLimit;

		// Fill up rate limit for a test user
		const userId = `rate-limit-test-${Date.now()}`;
		for (let i = 0; i < 20; i++) {
			expect(realCheckRateLimit(userId)).toBe(true);
		}
		// 21st call should fail
		expect(realCheckRateLimit(userId)).toBe(false);
	});
});
