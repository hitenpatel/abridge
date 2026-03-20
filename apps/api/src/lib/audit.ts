import { prisma } from "@schoolconnect/db";
import { logger } from "./logger";

export interface AuditLogEntry {
	schoolId: string;
	actorId: string;
	action: string;
	entityType?: string;
	entityId?: string;
	metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				schoolId: entry.schoolId,
				actorId: entry.actorId,
				action: entry.action,
				entityType: entry.entityType ?? null,
				entityId: entry.entityId ?? null,
				// biome-ignore lint/suspicious/noExplicitAny: Prisma Json field accepts any serializable value
				metadata: entry.metadata != null ? (entry.metadata as any) : undefined,
			},
		});
	} catch (error) {
		// Never fail the request due to audit logging
		logger.error({ err: error, ...entry }, "Failed to write audit log");
	}
}
