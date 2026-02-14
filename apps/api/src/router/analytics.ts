import { z } from "zod";
import { router, schoolStaffProcedure } from "../trpc";

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
			const todayRate = todayRecords.length > 0 ? Math.round((todayPresent / todayRecords.length) * 100) : 0;

			const periodPresent = records.filter(
				(r) => r.mark === "PRESENT" || r.mark === "LATE",
			).length;
			const periodRate = records.length > 0 ? Math.round((periodPresent / records.length) * 100) : 0;

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
				const completedPayments = item.payments.filter(
					(li) => li.payment.status === "COMPLETED",
				);
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

			const totalExpectedAll = items.reduce((sum, item) => sum + item.amount * item.children.length, 0);
			const collectionRate = totalExpectedAll > 0 ? Math.round((collectedTotal / totalExpectedAll) * 100) : 0;

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
			const completionRate = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

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
});
