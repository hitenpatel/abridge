import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

const SETUP_KEY = "test-setup-key";

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({
					id: "school-new",
					name: "Test School",
					urn: "123456",
				}),
			},
			$executeRaw: vi.fn().mockResolvedValue(1),
		},
		req: {},
		res: {},
		user: null,
		session: null,
		...overrides,
	};
}

describe("setup router", () => {
	describe("createInitialSchool", () => {
		beforeAll(() => {
			process.env.SETUP_KEY = SETUP_KEY;
		});

		afterAll(() => {
			process.env.SETUP_KEY = undefined;
		});

		it("creates a school with valid setup key", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.setup.createInitialSchool({
				name: "Test School",
				urn: "123456",
				adminEmail: "admin@test.com",
				setupKey: SETUP_KEY,
			});

			expect(result).toEqual({ success: true, schoolId: "school-new" });
			expect(ctx.prisma.school.create).toHaveBeenCalledWith({
				data: { name: "Test School", urn: "123456" },
			});
			expect(ctx.prisma.$executeRaw).toHaveBeenCalled();
		});

		it("rejects invalid setup key", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.setup.createInitialSchool({
					name: "Test School",
					urn: "123456",
					adminEmail: "admin@test.com",
					setupKey: "wrong-key",
				}),
			).rejects.toThrow("Invalid setup key");
		});

		it("rejects if school with URN already exists", async () => {
			const ctx = createTestContext({
				prisma: {
					school: {
						findUnique: vi.fn().mockResolvedValue({
							id: "existing-school",
							name: "Existing School",
							urn: "123456",
						}),
						create: vi.fn(),
					},
					$executeRaw: vi.fn(),
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.setup.createInitialSchool({
					name: "Test School",
					urn: "123456",
					adminEmail: "admin@test.com",
					setupKey: SETUP_KEY,
				}),
			).rejects.toThrow("School already exists");
		});

		it("rejects empty school name", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.setup.createInitialSchool({
					name: "",
					urn: "123456",
					adminEmail: "admin@test.com",
					setupKey: SETUP_KEY,
				}),
			).rejects.toThrow();
		});

		it("rejects invalid admin email", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.setup.createInitialSchool({
					name: "Test School",
					urn: "123456",
					adminEmail: "not-an-email",
					setupKey: SETUP_KEY,
				}),
			).rejects.toThrow();
		});
	});
});
