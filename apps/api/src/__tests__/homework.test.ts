import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

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
					homeworkEnabled: true,
					readingDiaryEnabled: false,
					visitorManagementEnabled: false,
					misIntegrationEnabled: false,
				}),
			},
			homeworkAssignment: {
				create: vi.fn().mockResolvedValue({
					id: "hw-1",
					schoolId: "school-1",
					setBy: "user-1",
					subject: "Maths",
					title: "Fractions worksheet",
					description: null,
					yearGroup: "Year 4",
					className: null,
					setDate: new Date("2026-03-10"),
					dueDate: new Date("2026-03-17"),
					attachmentUrls: [],
					isReadingTask: false,
					status: "ACTIVE",
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "hw-1",
						subject: "Maths",
						title: "Fractions worksheet",
						yearGroup: "Year 4",
						dueDate: new Date("2026-03-17"),
						status: "ACTIVE",
						completions: [],
						_count: { completions: 0 },
					},
				]),
				update: vi.fn().mockResolvedValue({
					id: "hw-1",
					status: "CANCELLED",
				}),
			},
			homeworkCompletion: {
				upsert: vi.fn().mockResolvedValue({
					id: "comp-1",
					assignmentId: "hw-1",
					childId: "child-1",
					status: "COMPLETED",
					completedAt: new Date(),
					markedBy: "PARENT",
				}),
				update: vi.fn().mockResolvedValue({
					id: "comp-1",
					grade: "A",
					feedback: "Well done",
					gradedBy: "user-1",
					gradedAt: new Date(),
				}),
			},
			child: {
				findUnique: vi.fn().mockResolvedValue({
					id: "child-1",
					schoolId: "school-1",
					yearGroup: "Year 4",
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
			$transaction: vi.fn().mockResolvedValue([
				{
					id: "comp-1",
					assignmentId: "hw-1",
					childId: "child-1",
					grade: "A",
				},
			]),
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("homework router", () => {
	describe("setHomework", () => {
		it("creates a homework assignment", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.setHomework({
				schoolId: "school-1",
				subject: "Maths",
				title: "Fractions worksheet",
				yearGroup: "Year 4",
				setDate: new Date("2026-03-10"),
				dueDate: new Date("2026-03-17"),
				attachmentUrls: [],
				isReadingTask: false,
			});

			expect(result).toHaveProperty("id");
			expect(result.subject).toBe("Maths");
			expect(ctx.prisma.homeworkAssignment.create).toHaveBeenCalled();
		});
	});

	describe("listForChild", () => {
		it("returns assignments matching child year group", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.listForChild({
				childId: "child-1",
			});

			expect(result.assignments).toHaveLength(1);
			expect(result.assignments[0].subject).toBe("Maths");
			expect(ctx.prisma.child.findUnique).toHaveBeenCalledWith({
				where: { id: "child-1" },
			});
		});
	});

	describe("listForTeacher", () => {
		it("returns assignments set by the current user", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.listForTeacher({
				schoolId: "school-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(1);
		});
	});

	describe("markComplete", () => {
		it("upserts a completion record", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.markComplete({
				assignmentId: "hw-1",
				childId: "child-1",
			});

			expect(result).toHaveProperty("id");
			expect(result.status).toBe("COMPLETED");
			expect(ctx.prisma.homeworkCompletion.upsert).toHaveBeenCalled();
		});
	});

	describe("markInProgress", () => {
		it("upserts a completion with IN_PROGRESS status", async () => {
			const ctx = createTestContext();
			ctx.prisma.homeworkCompletion.upsert.mockResolvedValue({
				id: "comp-1",
				assignmentId: "hw-1",
				childId: "child-1",
				status: "IN_PROGRESS",
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.markInProgress({
				assignmentId: "hw-1",
				childId: "child-1",
			});

			expect(result.status).toBe("IN_PROGRESS");
		});
	});

	describe("gradeHomework", () => {
		it("updates completion with grade and feedback", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.gradeHomework({
				schoolId: "school-1",
				completionId: "comp-1",
				grade: "A",
				feedback: "Well done",
			});

			expect(result).toHaveProperty("grade");
			expect(result.grade).toBe("A");
			expect(ctx.prisma.homeworkCompletion.update).toHaveBeenCalled();
		});
	});

	describe("bulkGrade", () => {
		it("grades multiple children in a transaction", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.bulkGrade({
				schoolId: "school-1",
				assignmentId: "hw-1",
				grades: [{ childId: "child-1", grade: "A", feedback: "Great work" }],
			});

			expect(Array.isArray(result)).toBe(true);
			expect(ctx.prisma.$transaction).toHaveBeenCalled();
		});
	});

	describe("cancelHomework", () => {
		it("sets assignment status to CANCELLED", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.cancelHomework({
				schoolId: "school-1",
				assignmentId: "hw-1",
			});

			expect(result.status).toBe("CANCELLED");
			expect(ctx.prisma.homeworkAssignment.update).toHaveBeenCalledWith({
				where: { id: "hw-1" },
				data: { status: "CANCELLED" },
			});
		});
	});
});
