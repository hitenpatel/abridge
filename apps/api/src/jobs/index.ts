import type { PrismaClient } from "@schoolconnect/db";
import { processWellbeingAlerts } from "../crons/wellbeing-alerts";
import { logger } from "../lib/logger";
import { startMisSyncCron } from "../lib/mis-sync-cron";
import { startPaymentReminderCron } from "../lib/payment-reminder-cron";
import { startProgressSummaryCron } from "../lib/progress-summary-cron";
import { createWorker, getQueue, isBullMQActive } from "../lib/queue";
import { Sentry } from "../lib/sentry";
import { checkUndeliveredNotifications } from "./notification-fallback";

const QUEUE_NAMES = {
	WELLBEING_ALERTS: "wellbeing-alerts",
	NOTIFICATION_FALLBACK: "notification-fallback",
	MIS_SYNC: "mis-sync",
	PROGRESS_SUMMARY: "progress-summary",
	PAYMENT_REMINDERS: "payment-reminders",
} as const;

// Repeatable job schedule definitions
const SCHEDULES: Record<string, { every?: number; pattern?: string }> = {
	[QUEUE_NAMES.WELLBEING_ALERTS]: { every: 60 * 60 * 1000 }, // every 1 hour
	[QUEUE_NAMES.NOTIFICATION_FALLBACK]: { every: 5 * 60 * 1000 }, // every 5 minutes
	[QUEUE_NAMES.MIS_SYNC]: { every: 6 * 60 * 60 * 1000 }, // every 6 hours
	[QUEUE_NAMES.PROGRESS_SUMMARY]: { pattern: "0 22 * * 0" }, // Sunday 10pm
	[QUEUE_NAMES.PAYMENT_REMINDERS]: { pattern: "0 9 * * *" }, // daily at 9am
};

async function registerRepeatableJob(
	queueName: string,
	schedule: { every?: number; pattern?: string },
): Promise<boolean> {
	const queue = getQueue(queueName);
	if (!queue) return false;

	try {
		await queue.upsertJobScheduler(queueName, schedule, { name: queueName });
		logger.info({ queue: queueName, schedule }, "Registered BullMQ repeatable job");
		return true;
	} catch (err) {
		logger.error({ err, queue: queueName }, "Failed to register repeatable job");
		return false;
	}
}

/**
 * Registers all background jobs as BullMQ repeatable jobs and sets up workers.
 * Falls back to setInterval if Redis/BullMQ is unavailable.
 *
 * Returns true if BullMQ is active, false if falling back to setInterval.
 */
export async function registerJobs(prisma: PrismaClient): Promise<boolean> {
	if (!isBullMQActive()) {
		logger.info("BullMQ not available (no REDIS_URL), falling back to setInterval crons");
		startIntervalCrons(prisma);
		return false;
	}

	logger.info("Registering BullMQ jobs...");

	// Register repeatable jobs
	for (const [name, schedule] of Object.entries(SCHEDULES)) {
		await registerRepeatableJob(name, schedule);
	}

	// Wire up workers
	createWorker(QUEUE_NAMES.WELLBEING_ALERTS, async () => {
		await processWellbeingAlerts(prisma);
	});

	createWorker(QUEUE_NAMES.NOTIFICATION_FALLBACK, async () => {
		await checkUndeliveredNotifications(prisma);
	});

	createWorker(QUEUE_NAMES.MIS_SYNC, async () => {
		// runSync is internal to mis-sync-cron; re-use the exported start fn
		// by calling the underlying logic via a one-shot approach
		await runMisSync(prisma);
	});

	createWorker(QUEUE_NAMES.PROGRESS_SUMMARY, async () => {
		await runProgressSummary(prisma);
	});

	createWorker(QUEUE_NAMES.PAYMENT_REMINDERS, async () => {
		await runPaymentReminders(prisma);
	});

	logger.info("BullMQ jobs registered successfully");
	return true;
}

// ---------------------------------------------------------------------------
// Thin wrappers that invoke the existing job logic for BullMQ workers.
// These avoid re-importing the full cron module (which has setInterval inside).
// ---------------------------------------------------------------------------

async function runMisSync(prisma: PrismaClient): Promise<void> {
	// The MIS sync cron uses setInterval internally; we directly run the sync
	// by importing and executing the underlying logic.
	// Since startMisSyncCron wraps runSync privately, we must import the function
	// that BullMQ can call directly. We do this by calling startMisSyncCron in a
	// "one-shot" pattern: trigger it, then clear after the first interval tick.
	// Instead, import the underlying prisma operations inline here to avoid
	// duplicating logic — delegate to a small adapter.
	const { runMisSyncOnce } = await import("../lib/mis-sync-cron");
	await runMisSyncOnce(prisma);
}

async function runProgressSummary(prisma: PrismaClient): Promise<void> {
	const { runProgressSummaryOnce } = await import("../lib/progress-summary-cron");
	await runProgressSummaryOnce(prisma);
}

async function runPaymentReminders(prisma: PrismaClient): Promise<void> {
	const { runPaymentRemindersOnce } = await import("../lib/payment-reminder-cron");
	await runPaymentRemindersOnce(prisma);
}

// ---------------------------------------------------------------------------
// setInterval fallback (existing behavior, unchanged)
// ---------------------------------------------------------------------------

function startIntervalCrons(prisma: PrismaClient): void {
	// Notification fallback — every 5 minutes
	setInterval(
		() => {
			checkUndeliveredNotifications(prisma).catch((err) => {
				Sentry.captureException(err);
				logger.error({ err }, "Notification fallback job failed");
			});
		},
		5 * 60 * 1000,
	);

	// Wellbeing alerts — every 15 minutes (original interval kept for compat)
	setInterval(
		() => {
			processWellbeingAlerts(prisma).catch((err) => {
				Sentry.captureException(err);
				logger.error({ err }, "Wellbeing alert cron failed");
			});
		},
		15 * 60 * 1000,
	);

	// MIS sync — every 15 minutes (original interval)
	startMisSyncCron(prisma);

	// Weekly progress summary — checks every hour
	startProgressSummaryCron(prisma);

	// Daily payment reminders — checks every hour
	startPaymentReminderCron(prisma);
}
