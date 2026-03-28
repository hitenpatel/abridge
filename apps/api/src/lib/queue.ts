import { type Processor, Queue, Worker } from "bullmq";
import { logger } from "./logger";

const DEFAULT_JOB_OPTIONS = {
	attempts: 3,
	backoff: {
		type: "exponential" as const,
		delay: 5000,
	},
};

// Singleton registry of queues and workers
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

function getRedisConnection(): { host: string; port: number } | null {
	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) return null;

	try {
		const url = new URL(redisUrl);
		return {
			host: url.hostname,
			port: Number.parseInt(url.port || "6379", 10),
		};
	} catch {
		logger.warn({ redisUrl }, "Invalid REDIS_URL, BullMQ will not be initialized");
		return null;
	}
}

/**
 * Returns a BullMQ Queue instance for the given name.
 * Returns null if REDIS_URL is not set (graceful degradation).
 */
export function getQueue(name: string): Queue | null {
	const connection = getRedisConnection();
	if (!connection) return null;

	const existing = queues.get(name);
	if (existing) return existing;

	const queue = new Queue(name, {
		connection,
		defaultJobOptions: DEFAULT_JOB_OPTIONS,
	});

	queue.on("error", (err) => {
		logger.error({ err, queue: name }, "BullMQ queue error");
	});

	queues.set(name, queue);
	return queue;
}

/**
 * Creates and registers a BullMQ Worker for the given queue name.
 * Returns null if REDIS_URL is not set (graceful degradation).
 */
export function createWorker(name: string, processor: Processor): Worker | null {
	const connection = getRedisConnection();
	if (!connection) return null;

	const worker = new Worker(name, processor, { connection });

	worker.on("completed", (job) => {
		logger.info({ queue: name, jobId: job.id }, "Job completed");
	});

	worker.on("failed", (job, err) => {
		logger.error({ queue: name, jobId: job?.id, err }, "Job failed");
	});

	worker.on("error", (err) => {
		logger.error({ queue: name, err }, "Worker error");
	});

	workers.set(name, worker);
	return worker;
}

/** Returns true if BullMQ is active (Redis is configured). */
export function isBullMQActive(): boolean {
	return getRedisConnection() !== null;
}

/** Returns a snapshot of all registered queues and workers (for health checks). */
export function getRegisteredQueues(): string[] {
	return Array.from(queues.keys());
}

/** Closes all queues and workers gracefully (call on SIGTERM). */
export async function closeQueues(): Promise<void> {
	const closeWorkers = Array.from(workers.values()).map((w) => w.close());
	const closeQs = Array.from(queues.values()).map((q) => q.close());

	await Promise.all([...closeWorkers, ...closeQs]);

	queues.clear();
	workers.clear();

	logger.info("All BullMQ queues and workers closed");
}
