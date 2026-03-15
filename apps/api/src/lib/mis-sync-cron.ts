import type { PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import { getAdapter } from "./mis/adapter-factory";

const FREQUENCY_MS: Record<string, number> = {
	HOURLY: 60 * 60 * 1000,
	TWICE_DAILY: 12 * 60 * 60 * 1000,
	DAILY: 24 * 60 * 60 * 1000,
};

const CRON_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function isSyncDue(syncFrequency: string, lastSyncAt: Date | null): boolean {
	if (syncFrequency === "MANUAL") return false;

	const intervalMs = FREQUENCY_MS[syncFrequency];
	if (!intervalMs) return false;

	if (!lastSyncAt) return true;

	const elapsed = Date.now() - lastSyncAt.getTime();
	return elapsed >= intervalMs;
}

async function runSync(prisma: PrismaClient): Promise<void> {
	const connections = await prisma.misConnection.findMany({
		where: { status: "CONNECTED" },
	});

	for (const connection of connections) {
		if (!isSyncDue(connection.syncFrequency, connection.lastSyncAt)) {
			continue;
		}

		logger.info(
			{ connectionId: connection.id, provider: connection.provider },
			"Starting scheduled MIS sync",
		);

		const startedAt = new Date();

		const syncLog = await prisma.misSyncLog.create({
			data: {
				connectionId: connection.id,
				syncType: "STUDENTS",
				status: "STARTED",
				startedAt,
			},
		});

		try {
			const adapter = getAdapter(connection.provider, connection.apiUrl, connection.credentials);

			const result = await adapter.syncStudents("");

			let created = 0;
			let updated = 0;

			for (const record of result.records) {
				const existing = await prisma.child.findFirst({
					where: {
						schoolId: connection.schoolId,
						firstName: record.firstName,
						lastName: record.lastName,
						dateOfBirth: record.dateOfBirth,
					},
				});

				if (existing) {
					await prisma.child.update({
						where: { id: existing.id },
						data: {
							yearGroup: record.yearGroup,
							className: record.className ?? existing.className,
						},
					});
					updated++;
				} else {
					await prisma.child.create({
						data: {
							schoolId: connection.schoolId,
							firstName: record.firstName,
							lastName: record.lastName,
							dateOfBirth: record.dateOfBirth,
							yearGroup: record.yearGroup,
							className: record.className ?? null,
						},
					});
					created++;
				}
			}

			const completedAt = new Date();

			await prisma.misSyncLog.update({
				where: { id: syncLog.id },
				data: {
					status: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
					recordsProcessed: result.records.length + result.errors.length,
					recordsCreated: created,
					recordsUpdated: updated,
					recordsSkipped: result.errors.length,
					errors: result.errors.length > 0 ? result.errors : undefined,
					completedAt,
					durationMs: completedAt.getTime() - startedAt.getTime(),
				},
			});

			await prisma.misConnection.update({
				where: { id: connection.id },
				data: {
					lastSyncAt: completedAt,
					lastSyncStatus: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
					lastSyncError: null,
				},
			});

			logger.info(
				{
					connectionId: connection.id,
					created,
					updated,
					errors: result.errors.length,
				},
				"MIS sync completed",
			);
		} catch (error) {
			const completedAt = new Date();
			const errorMessage = error instanceof Error ? error.message : "Unknown error";

			await prisma.misSyncLog.update({
				where: { id: syncLog.id },
				data: {
					status: "FAILED",
					errors: [{ message: errorMessage }],
					completedAt,
					durationMs: completedAt.getTime() - startedAt.getTime(),
				},
			});

			await prisma.misConnection.update({
				where: { id: connection.id },
				data: {
					lastSyncAt: completedAt,
					lastSyncStatus: "FAILED",
					lastSyncError: errorMessage,
				},
			});

			logger.error({ connectionId: connection.id, error: errorMessage }, "MIS sync failed");
		}
	}
}

export function startMisSyncCron(prisma: PrismaClient): NodeJS.Timeout {
	logger.info("Starting MIS sync cron (every 15 minutes)");

	return setInterval(() => {
		runSync(prisma).catch((err) => {
			logger.error({ err }, "MIS sync cron failed");
		});
	}, CRON_INTERVAL_MS);
}
