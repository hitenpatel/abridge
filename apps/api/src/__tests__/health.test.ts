import { describe, it, expect } from "vitest";
import { appRouter } from "../router";
import type { Context } from "../context";

function createTestContext(overrides?: Partial<Context>): Context {
  return {
    prisma: {} as Context["prisma"],
    req: {} as Context["req"],
    res: {} as Context["res"],
    user: null,
    ...overrides,
  };
}

describe("health router", () => {
  it("returns ok status", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.health.check();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeDefined();
  });
});
