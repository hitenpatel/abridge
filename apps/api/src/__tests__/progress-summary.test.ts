import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			messages: {
				create: vi.fn().mockResolvedValue({
					content: [{ type: "text", text: "Great progress on reading this week!" }],
				}),
			},
		})),
	};
});

import {
	type ChildWeeklyMetrics,
	gatherChildMetrics,
	generateInsight,
	generateWeeklySummary,
	renderTemplateSummary,
} from "../lib/progress-summary";

function createMockPrisma(overrides?: Record<string, any>): any {
	return {
		child: {
			findUniqueOrThrow: vi.fn().mockResolvedValue({
				firstName: "Emma",
				lastName: "Smith",
				schoolId: "school-1",
				yearGroup: "Year 3",
			}),
		},
		attendanceRecord: {
			findMany: vi.fn().mockResolvedValue([
				{ date: new Date("2026-03-09"), mark: "PRESENT", session: "AM", note: null },
				{ date: new Date("2026-03-09"), mark: "PRESENT", session: "PM", note: null },
				{ date: new Date("2026-03-10"), mark: "PRESENT", session: "AM", note: null },
				{ date: new Date("2026-03-10"), mark: "PRESENT", session: "PM", note: null },
				{ date: new Date("2026-03-11"), mark: "PRESENT", session: "AM", note: null },
				{ date: new Date("2026-03-11"), mark: "PRESENT", session: "PM", note: null },
				{ date: new Date("2026-03-12"), mark: "PRESENT", session: "AM", note: null },
				{ date: new Date("2026-03-12"), mark: "PRESENT", session: "PM", note: "late" },
			]),
		},
		homeworkAssignment: {
			findMany: vi.fn().mockResolvedValue([
				{ id: "hw-1", dueDate: new Date("2026-03-11") },
				{ id: "hw-2", dueDate: new Date("2026-03-13") },
			]),
		},
		homeworkCompletion: {
			findMany: vi.fn().mockResolvedValue([
				{
					assignmentId: "hw-1",
					childId: "child-1",
					status: "COMPLETED",
					assignment: { id: "hw-1", dueDate: new Date("2026-03-11") },
				},
			]),
		},
		readingDiary: {
			findUnique: vi.fn().mockResolvedValue({
				id: "diary-1",
				currentBook: "Charlotte's Web",
			}),
		},
		readingEntry: {
			findMany: vi.fn().mockResolvedValue([
				{ date: new Date("2026-03-09"), minutesRead: 20, diaryId: "diary-1" },
				{ date: new Date("2026-03-10"), minutesRead: 15, diaryId: "diary-1" },
				{ date: new Date("2026-03-11"), minutesRead: 25, diaryId: "diary-1" },
			]),
		},
		achievement: {
			findMany: vi.fn().mockResolvedValue([
				{ points: 10, category: { name: "Star of the Week" } },
				{ points: 5, category: { name: "Kindness" } },
			]),
		},
		wellbeingCheckIn: {
			findMany: vi
				.fn()
				.mockResolvedValueOnce([
					{ mood: "GOOD", date: new Date("2026-03-09") },
					{ mood: "GREAT", date: new Date("2026-03-11") },
				])
				.mockResolvedValueOnce([{ mood: "OK", date: new Date("2026-03-02") }]),
		},
		progressSummary: {
			upsert: vi.fn().mockResolvedValue({
				id: "summary-1",
				summary: "test summary",
			}),
		},
		...overrides,
	};
}

function createFullMetrics(): ChildWeeklyMetrics {
	return {
		childName: "Emma Smith",
		weekStart: new Date("2026-03-09"),
		attendance: { percentage: 100, daysPresent: 4, daysTotal: 4, lateCount: 1 },
		homework: { completed: 3, total: 4, overdue: 1 },
		reading: {
			daysRead: 4,
			totalMinutes: 72,
			avgMinutes: 18,
			currentStreak: 3,
			currentBook: "Charlotte's Web",
		},
		achievements: {
			pointsEarned: 15,
			awardsReceived: 2,
			categories: ["Star of the Week", "Kindness"],
		},
		wellbeing: { avgMood: "GOOD", checkInCount: 3, trend: "stable" },
	};
}

describe("progress summary service", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("gatherChildMetrics returns correct metrics structure", async () => {
		const prisma = createMockPrisma();
		const weekStart = new Date("2026-03-09");
		const weekEnd = new Date("2026-03-16");

		const metrics = await gatherChildMetrics(prisma, "child-1", weekStart, weekEnd);

		expect(metrics.childName).toBe("Emma Smith");
		expect(metrics.weekStart).toEqual(weekStart);
		expect(metrics.attendance).toHaveProperty("percentage");
		expect(metrics.attendance).toHaveProperty("daysPresent");
		expect(metrics.attendance).toHaveProperty("daysTotal");
		expect(metrics.attendance).toHaveProperty("lateCount");
		expect(metrics.homework).toHaveProperty("completed");
		expect(metrics.homework).toHaveProperty("total");
		expect(metrics.homework).toHaveProperty("overdue");
		expect(metrics.reading).toHaveProperty("daysRead");
		expect(metrics.reading).toHaveProperty("currentBook");
		expect(metrics.achievements).toHaveProperty("pointsEarned");
		expect(metrics.achievements).toHaveProperty("awardsReceived");
		expect(metrics.wellbeing).toHaveProperty("avgMood");
		expect(metrics.wellbeing).toHaveProperty("checkInCount");

		// Verify Prisma calls
		expect(prisma.child.findUniqueOrThrow).toHaveBeenCalledWith({
			where: { id: "child-1" },
			select: { firstName: true, lastName: true, schoolId: true, yearGroup: true },
		});
		expect(prisma.attendanceRecord.findMany).toHaveBeenCalled();
		expect(prisma.homeworkAssignment.findMany).toHaveBeenCalled();
		expect(prisma.achievement.findMany).toHaveBeenCalled();
	});

	it("renderTemplateSummary produces expected text with full data", () => {
		const metrics = createFullMetrics();
		const text = renderTemplateSummary(metrics);

		expect(text).toContain("Attendance: 100% (4/4 days, 1 late).");
		expect(text).toContain("Homework: completed 3 of 4 assignments (1 overdue).");
		expect(text).toContain(
			'Reading: read 4 days this week (avg 18 min/day, 3-day streak). Currently reading "Charlotte\'s Web".',
		);
		expect(text).toContain("Achievements: earned 15 points — Star of the Week, Kindness.");
		expect(text).toContain("Wellbeing: mood average GOOD, stable trend.");
	});

	it("renderTemplateSummary omits empty sections", () => {
		const metrics = createFullMetrics();
		metrics.homework = { completed: 0, total: 0, overdue: 0 };
		metrics.reading = {
			daysRead: 0,
			totalMinutes: 0,
			avgMinutes: 0,
			currentStreak: 0,
			currentBook: null,
		};
		metrics.achievements = { pointsEarned: 0, awardsReceived: 0, categories: [] };
		metrics.wellbeing = { avgMood: null, checkInCount: 0, trend: null };

		const text = renderTemplateSummary(metrics);

		expect(text).toContain("Attendance:");
		expect(text).not.toContain("Homework:");
		expect(text).not.toContain("Reading:");
		expect(text).not.toContain("Achievements:");
		expect(text).not.toContain("Wellbeing:");
	});

	it("generateInsight returns null when AI_SUMMARY_PROVIDER is not claude", async () => {
		process.env.AI_SUMMARY_PROVIDER = "template";
		const metrics = createFullMetrics();
		const result = await generateInsight(metrics);
		expect(result).toBeNull();
	});

	it("generateWeeklySummary orchestrates metrics, template, AI and upserts", async () => {
		process.env.AI_SUMMARY_PROVIDER = "claude";
		process.env.ANTHROPIC_API_KEY = "test-key";

		const prisma = createMockPrisma();
		const weekStart = new Date("2026-03-09");

		const result = await generateWeeklySummary(prisma, "child-1", weekStart);

		expect(result).toHaveProperty("id");
		expect(result).toHaveProperty("summary");
		expect(prisma.progressSummary.upsert).toHaveBeenCalled();

		// Verify the upsert was called with correct structure
		const upsertCall = prisma.progressSummary.upsert.mock.calls[0][0];
		expect(upsertCall.where).toEqual({
			childId_weekStart: { childId: "child-1", weekStart },
		});
		expect(upsertCall.create).toHaveProperty("schoolId", "school-1");
		expect(upsertCall.create).toHaveProperty("childId", "child-1");
		expect(upsertCall.create).toHaveProperty("summary");
		expect(upsertCall.create).toHaveProperty("templateData");
	});
});
