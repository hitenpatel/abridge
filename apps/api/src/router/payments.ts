import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { indexPaymentItem } from "../lib/search-indexer";
import { stripe } from "../lib/stripe";
import { protectedProcedure, router, schoolStaffProcedure } from "../trpc";

export const paymentsRouter = router({
	createCheckoutSession: protectedProcedure
		.input(
			z.object({
				paymentItemId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// 1. Verify access and get data
			const paymentItem = await ctx.prisma.paymentItem.findUnique({
				where: { id: input.paymentItemId },
				include: {
					school: {
						select: { id: true, stripeAccountId: true } as any,
					},
					children: {
						where: { childId: input.childId },
					},
				},
			});

			if (!paymentItem || paymentItem.children.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Payment item not found for this child",
				});
			}

			const stripeAccountId = (paymentItem.school as any).stripeAccountId;
			if (!stripeAccountId) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "School has not set up payments yet",
				});
			}

			// 2. Check if already paid
			const existingPayment = await ctx.prisma.payment.findFirst({
				where: {
					userId: ctx.user.id,
					status: "COMPLETED",
					lineItems: {
						some: {
							paymentItemId: input.paymentItemId,
							childId: input.childId,
						},
					},
				},
			});

			if (existingPayment) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This item has already been paid for",
				});
			}

			// 3. Create database record
			const payment = await ctx.prisma.payment.create({
				data: {
					userId: ctx.user.id,
					totalAmount: paymentItem.amount,
					status: "PENDING",
				},
			});

			// 4. Create Stripe Checkout Session
			const session = await (stripe.checkout.sessions.create as any)({
				payment_method_types: ["card"],
				line_items: [
					{
						price_data: {
							currency: "gbp",
							product_data: {
								name: paymentItem.title,
								description: paymentItem.description || undefined,
							},
							unit_amount: paymentItem.amount,
						},
						quantity: 1,
					},
				],
				mode: "payment",
				success_url: `${process.env.WEB_URL}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${process.env.WEB_URL}/dashboard/payments`,
				metadata: {
					paymentId: payment.id,
					paymentItemId: input.paymentItemId,
					childId: input.childId,
					userId: ctx.user.id,
				},
				payment_intent_data: {
					transfer_data: {
						destination: stripeAccountId,
					},
				},
			});

			// Update payment with stripe ID
			await ctx.prisma.payment.update({
				where: { id: payment.id },
				data: { stripeId: (session as any).id },
			});

			return { url: (session as any).url };
		}),

	createCartCheckout: protectedProcedure
		.input(
			z.object({
				items: z.array(
					z.object({
						paymentItemId: z.string(),
						childId: z.string(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.items.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cart is empty",
				});
			}

			// 1. Fetch all unique payment items requested
			const paymentItemIds = Array.from(new Set(input.items.map((i) => i.paymentItemId)));
			const paymentItems = await ctx.prisma.paymentItem.findMany({
				where: { id: { in: paymentItemIds } },
				include: {
					school: {
						select: { id: true, stripeAccountId: true } as any,
					},
					children: true,
				},
			});

			// 2. Validate all items exist and children are linked
			if (paymentItems.length !== paymentItemIds.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "One or more items not found",
				});
			}

			// Map for easy lookup
			const itemMap = new Map(paymentItems.map((item) => [item.id, item]));

			// Validate school consistency and child links
			const firstSchoolId = paymentItems[0]?.schoolId;
			const stripeAccountId = (paymentItems[0]?.school as any).stripeAccountId;

			if (!stripeAccountId) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "School has not set up payments yet",
				});
			}

			for (const item of input.items) {
				const paymentItem = itemMap.get(item.paymentItemId);
				if (!paymentItem) continue;

				if (paymentItem.schoolId !== firstSchoolId) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "All items must belong to the same school",
					});
				}

				const isChildLinked = paymentItem.children.some((c) => c.childId === item.childId);
				if (!isChildLinked) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Item ${paymentItem.title} is not available for this child`,
					});
				}
			}

			// 3. Check if any item already paid
			const completedPayments = await ctx.prisma.payment.findMany({
				where: {
					userId: ctx.user.id,
					status: "COMPLETED",
					lineItems: {
						some: {
							OR: input.items.map((i) => ({
								paymentItemId: i.paymentItemId,
								childId: i.childId,
							})),
						},
					},
				},
				include: { lineItems: true },
			});

			const alreadyPaidPairs = new Set(
				completedPayments.flatMap((p) =>
					p.lineItems.map((li) => `${li.paymentItemId}-${li.childId}`),
				),
			);

			for (const item of input.items) {
				if (alreadyPaidPairs.has(`${item.paymentItemId}-${item.childId}`)) {
					const paymentItem = itemMap.get(item.paymentItemId);
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Item "${paymentItem?.title}" has already been paid for`,
					});
				}
			}

			// 4. Calculate total and line items for DB
			const totalAmount = input.items.reduce((sum, item) => {
				const paymentItem = itemMap.get(item.paymentItemId);
				return sum + (paymentItem?.amount || 0);
			}, 0);

			// 5. Create database record
			const payment = await ctx.prisma.payment.create({
				data: {
					userId: ctx.user.id,
					totalAmount,
					status: "PENDING",
					lineItems: {
						createMany: {
							data: input.items.map((item) => ({
								paymentItemId: item.paymentItemId,
								childId: item.childId,
								amount: itemMap.get(item.paymentItemId)!.amount,
							})),
						},
					},
				},
			});

			// 6. Create Stripe Checkout Session
			const stripeLineItems = input.items.map((item) => {
				const paymentItem = itemMap.get(item.paymentItemId);
				return {
					price_data: {
						currency: "gbp",
						product_data: {
							name: paymentItem!.title,
							description: paymentItem!.description || undefined,
						},
						unit_amount: paymentItem!.amount,
					},
					quantity: 1,
				};
			});

			const session = await (stripe.checkout.sessions.create as any)({
				payment_method_types: ["card"],
				line_items: stripeLineItems,
				mode: "payment",
				success_url: `${process.env.WEB_URL}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${process.env.WEB_URL}/dashboard/payments`,
				metadata: {
					paymentId: payment.id,
					userId: ctx.user.id,
					cartItems: JSON.stringify(input.items),
				},
				payment_intent_data: {
					transfer_data: {
						destination: stripeAccountId,
					},
				},
			});

			// 7. Update payment with stripe ID
			await ctx.prisma.payment.update({
				where: { id: payment.id },
				data: { stripeId: (session as any).id },
			});

			return { url: (session as any).url };
		}),

	listOutstandingPayments: protectedProcedure.query(async ({ ctx }) => {
		// 1. Get user's children
		const parentLinks = await ctx.prisma.parentChild.findMany({
			where: { userId: ctx.user.id },
			select: { childId: true, child: { select: { id: true, firstName: true, lastName: true } } },
		});
		const childIds = parentLinks.map((p: { childId: string }) => p.childId);

		if (childIds.length === 0) return [];

		// 2. Get payment items for these children
		const paymentItems = await ctx.prisma.paymentItem.findMany({
			where: {
				children: {
					some: { childId: { in: childIds } },
				},
			},
			include: {
				school: { select: { name: true } },
				children: {
					where: { childId: { in: childIds } },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// 3. Get completed payments to filter
		const completedPayments = await ctx.prisma.payment.findMany({
			where: {
				userId: ctx.user.id,
				status: "COMPLETED",
			},
			include: {
				lineItems: true,
			},
		});

		// Create a set of paid item-child pairs for fast lookup
		const paidPairs = new Set();
		for (const p of completedPayments) {
			for (const li of p.lineItems) {
				if (li.paymentItemId && li.childId) {
					paidPairs.add(`${li.paymentItemId}-${li.childId}`);
				}
			}
		}

		// 4. Map to UI format
		const outstanding = [];
		for (const item of paymentItems) {
			for (const childLink of item.children) {
				if (!paidPairs.has(`${item.id}-${childLink.childId}`)) {
					const child = parentLinks.find(
						(p: { childId: string }) => p.childId === childLink.childId,
					)?.child;
					outstanding.push({
						id: item.id,
						title: item.title,
						description: item.description,
						amount: item.amount,
						category: item.category,
						dueDate: item.dueDate,
						schoolName: item.school.name,
						childId: childLink.childId,
						childName: child ? `${child.firstName} ${child.lastName}` : "Unknown",
					});
				}
			}
		}

		return outstanding;
	}),

	createPaymentItem: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				title: z.string().min(1),
				description: z.string().optional(),
				amount: z.number().int().positive(), // in pence
				dueDate: z.date().optional(),
				category: z.enum(["DINNER_MONEY", "TRIP", "CLUB", "UNIFORM", "OTHER"]),
				allChildren: z.boolean().default(false),
				childIds: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!input.allChildren && (!input.childIds || input.childIds.length === 0)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Must specify recipients (allChildren=true or childIds list)",
				});
			}

			// 1. Resolve target children
			let targetChildIds: string[] = [];

			if (input.allChildren) {
				const children = await ctx.prisma.child.findMany({
					where: { schoolId: input.schoolId },
					select: { id: true },
				});
				targetChildIds = children.map((c: { id: string }) => c.id);
			} else if (input.childIds) {
				const validChildren = await ctx.prisma.child.findMany({
					where: {
						id: { in: input.childIds },
						schoolId: input.schoolId,
					},
					select: { id: true },
				});
				targetChildIds = validChildren.map((c: { id: string }) => c.id);
			}

			if (targetChildIds.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No valid recipients found",
				});
			}

			// 2. Create payment item + links
			const paymentItem = await ctx.prisma.paymentItem.create({
				data: {
					schoolId: input.schoolId,
					title: input.title,
					description: input.description,
					amount: input.amount,
					dueDate: input.dueDate,
					category: input.category,
					children: {
						createMany: {
							data: targetChildIds.map((cid) => ({ childId: cid })),
						},
					},
				},
			});

			// Index payment item
			indexPaymentItem({
				id: paymentItem.id,
				schoolId: paymentItem.schoolId,
				title: paymentItem.title,
				description: paymentItem.description,
				category: paymentItem.category,
				amount: paymentItem.amount,
				dueDate: paymentItem.dueDate,
			}).catch((e) => {
				console.error(`Failed to index payment item ${paymentItem.id}:`, e);
			});

			return {
				success: true,
				paymentItemId: paymentItem.id,
				recipientCount: targetChildIds.length,
			};
		}),

	listPaymentItems: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const skip = (input.page - 1) * input.limit;

			const [items, total] = await Promise.all([
				ctx.prisma.paymentItem.findMany({
					where: { schoolId: input.schoolId },
					orderBy: { createdAt: "desc" },
					take: input.limit,
					skip,
					include: {
						_count: {
							select: {
								children: true,
								payments: true, // Completed payments
							},
						},
					},
				}),
				ctx.prisma.paymentItem.count({ where: { schoolId: input.schoolId } }),
			]);

			return {
				data: items.map(
					(item: {
						id: string;
						title: string;
						amount: number;
						category: string;
						createdAt: Date;
						_count: { children: number; payments: number };
					}) => ({
						...item,
						recipientCount: item._count.children,
						paymentCount: item._count.payments,
					}),
				),
				total,
				totalPages: Math.ceil(total / input.limit),
			};
		}),
});
