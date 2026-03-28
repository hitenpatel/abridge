import { getQueue, isBullMQActive } from "../lib/queue";
import { router, schoolAdminProcedure } from "../trpc";

const QUEUE_NAMES = [
	"wellbeing-alerts",
	"notification-fallback",
	"mis-sync",
	"progress-summary",
	"payment-reminders",
] as const;

export const queueRouter = router({
	getStatus: schoolAdminProcedure.query(async () => {
		const bullmqActive = isBullMQActive();

		if (!bullmqActive) {
			return {
				bullmqActive: false,
				queues: QUEUE_NAMES.map((name) => ({
					name,
					active: 0,
					waiting: 0,
					completed: 0,
					failed: 0,
				})),
			};
		}

		const queueStatuses = await Promise.all(
			QUEUE_NAMES.map(async (name) => {
				const queue = getQueue(name);
				if (!queue) {
					return { name, active: 0, waiting: 0, completed: 0, failed: 0 };
				}

				const [active, waiting, completed, failed] = await Promise.all([
					queue.getActiveCount(),
					queue.getWaitingCount(),
					queue.getCompletedCount(),
					queue.getFailedCount(),
				]);

				return { name, active, waiting, completed, failed };
			}),
		);

		return {
			bullmqActive: true,
			queues: queueStatuses,
		};
	}),
});
