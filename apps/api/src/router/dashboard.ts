import { router, protectedProcedure } from "../trpc";
import { subDays } from "date-fns";

// Define local interfaces since generated types are missing/broken in this env
export interface Child {
	id: string;
	firstName: string;
	lastName: string;
	[key: string]: unknown;
}

export interface ParentChildResult {
	childId: string;
	child: Child;
}

export interface PaymentLineItemResult {
	amount: number;
	childId: string | null;
}

export interface PaymentItemResult {
	id: string;
	amount: number;
	children: { childId: string }[];
	payments: PaymentLineItemResult[];
}

export const dashboardRouter = router({
	getSummary: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.user.id;

		// 1. Get user's children
		// Cast to unknown first to avoid type overlap issues if types were present
		const parentChildren = (await ctx.prisma.parentChild.findMany({
			where: { userId },
			select: { childId: true, child: true },
		})) as unknown as ParentChildResult[];

		const children = parentChildren.map((pc) => pc.child);
		const childIds = children.map((c) => c.id);

		if (childIds.length === 0) {
			return {
				children: [],
				metrics: {
					unreadMessages: 0,
					paymentsCount: 0,
					paymentsTotal: 0, // in pence
					attendanceAlerts: 0,
				},
			};
		}

		// 2. Unread Messages
		// Count messages targeted at these children that DO NOT have a corresponding MessageRead entry for ctx.user.id
		const unreadMessages = await ctx.prisma.message.count({
			where: {
				children: {
					some: {
						childId: { in: childIds },
					},
				},
				reads: {
					none: {
						userId,
					},
				},
			},
		});

		// 3. Outstanding Payments
		// Find PaymentItems linked to these children
		const paymentItems = (await ctx.prisma.paymentItem.findMany({
			where: {
				children: {
					some: {
						childId: { in: childIds },
					},
				},
			},
			include: {
				children: {
					where: {
						childId: { in: childIds },
					},
				},
				payments: {
					where: {
						payment: {
							status: "COMPLETED",
						},
					},
					select: {
						amount: true,
						childId: true,
					},
				},
			},
		})) as unknown as PaymentItemResult[];

		let paymentsCount = 0;
		let paymentsTotal = 0;

		for (const item of paymentItems) {
			// For each of the user's children linked to this item
			for (const itemChild of item.children) {
				const childId = itemChild.childId;
				const requiredAmount = item.amount;

				// Calculate how much has been paid for this item + child
				// We assume PaymentLineItem.childId is populated for child-specific payments
				const paidAmount = item.payments
					.filter((p) => p.childId === childId)
					.reduce((sum, p) => sum + p.amount, 0);

				if (paidAmount < requiredAmount) {
					paymentsCount++;
					paymentsTotal += requiredAmount - paidAmount;
				}
			}
		}

		// 4. Attendance Alerts
		// Count records with mark in [LATE, ABSENT_UNAUTHORISED] in the last 7 days
		const attendanceAlerts = await ctx.prisma.attendanceRecord.count({
			where: {
				childId: { in: childIds },
				mark: { in: ["LATE", "ABSENT_UNAUTHORISED"] },
				date: {
					gte: subDays(new Date(), 7),
				},
			},
		});

		return {
			children,
			metrics: {
				unreadMessages,
				paymentsCount,
				paymentsTotal,
				attendanceAlerts,
			},
		};
	}),
});
