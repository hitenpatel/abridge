import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../services/notification", () => ({
	notificationService: {
		getInstance: vi.fn().mockReturnValue({
			sendPush: vi.fn().mockResolvedValue({ success: true, count: 1 }),
		}),
	},
}));

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

function allTogglesEnabled() {
	return {
		messagingEnabled: true,
		paymentsEnabled: true,
		attendanceEnabled: true,
		calendarEnabled: true,
		formsEnabled: true,
		paymentDinnerMoneyEnabled: true,
		paymentTripsEnabled: true,
		paymentClubsEnabled: true,
		paymentUniformEnabled: true,
		paymentOtherEnabled: true,
		aiDraftingEnabled: true,
		attendanceAlertsEnabled: true,
	};
}

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "ADMIN" }),
			},
			school: {
				findUnique: vi.fn().mockResolvedValue(allTogglesEnabled()),
				findUniqueOrThrow: vi.fn().mockResolvedValue(allTogglesEnabled()),
				update: vi.fn().mockResolvedValue(allTogglesEnabled()),
			},
			child: {
				findMany: vi.fn().mockResolvedValue([{ id: "child-1" }, { id: "child-2" }]),
			},
			message: {
				create: vi.fn().mockResolvedValue({ id: "msg-1" }),
				findMany: vi.fn().mockResolvedValue([]),
				count: vi.fn().mockResolvedValue(0),
			},
			parentChild: {
				findMany: vi.fn().mockResolvedValue([{ userId: "parent-1" }]),
			},
			paymentItem: {
				create: vi.fn().mockResolvedValue({ id: "item-1" }),
			},
			event: {
				create: vi.fn().mockResolvedValue({ id: "evt-1", title: "New Event" }),
			},
			formTemplate: {
				findMany: vi.fn().mockResolvedValue([]),
			},
		},
		req: {},
		res: {},
		user: { id: "staff-1", name: "Staff User" },
		session: {},
		...overrides,
	};
}

// ─── settings.getFeatureToggles ──────────────────────────────────────────────

describe("settings.getFeatureToggles", () => {
	it("returns all 10 toggle values", async () => {
		const toggleValues = {
			messagingEnabled: true,
			paymentsEnabled: false,
			attendanceEnabled: true,
			calendarEnabled: false,
			formsEnabled: true,
			paymentDinnerMoneyEnabled: true,
			paymentTripsEnabled: false,
			paymentClubsEnabled: true,
			paymentUniformEnabled: false,
			paymentOtherEnabled: true,
		};
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue(allTogglesEnabled()),
					findUniqueOrThrow: vi.fn().mockResolvedValue(toggleValues),
					update: vi.fn(),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		const result = await caller.settings.getFeatureToggles({ schoolId: "school-1" });

		expect(result).toEqual(toggleValues);
		expect(result.messagingEnabled).toBe(true);
		expect(result.paymentsEnabled).toBe(false);
		expect(result.attendanceEnabled).toBe(true);
		expect(result.calendarEnabled).toBe(false);
		expect(result.formsEnabled).toBe(true);
		expect(result.paymentDinnerMoneyEnabled).toBe(true);
		expect(result.paymentTripsEnabled).toBe(false);
		expect(result.paymentClubsEnabled).toBe(true);
		expect(result.paymentUniformEnabled).toBe(false);
		expect(result.paymentOtherEnabled).toBe(true);
	});

	it("rejects non-staff user", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				staffMember: {
					findUnique: vi.fn().mockResolvedValue(null),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(caller.settings.getFeatureToggles({ schoolId: "school-1" })).rejects.toThrow();
	});
});

// ─── settings.updateFeatureToggles ───────────────────────────────────────────

describe("settings.updateFeatureToggles", () => {
	it("accepts partial updates", async () => {
		const updatedToggles = {
			...allTogglesEnabled(),
			messagingEnabled: false,
			calendarEnabled: false,
		};
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue(allTogglesEnabled()),
					findUniqueOrThrow: vi.fn().mockResolvedValue(allTogglesEnabled()),
					update: vi.fn().mockResolvedValue(updatedToggles),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		const result = await caller.settings.updateFeatureToggles({
			schoolId: "school-1",
			messagingEnabled: false,
			calendarEnabled: false,
		});

		expect(result.messagingEnabled).toBe(false);
		expect(result.calendarEnabled).toBe(false);
		expect(ctx.prisma.school.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "school-1" },
				data: { messagingEnabled: false, calendarEnabled: false },
			}),
		);
	});

	it("rejects non-admin staff", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				staffMember: {
					findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.settings.updateFeatureToggles({
				schoolId: "school-1",
				messagingEnabled: false,
			}),
		).rejects.toThrow("Admin access required");
	});
});

// ─── Feature guard enforcement on messaging.send ─────────────────────────────

describe("messaging.send feature guard", () => {
	it("throws FORBIDDEN when messaging is disabled", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue({
						...allTogglesEnabled(),
						messagingEnabled: false,
					}),
					findUniqueOrThrow: vi.fn(),
					update: vi.fn(),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.messaging.send({
				schoolId: "school-1",
				subject: "Hello",
				body: "World",
				category: "STANDARD",
				allChildren: true,
			}),
		).rejects.toThrow("Messaging is disabled for this school");
	});

	it("succeeds when messaging is enabled", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.messaging.send({
			schoolId: "school-1",
			subject: "Hello",
			body: "World",
			category: "STANDARD",
			allChildren: true,
		});

		expect(result.success).toBe(true);
		expect(result.recipientCount).toBe(2);
	});
});

// ─── Feature guard enforcement on payments.createPaymentItem ─────────────────

describe("payments.createPaymentItem feature guard", () => {
	it("throws FORBIDDEN when payments is disabled", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue({
						...allTogglesEnabled(),
						paymentsEnabled: false,
					}),
					findUniqueOrThrow: vi.fn(),
					update: vi.fn(),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.payments.createPaymentItem({
				schoolId: "school-1",
				title: "Lunch Money",
				amount: 350,
				category: "DINNER_MONEY",
				allChildren: true,
			}),
		).rejects.toThrow("Payments is disabled for this school");
	});

	it("throws FORBIDDEN when category sub-toggle is disabled", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue({
						...allTogglesEnabled(),
						paymentTripsEnabled: false,
					}),
					findUniqueOrThrow: vi.fn(),
					update: vi.fn(),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.payments.createPaymentItem({
				schoolId: "school-1",
				title: "Museum Trip",
				amount: 1500,
				category: "TRIP",
				allChildren: true,
			}),
		).rejects.toThrow("Trip payments are disabled for this school");
	});

	it("succeeds when payments and category are enabled", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.payments.createPaymentItem({
			schoolId: "school-1",
			title: "Lunch Money",
			amount: 350,
			category: "DINNER_MONEY",
			allChildren: true,
		});

		expect(result.success).toBe(true);
		expect(result.recipientCount).toBe(2);
	});
});

// ─── Feature guard enforcement on calendar.createEvent ───────────────────────

describe("calendar.createEvent feature guard", () => {
	it("throws FORBIDDEN when calendar is disabled", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue({
						...allTogglesEnabled(),
						calendarEnabled: false,
					}),
					findUniqueOrThrow: vi.fn(),
					update: vi.fn(),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(
			caller.calendar.createEvent({
				schoolId: "school-1",
				title: "Sports Day",
				startDate: new Date("2026-07-01T09:00:00Z"),
				allDay: true,
				category: "EVENT",
			}),
		).rejects.toThrow("Calendar is disabled for this school");
	});

	it("succeeds when calendar is enabled", async () => {
		const ctx = createTestContext();
		const caller = appRouter.createCaller(ctx);

		const result = await caller.calendar.createEvent({
			schoolId: "school-1",
			title: "Sports Day",
			startDate: new Date("2026-07-01T09:00:00Z"),
			allDay: true,
			category: "EVENT",
		});

		expect(result.success).toBe(true);
		expect(result.eventId).toBe("evt-1");
	});
});

// ─── Feature guard enforcement on forms.getTemplates ─────────────────────────

describe("forms.getTemplates feature guard", () => {
	it("throws FORBIDDEN when forms is disabled", async () => {
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				school: {
					findUnique: vi.fn().mockResolvedValue({
						...allTogglesEnabled(),
						formsEnabled: false,
					}),
					findUniqueOrThrow: vi.fn(),
					update: vi.fn(),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		await expect(caller.forms.getTemplates({ schoolId: "school-1" })).rejects.toThrow(
			"Forms is disabled for this school",
		);
	});

	it("succeeds when forms is enabled", async () => {
		const mockTemplates = [{ id: "t1", title: "Consent Form" }];
		const ctx = createTestContext({
			prisma: {
				...createTestContext().prisma,
				formTemplate: {
					findMany: vi.fn().mockResolvedValue(mockTemplates),
				},
			},
		});
		const caller = appRouter.createCaller(ctx);

		const result = await caller.forms.getTemplates({ schoolId: "school-1" });

		expect(result).toEqual(mockTemplates);
	});
});
