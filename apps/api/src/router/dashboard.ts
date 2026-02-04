import { endOfDay, endOfWeek, startOfDay, startOfWeek, subDays } from "date-fns";
import { protectedProcedure, router } from "../trpc";

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
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
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

		// 5. Today's Attendance
		const todayAttendance = await ctx.prisma.attendanceRecord.findMany({
			where: {
				childId: { in: childIds },
				date: {
					gte: startOfDay(new Date()),
					lte: endOfDay(new Date()),
				},
			},
			select: {
				childId: true,
				session: true,
				mark: true,
			},
		});

		// 6. Upcoming Events (Current Week)
		const upcomingEvents = await ctx.prisma.event.findMany({
			where: {
				startDate: {
					gte: new Date(),
					lte: endOfWeek(new Date()),
				},
			},
			orderBy: {
				startDate: "asc",
			},
			select: {
				id: true,
				title: true,
				startDate: true,
				category: true,
				body: true,
			},
		});

		// 7. Attendance Percentage (Last 30 Days)
		const last30DaysAttendance = await ctx.prisma.attendanceRecord.findMany({
			where: {
				childId: { in: childIds },
				date: {
					gte: subDays(new Date(), 30),
				},
			},
			select: {
				childId: true,
				mark: true,
			},
		});

		const attendancePercentage = childIds.map((childId) => {
			const records = last30DaysAttendance.filter((r) => r.childId === childId);
			if (records.length === 0) {
				return { childId, percentage: 0 };
			}
			const presentOrLate = records.filter((r) => ["PRESENT", "LATE"].includes(r.mark)).length;
			const percentage = Math.round((presentOrLate / records.length) * 100);
			return { childId, percentage };
		});

		return {
			children,
			metrics: {
				unreadMessages,
				paymentsCount,
				paymentsTotal,
				attendanceAlerts,
			},
			todayAttendance,
			upcomingEvents,
			attendancePercentage,
		};
	}),
});
