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
			user: {
				update: vi.fn().mockResolvedValue({ id: "user-1" }),
			},
			parentChild: {
				findMany: vi.fn().mockResolvedValue([]),
			},
		},
		req: {},
		res: {},
		user: { id: "user-1", name: "Test User", email: "test@example.com" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("user router", () => {
	describe("updatePushToken", () => {
		it("updates push token for authenticated user", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.user.updatePushToken({
				pushToken: "expo-push-token-abc123",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: { pushToken: "expo-push-token-abc123" },
			});
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.user.updatePushToken({ pushToken: "token" }),
			).rejects.toThrow("UNAUTHORIZED");
		});

		it("rejects empty push token", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.user.updatePushToken({ pushToken: "" }),
			).rejects.toThrow();
		});
	});

	describe("listChildren", () => {
		it("returns empty array when no children linked", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.user.listChildren();

			expect(result).toEqual([]);
			expect(ctx.prisma.parentChild.findMany).toHaveBeenCalledWith({
				where: { userId: "user-1" },
				include: { child: true },
			});
		});

		it("returns linked children", async () => {
			const mockChildren = [
				{
					id: "pc-1",
					userId: "user-1",
					childId: "child-1",
					child: { id: "child-1", firstName: "Alice", lastName: "Smith" },
				},
				{
					id: "pc-2",
					userId: "user-1",
					childId: "child-2",
					child: { id: "child-2", firstName: "Bob", lastName: "Smith" },
				},
			];

			const ctx = createTestContext({
				prisma: {
					parentChild: {
						findMany: vi.fn().mockResolvedValue(mockChildren),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.user.listChildren();

			expect(result).toHaveLength(2);
			expect(result[0].child.firstName).toBe("Alice");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.user.listChildren()).rejects.toThrow("UNAUTHORIZED");
		});
	});

});
