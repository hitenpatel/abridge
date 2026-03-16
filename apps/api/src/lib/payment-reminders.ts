import type { PrismaClient } from "@schoolconnect/db";
import { NotificationService } from "../services/notification";
import { logger } from "./logger";

/**
 * Determines how many days before a due date a parent should receive
 * a payment reminder, based on their payment history.
 *
 * - Parents with >2 late payments get reminders 3 days before due date.
 * - All other parents get reminders 1 day before due date.
 */
async function getLatePaymentCount(
	prisma: PrismaClient,
	userId: string,
): Promise<number> {
	// A "late" payment is one completed after the payment item's due date
	const latePayments = await prisma.payment.findMany({
		where: {
			userId,
			status: "COMPLETED",
			completedAt: { not: null },
		},
		select: {
			completedAt: true,
			lineItems: {
				select: {
					paymentItem: {
						select: { dueDate: true },
					},
				},
			},
		},
	});

	let lateCount = 0;
	for (const payment of latePayments) {
		for (const lineItem of payment.lineItems) {
			if (
				lineItem.paymentItem.dueDate &&
				payment.completedAt &&
				payment.completedAt > lineItem.paymentItem.dueDate
			) {
				lateCount++;
			}
		}
	}

	return lateCount;
}

/**
 * Send predictive payment reminders.
 *
 * For each school with payments enabled, find unpaid payment items
 * with due dates within the reminder window (1-3 days from now).
 * Parents with >2 historically late payments get early reminders
 * (3 days before), others get standard reminders (1 day before).
 */
export async function sendPaymentReminders(prisma: PrismaClient): Promise<{
	sent: number;
	skipped: number;
}> {
	const now = new Date();
	const oneDayFromNow = new Date(now);
	oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
	oneDayFromNow.setHours(23, 59, 59, 999);

	const threeDaysFromNow = new Date(now);
	threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
	threeDaysFromNow.setHours(23, 59, 59, 999);

	// Find all payment items due within 3 days that haven't been fully paid
	const paymentItemChildren = await prisma.paymentItemChild.findMany({
		where: {
			reminderSentAt: null,
			paymentItem: {
				dueDate: {
					gte: now,
					lte: threeDaysFromNow,
				},
				school: {
					paymentsEnabled: true,
				},
			},
		},
		include: {
			paymentItem: {
				select: {
					id: true,
					title: true,
					amount: true,
					dueDate: true,
					school: { select: { id: true, name: true } },
				},
			},
			child: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					parentLinks: { select: { userId: true } },
				},
			},
		},
	});

	const notificationService = new NotificationService(prisma);
	let sent = 0;
	let skipped = 0;

	for (const pic of paymentItemChildren) {
		const dueDate = pic.paymentItem.dueDate;
		if (!dueDate) {
			skipped++;
			continue;
		}

		for (const parentLink of pic.child.parentLinks) {
			// Check if payment already made for this item by this parent
			const existingPayment = await prisma.paymentLineItem.findFirst({
				where: {
					paymentItemId: pic.paymentItem.id,
					childId: pic.child.id,
					payment: {
						userId: parentLink.userId,
						status: "COMPLETED",
					},
				},
			});

			if (existingPayment) {
				skipped++;
				continue;
			}

			// Determine reminder window based on payment history
			const lateCount = await getLatePaymentCount(prisma, parentLink.userId);
			const isFrequentlyLate = lateCount > 2;

			const daysUntilDue = Math.ceil(
				(dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
			);

			// Early reminder (3 days) for frequently late parents
			// Standard reminder (1 day) for on-time parents
			const shouldRemind = isFrequentlyLate
				? daysUntilDue <= 3
				: daysUntilDue <= 1;

			if (!shouldRemind) {
				skipped++;
				continue;
			}

			const amount = (pic.paymentItem.amount / 100).toFixed(2);
			const dueDateStr = dueDate.toLocaleDateString("en-GB");

			try {
				await notificationService.sendPush(
					[parentLink.userId],
					"Payment Reminder",
					`${pic.paymentItem.title} for ${pic.child.firstName} — £${amount} due ${dueDateStr}`,
					{ route: "/dashboard/payments" },
				);

				await prisma.paymentItemChild.update({
					where: {
						paymentItemId_childId: {
							paymentItemId: pic.paymentItem.id,
							childId: pic.child.id,
						},
					},
					data: { reminderSentAt: new Date() },
				});

				sent++;
			} catch (err) {
				logger.warn(
					{
						err,
						paymentItemId: pic.paymentItem.id,
						childId: pic.child.id,
					},
					"Failed to send payment reminder",
				);
			}
		}
	}

	logger.info({ sent, skipped }, "Payment reminders processing complete");
	return { sent, skipped };
}
