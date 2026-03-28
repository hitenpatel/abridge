import type { PrismaClient } from "@schoolconnect/db";
import { logger } from "./logger";
import { sendPaymentReminders } from "./payment-reminders";

/**
 * Start a daily cron that checks for payment reminders at 9am.
 * Runs every hour, but only executes at the configured hour (default: 9).
 */
export function startPaymentReminderCron(prisma: PrismaClient): void {
	const cronHour = Number.parseInt(process.env.PAYMENT_REMINDER_HOUR || "9", 10);
	logger.info({ cronHour }, "Starting payment reminder cron (checks every hour, runs daily)");

	setInterval(
		() => {
			const now = new Date();
			if (now.getHours() !== cronHour) return;

			sendPaymentReminders(prisma).catch((err) => {
				logger.error({ err }, "Payment reminder cron failed");
			});
		},
		60 * 60 * 1000,
	);
}

/** One-shot execution for use by BullMQ workers. */
export async function runPaymentRemindersOnce(prisma: PrismaClient): Promise<void> {
	await sendPaymentReminders(prisma);
}
