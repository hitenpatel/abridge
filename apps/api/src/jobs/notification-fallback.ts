import type { PrismaClient } from "@schoolconnect/db";
import { NotificationService } from "../services/notification";

export async function checkUndeliveredNotifications(prisma: PrismaClient) {
	const fallbackDelayMinutes = Number(process.env.NOTIFICATION_FALLBACK_DELAY_MINUTES || 15);
	const cutoff = new Date(Date.now() - fallbackDelayMinutes * 60 * 1000);

	// Find PUSH deliveries that were sent but not opened within the timeout
	// and have no SMS/EMAIL fallback yet
	const undelivered = await prisma.notificationDelivery.findMany({
		where: {
			channel: "PUSH",
			status: "SENT",
			sentAt: { lt: cutoff },
			message: {
				category: { in: ["URGENT", "STANDARD"] }, // Don't fallback FYI messages
			},
		},
		include: {
			message: { select: { id: true, subject: true, body: true, category: true } },
		},
		take: 100, // Process in batches
	});

	const svc = new NotificationService(prisma);

	for (const delivery of undelivered) {
		// Check if fallback already exists for this user/message
		const hasFallback = await prisma.notificationDelivery.findFirst({
			where: {
				messageId: delivery.messageId,
				userId: delivery.userId,
				channel: { in: ["SMS", "EMAIL"] },
			},
		});

		if (!hasFallback) {
			await svc.sendFallback(
				delivery.messageId,
				delivery.userId,
				delivery.message.subject,
				delivery.message.body,
			);
		}
	}

	if (undelivered.length > 0) {
		console.log(`Processed ${undelivered.length} notification fallback checks`);
	}
}
