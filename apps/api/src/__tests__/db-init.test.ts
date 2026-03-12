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
			$executeRaw: vi.fn().mockResolvedValue(1),
		},
		req: {},
		res: {},
		user: null,
		session: null,
		...overrides,
	};
}

describe("dbInit router", () => {
	describe("initTables", () => {
		it("creates invitations table successfully in non-production", async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";

			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.dbInit.initTables();

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.$executeRaw).toHaveBeenCalled();

			process.env.NODE_ENV = originalEnv;
		});

		it("rejects in production environment", async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(caller.dbInit.initTables()).rejects.toThrow(
				"Not available in production",
			);

			process.env.NODE_ENV = originalEnv;
		});

		it("propagates database errors", async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";

			const ctx = createTestContext({
				prisma: {
					$executeRaw: vi.fn().mockRejectedValue(new Error("DB connection failed")),
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.dbInit.initTables()).rejects.toThrow(
				"DB connection failed",
			);

			process.env.NODE_ENV = originalEnv;
		});

		it("works without authentication (public procedure)", async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "test";

			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			const result = await caller.dbInit.initTables();

			expect(result).toEqual({ success: true });

			process.env.NODE_ENV = originalEnv;
		});
	});
});
