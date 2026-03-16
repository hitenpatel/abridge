import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai-homework-hints", () => ({
	generateHint: vi.fn().mockResolvedValue("Try breaking this into smaller steps. What do you get if you multiply 6 by 3 first?"),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
				}),
			},
			homeworkAssignment: {
				findUnique: vi.fn().mockResolvedValue({
					id: "hw-1",
					schoolId: "school-1",
					title: "Multiplication Practice",
					description: "Complete exercises on multiplying two-digit numbers",
					subject: "Maths",
					yearGroup: "Year 4",
					status: "ACTIVE",
				}),
			},
			homeworkCompletion: {
				findUnique: vi.fn().mockResolvedValue({
					id: "comp-1",
					assignmentId: "hw-1",
					childId: "child-1",
					hintCount: 0,
				}),
				create: vi.fn().mockResolvedValue({
					id: "comp-1",
					assignmentId: "hw-1",
					childId: "child-1",
					status: "NOT_STARTED",
					hintCount: 0,
				}),
				update: vi.fn().mockResolvedValue({
					id: "comp-1",
					hintCount: 1,
				}),
			},
			child: {
				findUnique: vi.fn().mockResolvedValue({
					id: "child-1",
					yearGroup: "Year 4",
				}),
			},
		},
		user: { id: "user-1", name: "Test Parent" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("homework getHint", () => {
	it("generates a hint for a valid assignment", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.homework.getHint({
			assignmentId: "hw-1",
			childId: "child-1",
		});

		expect(result.hint).toContain("smaller steps");
		expect(result.hintsUsed).toBe(1);
		expect(result.hintsRemaining).toBe(2);
		expect(ctx.prisma.homeworkCompletion.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "comp-1" },
				data: { hintCount: 1 },
			}),
		);
	});

	it("rejects after 3 hints have been used", async () => {
		const ctx = createTestContext();
		ctx.prisma.homeworkCompletion.findUnique.mockResolvedValue({
			id: "comp-1",
			assignmentId: "hw-1",
			childId: "child-1",
			hintCount: 3,
		});

		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.homework.getHint({
				assignmentId: "hw-1",
				childId: "child-1",
			}),
		).rejects.toThrow("Maximum hints reached");
	});

	it("returns null hint when AI provider is template mode", async () => {
		const { generateHint } = await import("../lib/ai-homework-hints");
		vi.mocked(generateHint).mockResolvedValueOnce(null);

		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.homework.getHint({
			assignmentId: "hw-1",
			childId: "child-1",
		});

		expect(result.hint).toBeNull();
		expect(result.hintsUsed).toBe(1);
		// Still increments count even when AI returns null
		expect(ctx.prisma.homeworkCompletion.update).toHaveBeenCalled();
	});
});
