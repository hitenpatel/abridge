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

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Partial<Context>): Context {
	return {
		prisma: {
			paymentItem: {
				findUnique: vi.fn(),
				findMany: vi.fn(),
				create: vi.fn(),
				count: vi.fn(),
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
			staffMember: {
				findUnique: vi.fn(),
			},
		} as any,
		req: {} as Context["req"],
		res: {} as Context["res"],
		user: null,
		session: null,
		...overrides,
	};
}

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

describe("payments router", () => {
	describe("createCheckoutSession", () => {
		it("creates a single-item checkout session", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.paymentItem.findUnique as any).mockResolvedValue({
				id: "item-1",
				title: "School Trip",
				amount: 1500,
				description: "Trip to museum",
				school: { id: "school-1", stripeAccountId: "acct_123" },
				children: [{ childId: "child-1" }],
			});
			(ctx.prisma.payment.findFirst as any).mockResolvedValue(null);
			(ctx.prisma.payment.create as any).mockResolvedValue({ id: "pay-1" });
			(ctx.prisma.payment.update as any).mockResolvedValue({});
			(stripe.checkout.sessions.create as any).mockResolvedValue({
				id: "cs_123",
				url: "https://checkout.stripe.com/session",
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.createCheckoutSession({
				paymentItemId: "item-1",
				childId: "child-1",
			});

			expect(result.url).toBe("https://checkout.stripe.com/session");
			expect(ctx.prisma.payment.create).toHaveBeenCalled();
			expect(stripe.checkout.sessions.create).toHaveBeenCalled();
		});

		it("throws NOT_FOUND if payment item does not exist", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.paymentItem.findUnique as any).mockResolvedValue(null);

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createCheckoutSession({ paymentItemId: "nope", childId: "child-1" }),
			).rejects.toThrow("Payment item not found for this child");
		});

		it("throws if school has no Stripe account", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.paymentItem.findUnique as any).mockResolvedValue({
				id: "item-1",
				title: "Trip",
				amount: 500,
				school: { id: "school-1", stripeAccountId: null },
				children: [{ childId: "child-1" }],
			});

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createCheckoutSession({ paymentItemId: "item-1", childId: "child-1" }),
			).rejects.toThrow("School has not set up payments yet");
		});

		it("throws if item already paid", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.paymentItem.findUnique as any).mockResolvedValue({
				id: "item-1",
				title: "Trip",
				amount: 500,
				school: { id: "school-1", stripeAccountId: "acct_123" },
				children: [{ childId: "child-1" }],
			});
			(ctx.prisma.payment.findFirst as any).mockResolvedValue({ id: "existing-pay" });

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createCheckoutSession({ paymentItemId: "item-1", childId: "child-1" }),
			).rejects.toThrow("This item has already been paid for");
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createCheckoutSession({ paymentItemId: "item-1", childId: "child-1" }),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	describe("createCartCheckout", () => {
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

	describe("listOutstandingPayments", () => {
		it("returns outstanding payments for parent", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.parentChild.findMany as any).mockResolvedValue([
				{ childId: "child-1", child: { id: "child-1", firstName: "Emma", lastName: "Smith" } },
			]);
			(ctx.prisma.paymentItem.findMany as any).mockResolvedValue([
				{
					id: "item-1",
					title: "Trip Fee",
					description: "Museum trip",
					amount: 1500,
					category: "TRIP",
					dueDate: new Date(),
					school: { name: "Oak Primary" },
					children: [{ childId: "child-1" }],
				},
			]);
			(ctx.prisma.payment.findMany as any).mockResolvedValue([]);

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.listOutstandingPayments();

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe("Trip Fee");
			expect(result[0].childName).toBe("Emma Smith");
			expect(result[0].amount).toBe(1500);
		});

		it("excludes already paid items", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.parentChild.findMany as any).mockResolvedValue([
				{ childId: "child-1", child: { id: "child-1", firstName: "Emma", lastName: "Smith" } },
			]);
			(ctx.prisma.paymentItem.findMany as any).mockResolvedValue([
				{
					id: "item-1",
					title: "Trip Fee",
					description: null,
					amount: 1500,
					category: "TRIP",
					dueDate: null,
					school: { name: "Oak Primary" },
					children: [{ childId: "child-1" }],
				},
			]);
			(ctx.prisma.payment.findMany as any).mockResolvedValue([
				{
					id: "pay-1",
					status: "COMPLETED",
					lineItems: [{ paymentItemId: "item-1", childId: "child-1" }],
				},
			]);

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.listOutstandingPayments();

			expect(result).toHaveLength(0);
		});

		it("returns empty for parent with no children", async () => {
			const ctx = createTestContext({ user: mockUser as any, session: mockSession as any });
			(ctx.prisma.parentChild.findMany as any).mockResolvedValue([]);

			const caller = appRouter.createCaller(ctx);
			const result = await caller.payments.listOutstandingPayments();

			expect(result).toEqual([]);
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.listOutstandingPayments(),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	describe("createPaymentItem", () => {
		it("creates payment item for all children", async () => {
			const ctx = createTestContext({
				user: mockUser as any,
				session: mockSession as any,
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
					child: {
						findMany: vi.fn().mockResolvedValue([{ id: "child-1" }, { id: "child-2" }]),
					},
					paymentItem: {
						create: vi.fn().mockResolvedValue({ id: "item-new" }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.payments.createPaymentItem({
				schoolId: "school-1",
				title: "Lunch Money",
				amount: 350,
				category: "DINNER_MONEY",
				allChildren: true,
			});

			expect(result.success).toBe(true);
			expect(result.recipientCount).toBe(2);
		});

		it("rejects when no recipients specified", async () => {
			const ctx = createTestContext({
				user: mockUser as any,
				session: mockSession as any,
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createPaymentItem({
					schoolId: "school-1",
					title: "Trip",
					amount: 1000,
					category: "TRIP",
					allChildren: false,
					childIds: [],
				}),
			).rejects.toThrow("Must specify recipients");
		});

		it("rejects non-staff user", async () => {
			const ctx = createTestContext({
				user: mockUser as any,
				session: mockSession as any,
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createPaymentItem({
					schoolId: "school-1",
					title: "Trip",
					amount: 1000,
					category: "TRIP",
					allChildren: true,
				}),
			).rejects.toThrow();
		});

		it("rejects unauthenticated user", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.createPaymentItem({
					schoolId: "school-1",
					title: "Trip",
					amount: 1000,
					category: "TRIP",
					allChildren: true,
				}),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	describe("listPaymentItems", () => {
		it("returns paginated payment items for staff", async () => {
			const mockItems = [
				{
					id: "item-1",
					title: "Trip Fee",
					amount: 1500,
					category: "TRIP",
					createdAt: new Date(),
					_count: { children: 30, payments: 15 },
				},
			];
			const ctx = createTestContext({
				user: mockUser as any,
				session: mockSession as any,
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
					paymentItem: {
						findMany: vi.fn().mockResolvedValue(mockItems),
						count: vi.fn().mockResolvedValue(1),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.payments.listPaymentItems({
				schoolId: "school-1",
				page: 1,
				limit: 20,
			});

			expect(result.data).toHaveLength(1);
			expect(result.data[0].recipientCount).toBe(30);
			expect(result.data[0].paymentCount).toBe(15);
			expect(result.total).toBe(1);
		});

		it("rejects non-staff user", async () => {
			const ctx = createTestContext({
				user: mockUser as any,
				session: mockSession as any,
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.payments.listPaymentItems({ schoolId: "school-1" }),
			).rejects.toThrow();
		});
	});

	describe("getPaymentHistory", () => {
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
			expect(result.data[0]?.id).toBe("pay-1");
		});
	});

	describe("getReceipt", () => {
		const mockReceiptUser = { id: "user-1", name: "Parent Name" };

		it("should return a UC-compliant receipt", async () => {
			const ctx = createTestContext({ user: mockReceiptUser as any, session: mockSession as any });
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
			expect(result.items[0]?.childName).toBe("Child One");
		});

		it("should throw NOT_FOUND if payment does not exist or belongs to another user", async () => {
			const ctx = createTestContext({ user: mockReceiptUser as any, session: mockSession as any });
			(ctx.prisma.payment.findUnique as any).mockResolvedValue(null);

			const caller = appRouter.createCaller(ctx);

			await expect(caller.payments.getReceipt({ paymentId: "pay-other" })).rejects.toThrow(
				"Payment not found",
			);
		});
	});
});
