import type { PrismaClient } from "@schoolconnect/db";
import { Expo } from "expo-server-sdk";
import { sendSms } from "./sms";

export class NotificationService {
	private expo: Expo;
	private prisma: PrismaClient;

	constructor(prisma?: PrismaClient) {
		this.expo = new Expo();
		// In production, prisma will be injected via dependency injection
		this.prisma = prisma as PrismaClient;
	}

	async sendPush(userIds: string[], title: string, body: string, data?: Record<string, unknown>) {
		try {
			// Find users with valid push tokens
			const users = await this.prisma.user.findMany({
				where: {
					id: { in: userIds },
					pushToken: { not: null },
				},
				select: {
					id: true,
					pushToken: true,
					quietStart: true,
					quietEnd: true,
				},
			});

			const isUrgent = data?.category === "URGENT";

			// Filter for valid Expo push tokens and respect quiet hours
			const validTokens: string[] = [];
			const userByToken: Record<string, string> = {};
			for (const user of users) {
				if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
					continue;
				}

				// Skip if in quiet hours and not urgent
				if (!isUrgent && this.isInQuietHours(user)) {
					continue;
				}

				validTokens.push(user.pushToken);
				userByToken[user.pushToken] = user.id;
			}

			if (validTokens.length === 0) {
				return { success: true, count: 0 };
			}

			// Create push notification messages
			const messages = validTokens.map((token) => ({
				to: token,
				sound: "default",
				title,
				body: body.length > 100 ? `${body.substring(0, 97)}...` : body,
				data,
			}));

			// Send notifications in chunks (Expo API limit)
			const chunks = this.expo.chunkPushNotifications(messages);
			let successCount = 0;

			for (const chunk of chunks) {
				try {
					const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);

					// Check for failed tickets
					for (let i = 0; i < ticketChunk.length; i++) {
						const ticket = ticketChunk[i];
						const message = chunk[i];
						const userId = userByToken[message.to as string];

						if (ticket.status === "ok") {
							successCount++;

							// Create delivery record if messageId is present
							if (data?.messageId && userId) {
								await this.prisma.notificationDelivery.create({
									data: {
										messageId: data.messageId as string,
										userId,
										channel: "PUSH",
										status: "SENT",
										sentAt: new Date(),
									},
								});
							}
						} else {
							console.warn("Push notification failed:", ticket);

							if (data?.messageId && userId) {
								await this.prisma.notificationDelivery.create({
									data: {
										messageId: data.messageId as string,
										userId,
										channel: "PUSH",
										status: "FAILED",
										error: JSON.stringify(ticket),
									},
								});
							}
						}
					}
				} catch (error) {
					console.error("Error sending push notification chunk:", error);
				}
			}

			return { success: true, count: successCount };
		} catch (error) {
			console.error("Failed to send push notifications:", error);
			return {
				success: false,
				error: "Failed to send notifications",
				count: 0,
			};
		}
	}

	async sendFallback(messageId: string, userId: string, title: string, body: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { phone: true, email: true },
		});

		if (!user) return false;

		// Try SMS fallback if phone exists
		if (user.phone) {
			const success = await sendSms(user.phone, `${title}: ${body}`);
			if (success) {
				await this.prisma.notificationDelivery.create({
					data: {
						messageId,
						userId,
						channel: "SMS",
						status: "SENT",
						sentAt: new Date(),
					},
				});
				return true;
			}
		}

		// Email fallback intent (future enhancement)
		if (user.email) {
			console.log(`[Email Fallback Intent] To: ${user.email}, Subject: ${title}`);
		}

		return false;
	}

	private isInQuietHours(user: { quietStart: string | null; quietEnd: string | null }): boolean {
		if (!user.quietStart || !user.quietEnd) return false;

		const now = new Date();
		const [startH, startM] = user.quietStart.split(":").map(Number);
		const [endH, endM] = user.quietEnd.split(":").map(Number);

		const currentMinutes = now.getHours() * 60 + now.getMinutes();
		const startMinutes = (startH || 0) * 60 + (startM || 0);
		const endMinutes = (endH || 0) * 60 + (endM || 0);

		if (startMinutes <= endMinutes) {
			return currentMinutes >= startMinutes && currentMinutes < endMinutes;
		}
		// Wraps midnight (e.g., 22:00 - 07:00)
		return currentMinutes >= startMinutes || currentMinutes < endMinutes;
	}
}

// Create a singleton instance - we'll need to inject prisma later
let notificationServiceInstance: NotificationService;

export const notificationService = {
	getInstance: (prisma: PrismaClient) => {
		if (!notificationServiceInstance) {
			notificationServiceInstance = new NotificationService(prisma);
		}
		return notificationServiceInstance;
	},
};
