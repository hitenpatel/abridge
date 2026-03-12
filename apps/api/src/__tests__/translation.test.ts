import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/translation", () => ({
	translateTexts: vi.fn().mockResolvedValue(["Hola", "Mundo"]),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("translation router", () => {
	describe("translate", () => {
		it("returns translated texts for valid input", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.translation.translate({
				texts: ["Hello", "World"],
				targetLang: "es",
			});

			expect(result).toEqual({ translations: ["Hola", "Mundo"] });
		});

		it("accepts an explicit sourceLang", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.translation.translate({
				texts: ["Bonjour"],
				targetLang: "de",
				sourceLang: "fr",
			});

			expect(result).toHaveProperty("translations");
		});

		it("rejects unauthenticated requests", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.translation.translate({
					texts: ["Hello"],
					targetLang: "es",
				}),
			).rejects.toThrow();
		});

		it("rejects an empty texts array", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.translation.translate({
					texts: [],
					targetLang: "es",
				}),
			).rejects.toThrow();
		});

		it("rejects more than 50 texts", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const texts = Array.from({ length: 51 }, (_, i) => `text-${i}`);

			await expect(
				caller.translation.translate({
					texts,
					targetLang: "es",
				}),
			).rejects.toThrow();
		});

		it("rejects a language code that is too short", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.translation.translate({
					texts: ["Hello"],
					targetLang: "x",
				}),
			).rejects.toThrow();
		});

		it("rejects a language code that is too long", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.translation.translate({
					texts: ["Hello"],
					targetLang: "toolong",
				}),
			).rejects.toThrow();
		});
	});
});
