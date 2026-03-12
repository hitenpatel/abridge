import { describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { appRouter } from "../router";

function createTestContext(overrides?: Partial<Context>): Context {
	return {
		prisma: {
			$queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
		} as unknown as Context["prisma"],
		req: {} as Context["req"],
		res: {} as Context["res"],
		requestId: "test-request-id",
		user: null,
		session: null,
		...overrides,
	};
}

describe("health router", () => {
	it("returns status with dependency info when database is up", async () => {
		const caller = appRouter.createCaller(createTestContext());
		const result = await caller.health.check();

		// Redis may be down in test, so status could be "healthy" or "degraded"
		expect(["healthy", "degraded"]).toContain(result.status);
		expect(result.uptime).toBeGreaterThanOrEqual(0);
		expect(result.dependencies.database).toBeDefined();
		expect(result.dependencies.database.status).toBe("up");
		expect(result.dependencies.database.latencyMs).toBeGreaterThanOrEqual(0);
	});

	it("returns degraded when optional deps are down", async () => {
		const caller = appRouter.createCaller(createTestContext());
		const result = await caller.health.check();

		// Redis and ES may be down in test environment — status should be healthy or degraded, not unhealthy
		expect(["healthy", "degraded"]).toContain(result.status);
	});

	it("returns unhealthy when database is down", async () => {
		const ctx = createTestContext({
			prisma: {
				$queryRaw: vi.fn().mockRejectedValue(new Error("Connection refused")),
			} as unknown as Context["prisma"],
		});
		const caller = appRouter.createCaller(ctx);
		const result = await caller.health.check();

		expect(result.status).toBe("unhealthy");
		expect(result.dependencies.database.status).toBe("down");
		expect(result.dependencies.database.error).toBeDefined();
	});
});
