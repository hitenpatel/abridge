import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai-report-comments", () => ({
	generateComment: vi
		.fn()
		.mockResolvedValue(
			"Emma has shown excellent progress in Mathematics this term, consistently demonstrating strong problem-solving skills. Her homework completion rate and regular attendance reflect a dedicated approach to learning.",
		),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
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
					reportCardsEnabled: true,
					communityHubEnabled: false,
					homeworkEnabled: true,
					readingDiaryEnabled: true,
					visitorManagementEnabled: false,
					misIntegrationEnabled: false,
					achievementsEnabled: true,
					galleryEnabled: false,
					progressSummariesEnabled: false,
					liveChatEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
					name: "Test School",
				}),
			},
			child: {
				findUnique: vi.fn().mockResolvedValue({
					id: "child-1",
					schoolId: "school-1",
					firstName: "Emma",
					lastName: "Smith",
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "TEACHER",
				}),
			},
		},
		user: { id: "user-1", name: "Test Teacher" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("AI report card comments", () => {
	it("generates a comment with mocked AI", async () => {
		// Set provider to claude so the procedure doesn't short-circuit
		const originalEnv = process.env.AI_SUMMARY_PROVIDER;
		process.env.AI_SUMMARY_PROVIDER = "claude";

		try {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.generateComment({
				schoolId: "school-1",
				childId: "child-1",
				subject: "Mathematics",
				currentGrade: "EXPECTED",
			});

			expect(result.comment).toBeTruthy();
			expect(result.comment).toContain("Mathematics");

			const { generateComment } = await import("../lib/ai-report-comments");
			expect(generateComment).toHaveBeenCalledWith(
				expect.anything(),
				"child-1",
				"Mathematics",
				"EXPECTED",
			);
		} finally {
			process.env.AI_SUMMARY_PROVIDER = originalEnv;
		}
	});

	it("returns null when provider is template mode", async () => {
		const originalEnv = process.env.AI_SUMMARY_PROVIDER;
		process.env.AI_SUMMARY_PROVIDER = "template";

		try {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.generateComment({
				schoolId: "school-1",
				childId: "child-1",
				subject: "English",
			});

			expect(result.comment).toBeNull();
		} finally {
			process.env.AI_SUMMARY_PROVIDER = originalEnv;
		}
	});

	it("includes subject context in the generated comment", async () => {
		const { generateComment } = await import("../lib/ai-report-comments");
		const mockGenerate = generateComment as ReturnType<typeof vi.fn>;
		mockGenerate.mockResolvedValueOnce(
			"Oliver has made steady progress in Science this term, showing particular enthusiasm during practical experiments. His consistent attendance and completion of homework assignments demonstrate a growing confidence in the subject.",
		);

		const originalEnv = process.env.AI_SUMMARY_PROVIDER;
		process.env.AI_SUMMARY_PROVIDER = "claude";

		try {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.reportCard.generateComment({
				schoolId: "school-1",
				childId: "child-1",
				subject: "Science",
			});

			expect(result.comment).toContain("Science");
			expect(mockGenerate).toHaveBeenCalledWith(expect.anything(), "child-1", "Science", undefined);
		} finally {
			process.env.AI_SUMMARY_PROVIDER = originalEnv;
		}
	});
});
