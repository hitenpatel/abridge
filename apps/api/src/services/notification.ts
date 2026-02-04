import type { PrismaClient } from "@schoolconnect/db";
import { Expo } from "expo-server-sdk";
import { sendSms } from "./sms";
import { translateText } from "./translator";

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
					language: true,
				},
			});

			const isUrgent = data?.category === "URGENT";

			// Group users by language and filter by quiet hours
			const groups: Record<string, { userIds: string[]; tokens: string[] }> = {};

			for (const user of users) {
				if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
					continue;
				}

				// Skip if in quiet hours and not urgent
				if (!isUrgent && this.isInQuietHours(user)) {
					continue;
				}

				const lang = user.language || "en";
				if (!groups[lang]) {
					groups[lang] = { userIds: [], tokens: [] };
				}
				groups[lang].userIds.push(user.id);
				groups[lang].tokens.push(user.pushToken);
			}

			let successCount = 0;
			const userByToken: Record<string, string> = {};

			// Process each language group
			for (const [lang, group] of Object.entries(groups)) {
				const translatedTitle = await translateText(title, lang);
				const translatedBody = await translateText(body, lang);

				const messages = group.tokens.map((token, idx) => {
					userByToken[token] = group.userIds[idx];
					return {
						to: token,
						sound: "default",
						title: translatedTitle,
						body:
							translatedBody.length > 100
								? `${translatedBody.substring(0, 97)}...`
								: translatedBody,
						data,
					};
				});

				// Send notifications in chunks
				const chunks = this.expo.chunkPushNotifications(messages);

				for (const chunk of chunks) {
					try {
						const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);

						for (let i = 0; i < ticketChunk.length; i++) {
							const ticket = ticketChunk[i];
							const message = chunk[i];
							const userId = userByToken[message.to as string];

							if (ticket.status === "ok") {
								successCount++;
								if (data?.messageId && userId) {
									await this.prisma.notificationDelivery
										.create({
											data: {
												messageId: data.messageId as string,
												userId,
												channel: "PUSH",
												status: "SENT",
												sentAt: new Date(),
											},
										})
										.catch(() => {});
								}
							} else {
								console.warn("Push notification failed:", ticket);
								if (data?.messageId && userId) {
									await this.prisma.notificationDelivery
										.create({
											data: {
												messageId: data.messageId as string,
												userId,
												channel: "PUSH",
												status: "FAILED",
												error: JSON.stringify(ticket),
											},
										})
										.catch(() => {});
								}
							}
						}
					} catch (error) {
						console.error("Error sending push notification chunk:", error);
					}
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
