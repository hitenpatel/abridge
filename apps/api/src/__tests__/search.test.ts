import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchAll } from "../lib/search-indexer";
import { appRouter } from "../router";

// Mock the search indexer
vi.mock("../lib/search-indexer", () => ({
	searchAll: vi.fn(),
	INDICES: { MESSAGES: "messages", EVENTS: "events", PAYMENTS: "payments" },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
// biome-ignore lint/suspicious/noExplicitAny: Test mocks require flexible typing
function createTestContext(overrides?: any): any {
	return {
		prisma: {
			child: {
				findMany: vi.fn(),
			},
		},
		req: {},
		res: {},
		user: { id: "user-1" },
		session: {},
		...overrides,
	};
}

describe("search router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("query", () => {
		it("searches across all schools associated with the parent", async () => {
			const ctx = createTestContext();

			// User has children in two schools
			ctx.prisma.child.findMany.mockResolvedValue([
				{ schoolId: "school-1" },
				{ schoolId: "school-2" },
				{ schoolId: "school-1" }, // Duplicate school (two children in same school)
			]);

			// Mock search results
			vi.mocked(searchAll).mockImplementation(async (query: string, schoolId: string) => {
				if (schoolId === "school-1")
					return [{ id: "res-1", score: 10, index: "messages", source: {} }];
				if (schoolId === "school-2")
					return [{ id: "res-2", score: 5, index: "events", source: {} }];
				return [];
			});

			const caller = appRouter.createCaller(ctx);

			// @ts-ignore - search router not yet implemented
			const result = await caller.search.query({
				query: "test",
				limit: 10,
			});

			// Should call searchAll for unique schools
			expect(searchAll).toHaveBeenCalledWith("test", "school-1");
			expect(searchAll).toHaveBeenCalledWith("test", "school-2");
			expect(searchAll).toHaveBeenCalledTimes(2);

			// Should aggregate results
			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: "res-1" }),
					expect.objectContaining({ id: "res-2" }),
				]),
			);
		});

		it("returns empty array if no schools", async () => {
			const ctx = createTestContext();
			ctx.prisma.child.findMany.mockResolvedValue([]);

			const caller = appRouter.createCaller(ctx);

			// @ts-ignore - search router not yet implemented
			const result = await caller.search.query({ query: "test" });

			expect(result).toEqual([]);
			expect(searchAll).not.toHaveBeenCalled();
		});
	});
});
