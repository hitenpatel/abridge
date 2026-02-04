import { describe, expect, it, vi } from "vitest";
import { NotificationService } from "../services/notification";

vi.mock("expo-server-sdk", () => ({
	Expo: class {
		static isExpoPushToken(token: string) {
			return token.startsWith("ExponentPushToken");
		}
		chunkPushNotifications(msgs: any[]) {
			return [msgs];
		}
		async sendPushNotificationsAsync() {
			return [{ status: "ok", id: "ticket-1" }];
		}
	},
}));

describe("NotificationService", () => {
	it("creates delivery records when sending push", async () => {
		const mockCreate = vi.fn().mockResolvedValue({ id: "del-1" });
		const mockPrisma = {
			user: {
				findMany: vi
					.fn()
					.mockResolvedValue([{ id: "user-1", pushToken: "ExponentPushToken[abc]" }]),
			},
			notificationDelivery: {
				create: mockCreate,
				update: vi.fn(),
			},
		};

		const svc = new NotificationService(mockPrisma as any);
		await svc.sendPush(["user-1"], "Test Title", "Test Body", { messageId: "msg-1" });

		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					userId: "user-1",
					messageId: "msg-1",
					channel: "PUSH",
					status: "SENT",
				}),
			}),
		);
	});

	it("sends SMS fallback when push fails or is not opened", async () => {
		const mockCreate = vi.fn().mockResolvedValue({ id: "del-sms" });
		const mockPrisma = {
			user: {
				findUnique: vi.fn().mockResolvedValue({
					id: "user-1",
					phone: "+1234567890",
					email: "test@example.com",
				}),
			},
			notificationDelivery: {
				create: mockCreate,
			},
		};

		vi.mock("../services/sms", () => ({
			sendSms: vi.fn().mockResolvedValue(true),
		}));

		const svc = new NotificationService(mockPrisma as any);
		const result = await svc.sendFallback("msg-1", "user-1", "Fallback Title", "Fallback Body");

		expect(result).toBe(true);
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					userId: "user-1",
					messageId: "msg-1",
					channel: "SMS",
					status: "SENT",
				}),
			}),
		);
	});
});
