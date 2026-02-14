import { describe, expect, it } from "vitest";
import type { Context } from "../context";
import { appRouter } from "../router";

const mockUser = {
	id: "user-1",
	name: "Staff User",
	email: "staff@example.com",
	emailVerified: false,
	image: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockSession = {
	id: "session-1",
	userId: "user-1",
	token: "token-1",
	expiresAt: new Date(Date.now() + 86400000),
	createdAt: new Date(),
	updatedAt: new Date(),
	ipAddress: null,
	userAgent: null,
};

const schoolId = "school-1";

function createTestContext(overrides?: Partial<Context>): Context {
	return {
		prisma: {} as Context["prisma"],
		req: {} as Context["req"],
		res: {} as Context["res"],
		user: null,
		session: null,
		...overrides,
	};
}

function authedContext(prismaMock: Record<string, unknown>): Context {
	return createTestContext({
		user: mockUser,
		session: mockSession,
		prisma: {
			staffMember: {
				findUnique: async () => ({
					id: "staff-1",
					userId: "user-1",
					schoolId,
					role: "ADMIN",
				}),
			},
			...prismaMock,
		} as unknown as Context["prisma"],
	});
}

const from = new Date("2024-01-01");
const to = new Date("2024-12-31");

describe("analytics router", () => {
	describe("attendance", () => {
		it("returns attendance analytics for happy path", async () => {
			const today = new Date();
			today.setUTCHours(0, 0, 0, 0);

			const ctx = authedContext({
				attendanceRecord: {
					findMany: async ({ where }: { where: Record<string, unknown> }) => {
						// Today's records query vs period records query
						const whereDate = where.date as { gte: Date; lte: Date };
						if (whereDate.gte >= today) {
							return [
								{ childId: "c1", date: today, mark: "PRESENT" },
								{ childId: "c2", date: today, mark: "ABSENT_AUTHORISED" },
							];
						}
						return [
							{ childId: "c1", date: new Date("2024-06-01"), mark: "PRESENT" },
							{ childId: "c1", date: new Date("2024-06-02"), mark: "PRESENT" },
							{ childId: "c2", date: new Date("2024-06-01"), mark: "ABSENT_AUTHORISED" },
							{ childId: "c2", date: new Date("2024-06-02"), mark: "LATE" },
						];
					},
				},
				child: {
					findMany: async () => [
						{ id: "c1", className: "Year 1" },
						{ id: "c2", className: "Year 2" },
					],
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.attendance({ schoolId, from, to });

			expect(result.todayRate).toBe(50);
			expect(result.periodRate).toBe(75);
			expect(result.trend).toHaveLength(2);
			expect(result.byClass).toHaveLength(2);
		});

		it("returns zeroes for empty data", async () => {
			const ctx = authedContext({
				attendanceRecord: {
					findMany: async () => [],
				},
				child: {
					findMany: async () => [],
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.attendance({ schoolId, from, to });

			expect(result.todayRate).toBe(0);
			expect(result.periodRate).toBe(0);
			expect(result.trend).toHaveLength(0);
			expect(result.belowThresholdCount).toBe(0);
			expect(result.byClass).toHaveLength(0);
		});
	});

	describe("payments", () => {
		it("returns payment analytics for happy path", async () => {
			const ctx = authedContext({
				paymentItem: {
					findMany: async () => [
						{
							id: "pi1",
							title: "Trip Fee",
							amount: 2500,
							dueDate: new Date("2024-01-01"),
							children: [{ childId: "c1" }, { childId: "c2" }],
							payments: [
								{ amount: 2500, payment: { status: "COMPLETED" } },
							],
						},
					],
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.payments({ schoolId, from, to });

			expect(result.collectedTotal).toBe(2500);
			expect(result.outstandingTotal).toBe(2500);
			expect(result.collectionRate).toBe(50);
			expect(result.overdueCount).toBe(1);
			expect(result.byItem).toHaveLength(1);
			expect(result.byItem[0].itemTitle).toBe("Trip Fee");
		});

		it("returns zeroes for empty data", async () => {
			const ctx = authedContext({
				paymentItem: {
					findMany: async () => [],
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.payments({ schoolId, from, to });

			expect(result.outstandingTotal).toBe(0);
			expect(result.collectedTotal).toBe(0);
			expect(result.collectionRate).toBe(0);
			expect(result.overdueCount).toBe(0);
			expect(result.byItem).toHaveLength(0);
		});
	});

	describe("forms", () => {
		it("returns forms analytics for happy path", async () => {
			const ctx = authedContext({
				formTemplate: {
					findMany: async () => [
						{
							id: "ft1",
							title: "Consent Form",
							responses: [{ id: "fr1" }, { id: "fr2" }],
						},
					],
				},
				child: {
					count: async () => 5,
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.forms({ schoolId, from, to });

			expect(result.completionRate).toBe(40);
			expect(result.pendingCount).toBe(3);
			expect(result.byTemplate).toHaveLength(1);
			expect(result.byTemplate[0].templateTitle).toBe("Consent Form");
		});

		it("returns zeroes for empty data", async () => {
			const ctx = authedContext({
				formTemplate: {
					findMany: async () => [],
				},
				child: {
					count: async () => 0,
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.forms({ schoolId, from, to });

			expect(result.pendingCount).toBe(0);
			expect(result.completionRate).toBe(0);
			expect(result.byTemplate).toHaveLength(0);
		});
	});

	describe("messages", () => {
		it("returns message analytics for happy path", async () => {
			const ctx = authedContext({
				message: {
					findMany: async () => [
						{
							id: "m1",
							subject: "Welcome",
							createdAt: new Date("2024-06-01"),
							reads: [{ userId: "parent-1" }],
							children: [
								{
									child: {
										parentLinks: [{ userId: "parent-1" }, { userId: "parent-2" }],
									},
								},
							],
						},
					],
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.messages({ schoolId, from, to });

			expect(result.sentCount).toBe(1);
			expect(result.avgReadRate).toBe(50);
			expect(result.byMessage).toHaveLength(1);
			expect(result.byMessage[0].subject).toBe("Welcome");
			expect(result.byMessage[0].readCount).toBe(1);
			expect(result.byMessage[0].recipientCount).toBe(2);
		});

		it("returns zeroes for empty data", async () => {
			const ctx = authedContext({
				message: {
					findMany: async () => [],
				},
			});

			const caller = appRouter.createCaller(ctx);
			const result = await caller.analytics.messages({ schoolId, from, to });

			expect(result.sentCount).toBe(0);
			expect(result.avgReadRate).toBe(0);
			expect(result.byMessage).toHaveLength(0);
		});
	});

	describe("auth rejection", () => {
		it("rejects unauthenticated requests", async () => {
			const caller = appRouter.createCaller(createTestContext());

			await expect(
				caller.analytics.attendance({ schoolId, from, to }),
			).rejects.toThrow("UNAUTHORIZED");
		});

		it("rejects non-staff users", async () => {
			const nonStaffUser = { ...mockUser, id: "non-staff-user", email: "parent@example.com" };
			const nonStaffSession = { ...mockSession, userId: "non-staff-user" };
			const ctx = createTestContext({
				user: nonStaffUser,
				session: nonStaffSession,
				prisma: {
					staffMember: {
						findUnique: async () => null,
					},
				} as unknown as Context["prisma"],
			});

			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.analytics.attendance({ schoolId, from, to }),
			).rejects.toThrow("Not a staff member of this school");
		});
	});
});
