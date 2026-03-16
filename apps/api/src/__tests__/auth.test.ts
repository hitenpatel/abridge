import { describe, expect, it } from "vitest";
import type { Context } from "../context";
import { appRouter } from "../router";

function createTestContext(overrides?: Partial<Context>): Context {
	return {
		prisma: {} as Context["prisma"],
		req: {} as Context["req"],
		res: {} as Context["res"],
		requestId: "test-request-id",
		user: null,
		session: null,
		...overrides,
	};
}

describe("auth router", () => {
	describe("getSession", () => {
		it("returns null for unauthenticated requests", async () => {
			const caller = appRouter.createCaller(createTestContext());
			const result = await caller.auth.getSession();

			expect(result).toBeNull();
		});

		it("returns user for authenticated requests", async () => {
			const mockUser = {
				id: "test-user-id",
				name: "Test User",
				email: "test@example.com",
				emailVerified: false,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const caller = appRouter.createCaller(
				createTestContext({
					user: mockUser,
					session: {
						id: "test-session-id",
						userId: "test-user-id",
						token: "test-token",
						expiresAt: new Date(Date.now() + 86400000),
						createdAt: new Date(),
						updatedAt: new Date(),
						ipAddress: null,
						userAgent: null,
					},
					prisma: {
						parentChild: { findMany: async () => [] },
						staffMember: { findFirst: async () => null },
						child: { findUnique: async () => null },
						$queryRaw: async () => [],
					} as unknown as Context["prisma"],
				}),
			);
			const result = await caller.auth.getSession();

			expect(result).toEqual({
				...mockUser,
				isParent: false,
				isStudent: false,
				studentChildId: null,
				staffRole: null,
				schoolId: null,
			});
		});
	});

	describe("getSecretMessage", () => {
		it("rejects unauthenticated requests", async () => {
			const caller = appRouter.createCaller(createTestContext());

			await expect(caller.auth.getSecretMessage()).rejects.toThrow("UNAUTHORIZED");
		});

		it("returns greeting for authenticated user with name", async () => {
			const mockUser = {
				id: "test-user-id",
				name: "Test User",
				email: "test@example.com",
				emailVerified: false,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const caller = appRouter.createCaller(
				createTestContext({
					user: mockUser,
					session: {
						id: "test-session-id",
						userId: "test-user-id",
						token: "test-token",
						expiresAt: new Date(Date.now() + 86400000),
						createdAt: new Date(),
						updatedAt: new Date(),
						ipAddress: null,
						userAgent: null,
					},
				}),
			);
			const result = await caller.auth.getSecretMessage();

			expect(result).toBe("Hello Test User, this is a secret message!");
		});

		it("uses email prefix when name is null", async () => {
			const mockUser = {
				id: "test-user-id",
				name: null as string | null,
				email: "john.doe@example.com",
				emailVerified: false,
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const caller = appRouter.createCaller(
				createTestContext({
					user: mockUser as Context["user"],
					session: {
						id: "test-session-id",
						userId: "test-user-id",
						token: "test-token",
						expiresAt: new Date(Date.now() + 86400000),
						createdAt: new Date(),
						updatedAt: new Date(),
						ipAddress: null,
						userAgent: null,
					},
				}),
			);
			const result = await caller.auth.getSecretMessage();

			expect(result).toBe("Hello john.doe, this is a secret message!");
		});
	});
});
