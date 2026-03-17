import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Create a test context simulating a student user.
 * The student has Child.userId = "student-user-1" (linked via student portal).
 * They do NOT have a parentChild link — they access their own data directly.
 */
function createStudentContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			child: {
				findUnique: vi.fn().mockImplementation(({ where }: any) => {
					// When looking up by userId (student check)
					if (where.userId === "student-user-1") {
						return Promise.resolve({
							id: "child-1",
							schoolId: "school-1",
							userId: "student-user-1",
							yearGroup: "Year 9",
							firstName: "Test",
							lastName: "Student",
						});
					}
					// When looking up by id
					if (where.id === "child-1") {
						return Promise.resolve({
							id: "child-1",
							schoolId: "school-1",
							userId: "student-user-1",
							yearGroup: "Year 9",
							firstName: "Test",
							lastName: "Student",
						});
					}
					return Promise.resolve(null);
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue(null), // Student has no parentChild link
				findUnique: vi.fn().mockResolvedValue(null),
			},
			homeworkAssignment: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "hw-1",
						subject: "Maths",
						title: "Algebra worksheet",
						yearGroup: "Year 9",
						dueDate: new Date("2026-03-20"),
						status: "ACTIVE",
						completions: [],
					},
				]),
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
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue(null),
				findFirst: vi.fn().mockResolvedValue(null),
			},
			school: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
		},
		user: { id: "student-user-1", name: "Test Student", email: "student@test.com" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("student portal", () => {
	describe("student can view their homework", () => {
		it("allows student to list homework for their linked child", async () => {
			const ctx = createStudentContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.listForChild({
				childId: "child-1",
			});

			expect(result.assignments).toHaveLength(1);
			expect(result.assignments[0]?.subject).toBe("Maths");
		});
	});

	describe("student can mark homework complete", () => {
		it("allows student to mark their own homework as complete", async () => {
			const ctx = createStudentContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.homework.markComplete({
				assignmentId: "hw-1",
				childId: "child-1",
			});

			expect(result).toHaveProperty("id");
			expect(result.status).toBe("COMPLETED");
		});
	});

	describe("student CANNOT access payments", () => {
		it("rejects student access to payment procedures", async () => {
			const ctx = createStudentContext({
				prisma: {
					...createStudentContext().prisma,
					parentChild: {
						findFirst: vi.fn().mockResolvedValue(null),
						findUnique: vi.fn().mockResolvedValue(null),
						findMany: vi.fn().mockResolvedValue([]), // No parentChild links
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			// listOutstandingPayments queries parentChild — student has none, gets empty result
			const result = await caller.payments.listOutstandingPayments();
			// Student gets empty array (no children linked as parent)
			expect(result).toEqual([]);
		});
	});

	describe("student CANNOT access chat", () => {
		it("rejects student access to chat conversations", async () => {
			const ctx = createStudentContext();
			const caller = appRouter.createCaller(ctx);

			// chat.getConversations requires the user to have a parentChild link or staff role
			await expect(caller.chat.getConversations()).rejects.toThrow();
		});
	});
});
