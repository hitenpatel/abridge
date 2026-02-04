import { describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { stripe } from "../lib/stripe";
import { appRouter } from "../router";

vi.mock("../lib/stripe", () => ({
	stripe: {
		checkout: {
			sessions: {
				create: vi.fn(),
			},
		},
	},
}));

function createTestContext(overrides?: Partial<Context>): Context {
	return {
		prisma: {
			paymentItem: {
				findUnique: vi.fn(),
				findMany: vi.fn(),
			},
			payment: {
				findFirst: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				findMany: vi.fn(),
			},
			child: {
				findMany: vi.fn(),
			},
			parentChild: {
				findMany: vi.fn(),
			},
		} as any,
		req: {} as Context["req"],
		res: {} as Context["res"],
		user: null,
		session: null,
		...overrides,
	};
}

describe("payments router", () => {
	describe("createCartCheckout", () => {
		const mockUser = {
			id: "user-1",
			name: "User 1",
			email: "user1@example.com",
			emailVerified: false,
			image: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const mockSession = {
			id: "session-1",
			userId: "user-1",
			token: "token-1",
			expiresAt: new Date(Date.now() + 86400000),
			createdAt: new Date(),
			updatedAt: new Date(),
			ipAddress: null,
			userAgent: null,
		};

		it("should throw NOT_FOUND if items are missing", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.paymentItem.findMany as any).mockResolvedValue([]);

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createCartCheckout({
					items: [{ paymentItemId: "item-1", childId: "child-1" }],
				}),
			).rejects.toThrow("One or more items not found");
		});

		it("should throw BAD_REQUEST if items belong to different schools", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.paymentItem.findMany as any).mockResolvedValue([
				{
					id: "item-1",
					schoolId: "school-1",
					school: { stripeAccountId: "acc-1" },
					children: [{ childId: "child-1" }],
				},
				{
					id: "item-2",
					schoolId: "school-2",
					school: { stripeAccountId: "acc-2" },
					children: [{ childId: "child-2" }],
				},
			]);

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createCartCheckout({
					items: [
						{ paymentItemId: "item-1", childId: "child-1" },
						{ paymentItemId: "item-2", childId: "child-2" },
					],
				}),
			).rejects.toThrow("All items must belong to the same school");
		});

		it("should create a checkout session and return the URL", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			const mockPaymentItem = {
				id: "item-1",
				title: "School Trip",
				amount: 1000,
				schoolId: "school-1",
				school: { stripeAccountId: "acc-1" },
				children: [{ childId: "child-1" }],
			};
			(ctx.prisma.paymentItem.findMany as any).mockResolvedValue([mockPaymentItem]);
			(ctx.prisma.payment.findMany as any).mockResolvedValue([]);
			(ctx.prisma.payment.findFirst as any).mockResolvedValue(null);
			(ctx.prisma.payment.create as any).mockResolvedValue({ id: "pay-1" });
			(stripe.checkout.sessions.create as any).mockResolvedValue({
				id: "session-1",
				url: "https://stripe.com/checkout",
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.createCartCheckout({
				items: [{ paymentItemId: "item-1", childId: "child-1" }],
			});

			expect(result.url).toBe("https://stripe.com/checkout");
			expect(ctx.prisma.payment.create).toHaveBeenCalled();
			expect(stripe.checkout.sessions.create).toHaveBeenCalled();
		});
	});
});
