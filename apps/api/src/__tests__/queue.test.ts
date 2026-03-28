import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

// Mock queue module so we don't need Redis in tests
vi.mock("../lib/queue", () => ({
	isBullMQActive: vi.fn(),
	getQueue: vi.fn(),
	closeQueues: vi.fn().mockResolvedValue(undefined),
	getRegisteredQueues: vi.fn().mockReturnValue([]),
}));

import { getQueue, isBullMQActive } from "../lib/queue";

function createAdminContext(schoolId = "school-1"): any {
	return {
		prisma: {
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({ schoolId, role: "ADMIN" }),
			},
		},
		user: { id: "user-1" },
		session: { id: "session-1" },
		schoolId,
	};
}

describe("queue.getStatus", () => {
	it("returns bullmqActive: false with zero counts when BullMQ is not active", async () => {
		vi.mocked(isBullMQActive).mockReturnValue(false);

		const caller = appRouter.createCaller(createAdminContext());
		const result = await caller.queue.getStatus({ schoolId: "school-1" });

		expect(result.bullmqActive).toBe(false);
		expect(result.queues).toHaveLength(5);
		for (const q of result.queues) {
			expect(q.active).toBe(0);
			expect(q.waiting).toBe(0);
			expect(q.completed).toBe(0);
			expect(q.failed).toBe(0);
		}
	});

	it("returns bullmqActive: true with counts from queues when BullMQ is active", async () => {
		vi.mocked(isBullMQActive).mockReturnValue(true);

		const mockQueue = {
			getActiveCount: vi.fn().mockResolvedValue(2),
			getWaitingCount: vi.fn().mockResolvedValue(1),
			getCompletedCount: vi.fn().mockResolvedValue(100),
			getFailedCount: vi.fn().mockResolvedValue(3),
		};
		vi.mocked(getQueue).mockReturnValue(mockQueue as any);

		const caller = appRouter.createCaller(createAdminContext());
		const result = await caller.queue.getStatus({ schoolId: "school-1" });

		expect(result.bullmqActive).toBe(true);
		expect(result.queues).toHaveLength(5);

		const wellbeing = result.queues.find((q) => q.name === "wellbeing-alerts");
		expect(wellbeing).toBeDefined();
		expect(wellbeing?.active).toBe(2);
		expect(wellbeing?.waiting).toBe(1);
		expect(wellbeing?.completed).toBe(100);
		expect(wellbeing?.failed).toBe(3);
	});

	it("returns zero counts when getQueue returns null even with BullMQ active", async () => {
		vi.mocked(isBullMQActive).mockReturnValue(true);
		vi.mocked(getQueue).mockReturnValue(null);

		const caller = appRouter.createCaller(createAdminContext());
		const result = await caller.queue.getStatus({ schoolId: "school-1" });

		expect(result.bullmqActive).toBe(true);
		for (const q of result.queues) {
			expect(q.active).toBe(0);
		}
	});

	it("requires admin role", async () => {
		const staffCtx: any = {
			prisma: {
				staffMember: {
					findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "STAFF" }),
				},
			},
			user: { id: "user-2" },
			session: { id: "session-2" },
		};

		const caller = appRouter.createCaller(staffCtx);
		await expect(caller.queue.getStatus({ schoolId: "school-1" })).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("includes all expected queue names", async () => {
		vi.mocked(isBullMQActive).mockReturnValue(false);

		const caller = appRouter.createCaller(createAdminContext());
		const result = await caller.queue.getStatus({ schoolId: "school-1" });

		const names = result.queues.map((q) => q.name);
		expect(names).toContain("wellbeing-alerts");
		expect(names).toContain("notification-fallback");
		expect(names).toContain("mis-sync");
		expect(names).toContain("progress-summary");
		expect(names).toContain("payment-reminders");
	});
});
