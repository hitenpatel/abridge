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
				},
			});

			// Filter for valid Expo push tokens
			const validTokens: string[] = [];
			const userByToken: Record<string, string> = {};
			for (const user of users) {
				if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
					validTokens.push(user.pushToken);
					userByToken[user.pushToken] = user.id;
				}
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
