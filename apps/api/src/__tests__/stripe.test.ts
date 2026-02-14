import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/stripe", () => ({
	stripe: {
		accounts: {
			create: vi.fn().mockResolvedValue({ id: "acct_test123" }),
			retrieve: vi.fn().mockResolvedValue({
				id: "acct_test123",
				details_submitted: true,
				charges_enabled: true,
			}),
		},
		accountLinks: {
			create: vi.fn().mockResolvedValue({
				url: "https://connect.stripe.com/setup/test",
			}),
		},
	},
}));

function createAdminContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
					id: "school-1",
					name: "Test School",
					email: "school@test.com",
					stripeAccountId: null,
				}),
				update: vi.fn().mockResolvedValue({}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "admin-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
		},
		req: {},
		res: {},
		user: { id: "admin-1", name: "Admin", email: "admin@school.com" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("stripe router", () => {
	describe("createOnboardingLink", () => {
		it("creates a new stripe account and returns onboarding link", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.stripe.createOnboardingLink({
				schoolId: "school-1",
			});

			expect(result.url).toBe("https://connect.stripe.com/setup/test");
			expect(ctx.prisma.school.update).toHaveBeenCalledWith({
				where: { id: "school-1" },
				data: { stripeAccountId: "acct_test123" },
			});
		});

		it("uses existing stripe account if already set", async () => {
			const ctx = createAdminContext({
				prisma: {
					school: {
						findUnique: vi.fn().mockResolvedValue({
							id: "school-1",
							name: "Test School",
							stripeAccountId: "acct_existing",
						}),
						update: vi.fn(),
					},
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "admin-1",
							schoolId: "school-1",
							role: "ADMIN",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.stripe.createOnboardingLink({
				schoolId: "school-1",
			});

			expect(result.url).toBe("https://connect.stripe.com/setup/test");
			// Should not update school since account already exists
			expect(ctx.prisma.school.update).not.toHaveBeenCalled();
		});

		it("rejects when school not found", async () => {
			const ctx = createAdminContext({
				prisma: {
					school: { findUnique: vi.fn().mockResolvedValue(null) },
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "admin-1",
							schoolId: "school-1",
							role: "ADMIN",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.stripe.createOnboardingLink({ schoolId: "school-1" }),
			).rejects.toThrow("School not found");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createAdminContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.stripe.createOnboardingLink({ schoolId: "school-1" }),
			).rejects.toThrow("UNAUTHORIZED");
		});

		it("rejects non-admin staff", async () => {
			const ctx = createAdminContext({
				prisma: {
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "teacher-1",
							schoolId: "school-1",
							role: "TEACHER",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.stripe.createOnboardingLink({ schoolId: "school-1" }),
			).rejects.toThrow("Admin access required");
		});
	});

	describe("getStripeStatus", () => {
		it("returns connected status for configured school", async () => {
			const ctx = createAdminContext({
				prisma: {
					school: {
						findUnique: vi.fn().mockResolvedValue({
							id: "school-1",
							stripeAccountId: "acct_test123",
						}),
					},
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "admin-1",
							schoolId: "school-1",
							role: "ADMIN",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.stripe.getStripeStatus({
				schoolId: "school-1",
			});

			expect(result).toEqual({
				isConnected: true,
				detailsSubmitted: true,
				chargesEnabled: true,
			});
		});

		it("returns disconnected status for unconfigured school", async () => {
			const ctx = createAdminContext({
				prisma: {
					school: {
						findUnique: vi.fn().mockResolvedValue({
							id: "school-1",
							stripeAccountId: null,
						}),
					},
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "admin-1",
							schoolId: "school-1",
							role: "ADMIN",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.stripe.getStripeStatus({
				schoolId: "school-1",
			});

			expect(result).toEqual({
				isConnected: false,
				detailsSubmitted: false,
				chargesEnabled: false,
			});
		});

		it("rejects non-admin staff", async () => {
			const ctx = createAdminContext({
				prisma: {
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "teacher-1",
							schoolId: "school-1",
							role: "TEACHER",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.stripe.getStripeStatus({ schoolId: "school-1" }),
			).rejects.toThrow("Admin access required");
		});
	});
});
