import { TRPCError } from "@trpc/server";
import { endOfDay, endOfWeek, startOfDay, startOfWeek, subDays } from "date-fns";
import { z } from "zod";
import { protectedProcedure, router, schoolAdminProcedure } from "../trpc";

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

	getFeed: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				limit: z.number().min(1).max(50).default(20),
				cursor: z
					.object({
						timestamp: z.string(), // ISO string
						id: z.string(),
					})
					.nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent-child link
			const link = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: { userId: ctx.user.id, childId: input.childId },
				},
				include: {
					child: {
						select: { yearGroup: true, className: true, schoolId: true },
					},
				},
			});

			if (!link) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this child" });
			}

			const { yearGroup, className, schoolId } = link.child;
			const cursorDate = input.cursor ? new Date(input.cursor.timestamp) : undefined;

			type FeedCard =
				| { type: "classPost"; timestamp: Date; id: string; data: Record<string, unknown> }
				| { type: "message"; timestamp: Date; id: string; data: Record<string, unknown> }
				| { type: "attendance"; timestamp: Date; id: string; data: Record<string, unknown> }
				| { type: "payment"; timestamp: Date; id: string; data: Record<string, unknown> }
				| { type: "event"; timestamp: Date; id: string; data: Record<string, unknown> };

			const cards: FeedCard[] = [];

			// 1. Class posts for this child's class
			if (yearGroup && className) {
				const classPosts = await ctx.prisma.classPost.findMany({
					where: {
						schoolId,
						yearGroup,
						className,
						...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
					},
					orderBy: { createdAt: "desc" },
					take: input.limit,
					include: {
						reactions: { select: { emoji: true, userId: true } },
					},
				});

				// Look up author names in batch
				const authorIds = [...new Set(classPosts.map((p) => p.authorId))];
				const authors = await ctx.prisma.user.findMany({
					where: { id: { in: authorIds } },
					select: { id: true, name: true },
				});
				const authorMap = new Map(authors.map((a) => [a.id, a.name]));

				for (const post of classPosts) {
					const reactionCounts: Record<string, number> = {};
					let myReaction: string | null = null;
					for (const r of post.reactions) {
						reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
						if (r.userId === ctx.user.id) myReaction = r.emoji;
					}
					cards.push({
						type: "classPost",
						timestamp: post.createdAt,
						id: post.id,
						data: {
							body: post.body,
							mediaUrls: post.mediaUrls,
							authorId: post.authorId,
							authorName: authorMap.get(post.authorId) ?? "Staff",
							reactionCounts,
							totalReactions: post.reactions.length,
							myReaction,
						},
					});
				}
			}

			// 2. Messages targeting this child
			const messages = await ctx.prisma.message.findMany({
				where: {
					children: { some: { childId: input.childId } },
					...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
				},
				orderBy: { createdAt: "desc" },
				take: input.limit,
				include: {
					reads: { where: { userId: ctx.user.id }, select: { readAt: true } },
				},
			});

			for (const msg of messages) {
				cards.push({
					type: "message",
					timestamp: msg.createdAt,
					id: msg.id,
					data: {
						subject: msg.subject,
						body: msg.body.length > 200 ? `${msg.body.slice(0, 197)}...` : msg.body,
						category: msg.category,
						authorId: msg.authorId,
						isRead: msg.reads.length > 0,
					},
				});
			}

			// 3. Attendance records for this child
			const attendance = await ctx.prisma.attendanceRecord.findMany({
				where: {
					childId: input.childId,
					...(cursorDate ? { date: { lt: cursorDate } } : {}),
				},
				orderBy: { date: "desc" },
				take: input.limit,
				include: { child: { select: { firstName: true, lastName: true } } },
			});

			for (const rec of attendance) {
				cards.push({
					type: "attendance",
					timestamp: rec.date,
					id: rec.id,
					data: {
						childName: `${rec.child.firstName} ${rec.child.lastName}`,
						date: rec.date,
						session: rec.session,
						mark: rec.mark,
						note: rec.note,
					},
				});
			}

			// 4. Outstanding payments for this child
			const paymentItemsRaw = await ctx.prisma.paymentItem.findMany({
				where: {
					children: { some: { childId: input.childId } },
					...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
				},
				orderBy: { createdAt: "desc" },
				take: input.limit,
				include: {
					payments: {
						where: { payment: { status: "COMPLETED" }, childId: input.childId },
						select: { amount: true },
					},
				},
			});

			for (const item of paymentItemsRaw) {
				const paidAmount = item.payments.reduce(
					(sum: number, p: { amount: number }) => sum + p.amount,
					0,
				);
				const remaining = item.amount - paidAmount;
				if (remaining > 0) {
					cards.push({
						type: "payment",
						timestamp: item.createdAt,
						id: item.id,
						data: {
							title: item.title,
							amountDuePence: remaining,
							dueDate: item.dueDate,
							category: item.category,
						},
					});
				}
			}

			// 5. Calendar events for this school
			const events = await ctx.prisma.event.findMany({
				where: {
					schoolId,
					...(cursorDate ? { startDate: { lt: cursorDate } } : {}),
				},
				orderBy: { startDate: "desc" },
				take: input.limit,
			});

			for (const evt of events) {
				cards.push({
					type: "event",
					timestamp: evt.startDate,
					id: evt.id,
					data: {
						title: evt.title,
						startDate: evt.startDate,
						endDate: evt.endDate,
						category: evt.category,
						allDay: evt.allDay,
					},
				});
			}

			// Merge and sort all cards by timestamp descending
			cards.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

			// Apply pagination limit + 1 to detect next page
			const page = cards.slice(0, input.limit);
			const hasMore = cards.length > input.limit;

			const lastItem = page[page.length - 1];
			const nextCursor =
				hasMore && lastItem
					? { timestamp: lastItem.timestamp.toISOString(), id: lastItem.id }
					: null;

			return { items: page, nextCursor };
		}),

	getActionItems: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify parent-child link
			const link = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: { userId: ctx.user.id, childId: input.childId },
				},
				include: { child: { select: { schoolId: true } } },
			});

			if (!link) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this child" });
			}

			const schoolId = link.child.schoolId;

			type ActionItem =
				| { type: "payment"; [key: string]: unknown }
				| { type: "form"; [key: string]: unknown }
				| { type: "urgentMessage"; [key: string]: unknown };

			const items: ActionItem[] = [];

			// 1. Outstanding payments
			const paymentItemsRaw = await ctx.prisma.paymentItem.findMany({
				where: {
					children: { some: { childId: input.childId } },
				},
				include: {
					payments: {
						where: { payment: { status: "COMPLETED" }, childId: input.childId },
						select: { amount: true },
					},
				},
			});

			for (const item of paymentItemsRaw) {
				const paidAmount = item.payments.reduce(
					(sum: number, p: { amount: number }) => sum + p.amount,
					0,
				);
				const remaining = item.amount - paidAmount;
				if (remaining > 0) {
					items.push({
						type: "payment",
						title: item.title,
						amountDuePence: remaining,
						dueDate: item.dueDate,
						category: item.category,
						paymentItemId: item.id,
					});
				}
			}

			// 2. Pending forms (active templates with no response for this child)
			const templates = await ctx.prisma.formTemplate.findMany({
				where: { schoolId, isActive: true },
				include: {
					responses: {
						where: { childId: input.childId },
						select: { id: true },
					},
				},
			});

			for (const tmpl of templates) {
				if (tmpl.responses.length === 0) {
					items.push({
						type: "form",
						title: tmpl.title,
						templateId: tmpl.id,
					});
				}
			}

			// 3. Unread urgent messages
			const urgentMessages = await ctx.prisma.message.findMany({
				where: {
					category: "URGENT",
					children: { some: { childId: input.childId } },
					reads: { none: { userId: ctx.user.id } },
				},
				select: { id: true, subject: true },
			});

			for (const msg of urgentMessages) {
				items.push({
					type: "urgentMessage",
					subject: msg.subject,
					messageId: msg.id,
				});
			}

			return items;
		}),

	getSetupStatus: schoolAdminProcedure.query(async ({ ctx }) => {
		const [school, staffCount, childCount, messageCount] = await Promise.all([
			ctx.prisma.school.findUnique({
				where: { id: ctx.schoolId },
				select: { stripeAccountId: true },
			}),
			ctx.prisma.staffMember.count({ where: { schoolId: ctx.schoolId } }),
			ctx.prisma.child.count({ where: { schoolId: ctx.schoolId } }),
			ctx.prisma.message.count({ where: { schoolId: ctx.schoolId } }),
		]);

		return {
			stripeConnected: !!school?.stripeAccountId,
			staffInvited: staffCount > 1,
			childrenImported: childCount > 0,
			firstMessageSent: messageCount > 0,
		};
	}),
});
