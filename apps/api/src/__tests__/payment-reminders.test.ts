import { describe, expect, it, vi } from "vitest";
import { sendPaymentReminders } from "../lib/payment-reminders";

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

vi.mock("../services/sms", () => ({
	sendSms: vi.fn().mockResolvedValue(true),
}));

function createMockPrisma(overrides?: Record<string, any>) {
	const now = new Date();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);

	return {
		paymentItemChild: {
			findMany: vi.fn().mockResolvedValue([
				{
					paymentItem: {
						id: "pi-1",
						title: "School Trip",
						amount: 2500,
						dueDate: tomorrow,
						school: { id: "school-1", name: "Test School" },
					},
					child: {
						id: "child-1",
						firstName: "Alice",
						lastName: "Smith",
						parentLinks: [{ userId: "parent-1" }],
					},
				},
			]),
			update: vi.fn().mockResolvedValue({}),
		},
		payment: {
			findMany: vi.fn().mockResolvedValue([]),
		},
		paymentLineItem: {
			findFirst: vi.fn().mockResolvedValue(null),
		},
		user: {
			findMany: vi.fn().mockResolvedValue([
				{
					id: "parent-1",
					pushToken: "ExponentPushToken[abc123]",
					language: "en",
				},
			]),
		},
		notificationDelivery: {
			create: vi.fn().mockResolvedValue({ id: "del-1" }),
			update: vi.fn(),
		},
		...overrides,
	};
}

describe("sendPaymentReminders", () => {
	it("sends early reminder for parent with >2 late payments", async () => {
		const now = new Date();
		const twoDaysFromNow = new Date(now);
		twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

		const lastMonth = new Date(now);
		lastMonth.setMonth(lastMonth.getMonth() - 1);
		const twoMonthsAgo = new Date(now);
		twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

		const mockPrisma = createMockPrisma();

		// Payment item due in 2 days (outside standard 1-day window, inside 3-day window)
		mockPrisma.paymentItemChild.findMany.mockResolvedValue([
			{
				paymentItem: {
					id: "pi-1",
					title: "Dinner Money",
					amount: 1500,
					dueDate: twoDaysFromNow,
					school: { id: "school-1", name: "Test School" },
				},
				child: {
					id: "child-1",
					firstName: "Alice",
					lastName: "Smith",
					parentLinks: [{ userId: "parent-1" }],
				},
			},
		]);

		// Parent has 3 late payments in history
		mockPrisma.payment.findMany.mockResolvedValue([
			{
				completedAt: new Date(lastMonth.getTime() + 86400000 * 5),
				lineItems: [{ paymentItem: { dueDate: lastMonth } }],
			},
			{
				completedAt: new Date(twoMonthsAgo.getTime() + 86400000 * 3),
				lineItems: [{ paymentItem: { dueDate: twoMonthsAgo } }],
			},
			{
				completedAt: new Date(twoMonthsAgo.getTime() + 86400000 * 7),
				lineItems: [
					{
						paymentItem: {
							dueDate: new Date(twoMonthsAgo.getTime() - 86400000 * 14),
						},
					},
				],
			},
		]);

		const result = await sendPaymentReminders(mockPrisma as any);

		expect(result.sent).toBe(1);
		expect(mockPrisma.paymentItemChild.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					paymentItemId_childId: {
						paymentItemId: "pi-1",
						childId: "child-1",
					},
				},
				data: { reminderSentAt: expect.any(Date) },
			}),
		);
	});

	it("sends standard reminder (1 day before) for on-time parent", async () => {
		const now = new Date();
		const twoDaysFromNow = new Date(now);
		twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

		const mockPrisma = createMockPrisma();

		// Payment item due in 2 days (outside 1-day standard window)
		mockPrisma.paymentItemChild.findMany.mockResolvedValue([
			{
				paymentItem: {
					id: "pi-1",
					title: "School Trip",
					amount: 2500,
					dueDate: twoDaysFromNow,
					school: { id: "school-1", name: "Test School" },
				},
				child: {
					id: "child-1",
					firstName: "Bob",
					lastName: "Jones",
					parentLinks: [{ userId: "parent-2" }],
				},
			},
		]);

		// Parent has 0 late payments (good payer)
		mockPrisma.payment.findMany.mockResolvedValue([]);

		const result = await sendPaymentReminders(mockPrisma as any);

		// Should NOT send because on-time parent only gets 1-day reminder,
		// and the due date is 2 days away
		expect(result.sent).toBe(0);
		expect(result.skipped).toBe(1);
		expect(mockPrisma.paymentItemChild.update).not.toHaveBeenCalled();
	});
});
