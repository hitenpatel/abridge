import { describe, expect, it, vi } from "vitest";
import { readingDiaryRouter } from "../router/reading-diary";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
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
					reportCardsEnabled: false,
					communityHubEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
					readingDiaryEnabled: true,
					homeworkEnabled: false,
					visitorManagementEnabled: false,
					misIntegrationEnabled: false,
				}),
			},
			readingDiary: {
				upsert: vi.fn().mockResolvedValue({
					id: "diary-1",
					childId: "child-1",
					schoolId: "school-1",
				}),
				findUnique: vi.fn().mockResolvedValue({
					id: "diary-1",
					childId: "child-1",
					schoolId: "school-1",
					currentBook: "Charlotte's Web",
					readingLevel: "White",
					targetMinsPerDay: 15,
					createdAt: new Date(),
					updatedAt: new Date(),
					entries: [
						{
							id: "entry-1",
							date: new Date(),
							bookTitle: "Charlotte's Web",
							minutesRead: 20,
							readWith: "PARENT",
							entryBy: "PARENT",
						},
					],
				}),
				update: vi.fn().mockResolvedValue({
					id: "diary-1",
					currentBook: "Matilda",
					readingLevel: "Lime",
					targetMinsPerDay: 20,
				}),
			},
			readingEntry: {
				create: vi.fn().mockResolvedValue({
					id: "entry-1",
					diaryId: "diary-1",
					date: new Date("2026-03-10"),
					bookTitle: "Charlotte's Web",
					readWith: "PARENT",
					entryBy: "PARENT",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "entry-1",
						date: new Date("2026-03-10"),
						bookTitle: "Charlotte's Web",
						minutesRead: 20,
						readWith: "PARENT",
						entryBy: "PARENT",
					},
				]),
				update: vi.fn().mockResolvedValue({
					id: "entry-1",
					teacherComment: "Great reading!",
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
				}),
			},
			child: {
				findUnique: vi.fn().mockResolvedValue({
					id: "child-1",
					schoolId: "school-1",
					firstName: "Test",
					lastName: "Child",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "child-1",
						firstName: "Test",
						lastName: "Child",
						schoolId: "school-1",
						readingDiary: {
							readingLevel: "White",
							entries: [
								{
									date: new Date(),
									minutesRead: 20,
								},
							],
						},
					},
				]),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("reading diary router", () => {
	describe("logReading", () => {
		it("creates diary and entry for parent", async () => {
			const ctx = createTestContext();
			const caller = readingDiaryRouter.createCaller(ctx);

			const result = await caller.logReading({
				childId: "child-1",
				date: new Date("2026-03-10"),
				bookTitle: "Charlotte's Web",
				pagesOrChapter: "Chapter 3",
				minutesRead: 20,
				readWith: "PARENT",
				parentComment: "Read well today",
			});

			expect(result).toHaveProperty("id");
			expect(ctx.prisma.readingDiary.upsert).toHaveBeenCalled();
			expect(ctx.prisma.readingEntry.create).toHaveBeenCalled();
		});
	});

	describe("getEntries", () => {
		it("returns entries in date range", async () => {
			const ctx = createTestContext();
			const caller = readingDiaryRouter.createCaller(ctx);

			const result = await caller.getEntries({
				childId: "child-1",
				startDate: new Date("2026-03-01"),
				endDate: new Date("2026-03-31"),
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("addTeacherComment", () => {
		it("updates entry with teacher comment", async () => {
			const ctx = createTestContext();
			const caller = readingDiaryRouter.createCaller(ctx);

			const result = await caller.addTeacherComment({
				schoolId: "school-1",
				entryId: "entry-1",
				teacherComment: "Great reading!",
			});

			expect(result.teacherComment).toBe("Great reading!");
			expect(ctx.prisma.readingEntry.update).toHaveBeenCalled();
		});
	});

	describe("getDiary", () => {
		it("returns diary with reading level and target", async () => {
			const ctx = createTestContext();
			const caller = readingDiaryRouter.createCaller(ctx);

			const result = await caller.getDiary({
				childId: "child-1",
			});

			expect(result).toHaveProperty("currentBook");
			expect(result).toHaveProperty("readingLevel");
			expect(result).toHaveProperty("targetMinsPerDay");
		});
	});

	describe("getStats", () => {
		it("returns reading statistics", async () => {
			const ctx = createTestContext();
			const caller = readingDiaryRouter.createCaller(ctx);

			const result = await caller.getStats({
				childId: "child-1",
			});

			expect(result).toHaveProperty("totalEntriesThisTerm");
			expect(result).toHaveProperty("avgMinutes");
			expect(result).toHaveProperty("daysReadThisWeek");
			expect(result).toHaveProperty("currentStreak");
		});
	});
});
