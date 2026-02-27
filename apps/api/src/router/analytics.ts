import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { router, schoolFeatureProcedure, schoolStaffProcedure } from "../trpc";

const dateRangeInput = z.object({
	schoolId: z.string(),
	from: z.date(),
	to: z.date(),
});

export const analyticsRouter = router({
	termStart: schoolStaffProcedure.query(async ({ ctx }) => {
		const now = new Date();
		const event = await ctx.prisma.event.findFirst({
			where: {
				schoolId: ctx.schoolId,
				category: "TERM_DATE",
				startDate: { lte: now },
			},
			orderBy: { startDate: "desc" },
		});
		if (event) return event.startDate;
		// Fall back to September 1st of current academic year
		const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
		return new Date(year, 8, 1);
	}),

	attendance: schoolStaffProcedure
		.input(dateRangeInput.omit({ schoolId: true }))
		.query(async ({ ctx, input }) => {
			const { schoolId } = ctx;
			const { from, to } = input;

			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);
			const todayEnd = new Date(today);
			todayEnd.setUTCHours(23, 59, 59, 999);

			// All records in range excluding NOT_REQUIRED
			const records = await ctx.prisma.attendanceRecord.findMany({
				where: {
					schoolId,
					date: { gte: from, lte: to },
					mark: { not: "NOT_REQUIRED" },
				},
				select: { childId: true, date: true, mark: true },
			});

			// Today's records (excluding NOT_REQUIRED)
			const todayRecords = await ctx.prisma.attendanceRecord.findMany({
				where: {
					schoolId,
					date: { gte: today, lte: todayEnd },
					mark: { not: "NOT_REQUIRED" },
				},
				select: { mark: true },
			});

			const todayPresent = todayRecords.filter(
				(r) => r.mark === "PRESENT" || r.mark === "LATE",
			).length;
			const todayRate =
				todayRecords.length > 0 ? Math.round((todayPresent / todayRecords.length) * 100) : 0;

			const periodPresent = records.filter((r) => r.mark === "PRESENT" || r.mark === "LATE").length;
			const periodRate =
				records.length > 0 ? Math.round((periodPresent / records.length) * 100) : 0;

			// Daily trend
			const dailyMap = new Map<string, { present: number; total: number }>();
			for (const r of records) {
				const key = r.date.toISOString().slice(0, 10);
				const entry = dailyMap.get(key) || { present: 0, total: 0 };
				entry.total++;
				if (r.mark === "PRESENT" || r.mark === "LATE") entry.present++;
				dailyMap.set(key, entry);
			}
			const trend = Array.from(dailyMap.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([date, { present, total }]) => ({
					date,
					rate: Math.round((present / total) * 100),
				}));

			// Below threshold (90%) per child
			const childMap = new Map<string, { present: number; total: number }>();
			for (const r of records) {
				const entry = childMap.get(r.childId) || { present: 0, total: 0 };
				entry.total++;
				if (r.mark === "PRESENT" || r.mark === "LATE") entry.present++;
				childMap.set(r.childId, entry);
			}
			const belowThresholdCount = Array.from(childMap.values()).filter(
				({ present, total }) => total > 0 && (present / total) * 100 < 90,
			).length;

			// By class breakdown
			const children = await ctx.prisma.child.findMany({
				where: { schoolId },
				select: { id: true, className: true },
			});
			const childClassMap = new Map(children.map((c) => [c.id, c.className || "Unassigned"]));

			const classMap = new Map<string, { present: number; total: number }>();
			for (const r of records) {
				const className = childClassMap.get(r.childId) || "Unassigned";
				const entry = classMap.get(className) || { present: 0, total: 0 };
				entry.total++;
				if (r.mark === "PRESENT" || r.mark === "LATE") entry.present++;
				classMap.set(className, entry);
			}
			const byClass = Array.from(classMap.entries()).map(([className, { present, total }]) => ({
				className,
				rate: Math.round((present / total) * 100),
				presentCount: present,
				totalCount: total,
			}));

			return { todayRate, periodRate, trend, belowThresholdCount, byClass };
		}),

	payments: schoolStaffProcedure
		.input(dateRangeInput.omit({ schoolId: true }))
		.query(async ({ ctx, input }) => {
			const { schoolId } = ctx;
			const { from, to } = input;

			const items = await ctx.prisma.paymentItem.findMany({
				where: {
					schoolId,
					createdAt: { gte: from, lte: to },
				},
				include: {
					children: true,
					payments: {
						include: {
							payment: { select: { status: true } },
						},
					},
				},
			});

			let outstandingTotal = 0;
			let collectedTotal = 0;
			let overdueCount = 0;
			const now = new Date();

			const byItem = items.map((item) => {
				const totalCount = item.children.length;
				const completedPayments = item.payments.filter((li) => li.payment.status === "COMPLETED");
				const collectedCount = completedPayments.length;
				const collectedAmount = completedPayments.reduce((sum, li) => sum + li.amount, 0);
				const totalExpected = item.amount * totalCount;
				const itemOutstanding = totalExpected - collectedAmount;
				const itemRate = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

				collectedTotal += collectedAmount;
				outstandingTotal += Math.max(0, itemOutstanding);

				if (item.dueDate && item.dueDate < now && itemRate < 100) {
					overdueCount++;
				}

				return {
					itemTitle: item.title,
					collectedCount,
					totalCount,
					amount: item.amount,
					collectionRate: itemRate,
				};
			});

			const totalExpectedAll = items.reduce(
				(sum, item) => sum + item.amount * item.children.length,
				0,
			);
			const collectionRate =
				totalExpectedAll > 0 ? Math.round((collectedTotal / totalExpectedAll) * 100) : 0;

			return { outstandingTotal, collectedTotal, collectionRate, overdueCount, byItem };
		}),

	forms: schoolStaffProcedure
		.input(dateRangeInput.omit({ schoolId: true }))
		.query(async ({ ctx, input }) => {
			const { schoolId } = ctx;
			const { from, to } = input;

			const templates = await ctx.prisma.formTemplate.findMany({
				where: {
					schoolId,
					createdAt: { gte: from, lte: to },
					isActive: true,
				},
				include: {
					responses: { select: { id: true } },
				},
			});

			// Get child count for each template (all children in school)
			const schoolChildCount = await ctx.prisma.child.count({
				where: { schoolId },
			});

			let totalSubmitted = 0;
			let totalExpected = 0;

			const byTemplate = templates.map((t) => {
				const submittedCount = t.responses.length;
				const tTotal = schoolChildCount;
				totalSubmitted += submittedCount;
				totalExpected += tTotal;

				return {
					templateTitle: t.title,
					submittedCount,
					totalCount: tTotal,
					completionRate: tTotal > 0 ? Math.round((submittedCount / tTotal) * 100) : 0,
				};
			});

			const pendingCount = totalExpected - totalSubmitted;
			const completionRate =
				totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

			return { pendingCount: Math.max(0, pendingCount), completionRate, byTemplate };
		}),

	messages: schoolStaffProcedure
		.input(dateRangeInput.omit({ schoolId: true }))
		.query(async ({ ctx, input }) => {
			const { schoolId } = ctx;
			const { from, to } = input;

			const messages = await ctx.prisma.message.findMany({
				where: {
					schoolId,
					createdAt: { gte: from, lte: to },
				},
				include: {
					reads: { select: { userId: true } },
					children: {
						include: {
							child: {
								include: {
									parentLinks: { select: { userId: true } },
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
			});

			const sentCount = messages.length;
			let totalReadRate = 0;

			const byMessage = messages.map((msg) => {
				// Distinct recipient parent user IDs
				const recipientUserIds = new Set<string>();
				for (const mc of msg.children) {
					for (const pl of mc.child.parentLinks) {
						recipientUserIds.add(pl.userId);
					}
				}
				const recipientCount = recipientUserIds.size;

				// Reads by distinct users who are recipients
				const readUserIds = new Set(msg.reads.map((r) => r.userId));
				const readCount = Array.from(readUserIds).filter((uid) => recipientUserIds.has(uid)).length;

				const readRate = recipientCount > 0 ? Math.round((readCount / recipientCount) * 100) : 0;
				totalReadRate += readRate;

				return {
					subject: msg.subject,
					sentAt: msg.createdAt,
					readCount,
					recipientCount,
					readRate,
				};
			});

			const avgReadRate = sentCount > 0 ? Math.round(totalReadRate / sentCount) : 0;

			return { sentCount, avgReadRate, byMessage };
		}),

	getAttendanceSummary: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "analytics");

			const breakdown = await ctx.prisma.attendanceRecord.groupBy({
				by: ["mark"],
				where: {
					schoolId: input.schoolId,
					date: {
						gte: input.startDate,
						lte: input.endDate,
					},
				},
				_count: { id: true },
			});

			const totalRecords = breakdown.reduce((sum, row) => sum + row._count.id, 0);

			const present = breakdown.find((r) => r.mark === "PRESENT")?._count.id ?? 0;
			const late = breakdown.find((r) => r.mark === "LATE")?._count.id ?? 0;
			const attendanceRate = totalRecords > 0 ? ((present + late) / totalRecords) * 100 : 0;

			return {
				totalRecords,
				attendanceRate: Math.round(attendanceRate * 10) / 10,
				breakdown: breakdown.map((row) => ({
					mark: row.mark,
					count: row._count.id,
				})),
			};
		}),

	getPaymentSummary: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "analytics");

			const [totalCollected, totalOutstanding] = await Promise.all([
				ctx.prisma.paymentLineItem.aggregate({
					where: {
						paymentItem: { schoolId: input.schoolId },
						payment: {
							status: "COMPLETED",
							createdAt: {
								gte: input.startDate,
								lte: input.endDate,
							},
						},
					},
					_sum: { amount: true },
				}),
				ctx.prisma.paymentItemChild.count({
					where: {
						paymentItem: { schoolId: input.schoolId },
					},
				}),
			]);

			return {
				totalCollectedPence: totalCollected._sum?.amount ?? 0,
				outstandingCount: totalOutstanding,
			};
		}),

	getMessageEngagement: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "analytics");

			const [totalSent, totalRead] = await Promise.all([
				ctx.prisma.message.count({
					where: {
						schoolId: input.schoolId,
						createdAt: {
							gte: input.startDate,
							lte: input.endDate,
						},
					},
				}),
				ctx.prisma.messageRead.count({
					where: {
						message: {
							schoolId: input.schoolId,
							createdAt: {
								gte: input.startDate,
								lte: input.endDate,
							},
						},
					},
				}),
			]);

			const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

			return {
				totalSent,
				totalRead,
				readRate: Math.round(readRate * 10) / 10,
			};
		}),

	getFormCompletion: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "analytics");

			const templates = await ctx.prisma.formTemplate.findMany({
				where: { schoolId: input.schoolId },
				include: {
					_count: { select: { responses: true } },
				},
				orderBy: { createdAt: "desc" },
				take: 20,
			});

			return templates.map((t) => ({
				id: t.id,
				title: t.title,
				responseCount: t._count.responses,
			}));
		}),

	getDashboardSummary: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "analytics");

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const [attendanceToday, unreadMessages, outstandingPayments, pendingForms] =
				await Promise.all([
					ctx.prisma.attendanceRecord.count({
						where: {
							schoolId: input.schoolId,
							date: today,
							mark: { in: ["PRESENT", "LATE"] },
						},
					}),
					ctx.prisma.message.count({
						where: {
							schoolId: input.schoolId,
							reads: { none: {} },
						},
					}),
					ctx.prisma.paymentItemChild.count({
						where: {
							paymentItem: { schoolId: input.schoolId },
						},
					}),
					ctx.prisma.formTemplate.count({
						where: {
							schoolId: input.schoolId,
							responses: { none: {} },
						},
					}),
				]);

			return {
				attendanceToday,
				unreadMessages,
				outstandingPayments,
				pendingForms,
			};
		}),
});
