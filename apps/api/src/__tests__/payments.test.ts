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
				findUnique: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				findMany: vi.fn(),
				count: vi.fn(),
			},
			child: {
				findMany: vi.fn(),
				findUnique: vi.fn(),
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

	describe("getPaymentHistory", () => {
		const mockUser = { id: "user-1" };
		const mockSession = { userId: "user-1" };

		it("should return paginated payment history", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			const mockPayments = [
				{
					id: "pay-1",
					totalAmount: 1000,
					status: "COMPLETED",
					createdAt: new Date(),
					lineItems: [
						{
							id: "li-1",
							amount: 1000,
							paymentItem: {
								title: "School Trip",
								school: { name: "Test School" },
							},
						},
					],
				},
			];
			(ctx.prisma.payment.findMany as any).mockResolvedValue(mockPayments);
			(ctx.prisma.payment.count as any).mockResolvedValue(1);

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.getPaymentHistory({ page: 1, limit: 10 });

			expect(result.data).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(result.data[0].id).toBe("pay-1");
		});
	});

	describe("getReceipt", () => {
		const mockUser = { id: "user-1", name: "Parent Name" };
		const mockSession = { userId: "user-1" };

		it("should return a UC-compliant receipt", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			const mockPayment = {
				id: "pay-1",
				totalAmount: 1000,
				status: "COMPLETED",
				receiptNumber: "REC-123",
				completedAt: new Date(),
				user: { name: "Parent Name" },
				lineItems: [
					{
						amount: 1000,
						child: { firstName: "Child", lastName: "One" },
						paymentItem: {
							title: "School Trip",
							school: {
								name: "Test School",
								urn: "123456",
								address: "123 Test St",
							},
						},
					},
				],
			};
			(ctx.prisma.payment.findUnique as any).mockResolvedValue(mockPayment);

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.getReceipt({ paymentId: "pay-1" });

			expect(result.providerName).toBe("Test School");
			expect(result.ofstedUrn).toBe("123456");
			expect(result.totalAmount).toBe(1000);
			expect(result.receiptNumber).toBe("REC-123");
			expect(result.items[0].childName).toBe("Child One");
		});

		it("should throw NOT_FOUND if payment does not exist or belongs to another user", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.payment.findUnique as any).mockResolvedValue(null);

			const caller = appRouter.createCaller(ctx);

			await expect(caller.payments.getReceipt({ paymentId: "pay-other" })).rejects.toThrow(
				"Payment not found",
			);
		});
	});
});
