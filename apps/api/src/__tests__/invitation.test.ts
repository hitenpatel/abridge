import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/email", () => ({
	sendStaffInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

function createAdminContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({ id: "school-1", name: "Test School" }),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "admin-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
				create: vi.fn().mockResolvedValue({}),
			},
			user: {
				findUnique: vi.fn().mockResolvedValue(null),
				upsert: vi.fn().mockResolvedValue({
					id: "new-user",
					email: "invitee@example.com",
					name: "invitee",
				}),
			},
			$executeRaw: vi.fn().mockResolvedValue(1),
			$queryRaw: vi.fn().mockResolvedValue([]),
		},
		req: {},
		res: {},
		user: { id: "admin-1", name: "Admin", email: "admin@school.com" },
		session: { id: "session-1" },
		...overrides,
	};
}

function createPublicContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			user: {
				findUnique: vi.fn().mockResolvedValue(null),
				upsert: vi.fn().mockResolvedValue({
					id: "new-user",
					email: "invitee@example.com",
					name: "invitee",
				}),
			},
			staffMember: {
				create: vi.fn().mockResolvedValue({}),
			},
			$queryRaw: vi.fn().mockResolvedValue([]),
			$executeRaw: vi.fn().mockResolvedValue(1),
		},
		req: {},
		res: {},
		user: null,
		session: null,
		...overrides,
	};
}

describe("invitation router", () => {
	describe("send", () => {
		it("creates an invitation and sends email", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.invitation.send({
				schoolId: "school-1",
				email: "newteacher@example.com",
				role: "TEACHER",
			});

			expect(result.success).toBe(true);
			expect(result.token).toBeDefined();
			expect(result.emailSent).toBe(true);
			expect(ctx.prisma.$executeRaw).toHaveBeenCalled();
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
					$executeRaw: vi.fn(),
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.invitation.send({
					schoolId: "school-1",
					email: "test@example.com",
					role: "TEACHER",
				}),
			).rejects.toThrow("School not found");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createAdminContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.invitation.send({
					schoolId: "school-1",
					email: "test@example.com",
					role: "TEACHER",
				}),
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
				caller.invitation.send({
					schoolId: "school-1",
					email: "test@example.com",
					role: "TEACHER",
				}),
			).rejects.toThrow("Admin access required");
		});

		it("rejects invalid email", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.invitation.send({
					schoolId: "school-1",
					email: "not-an-email",
					role: "TEACHER",
				}),
			).rejects.toThrow();
		});
	});

	describe("verify", () => {
		it("returns invitation details for valid token", async () => {
			const ctx = createPublicContext({
				prisma: {
					...createPublicContext().prisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							id: "inv-1",
							email: "test@example.com",
							schoolId: "school-1",
							schoolName: "Test School",
							role: "TEACHER",
							token: "valid-token",
							expiresAt: new Date(Date.now() + 86400000),
							acceptedAt: null,
						},
					]),
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.invitation.verify({ token: "valid-token" });

			expect(result).toEqual({
				email: "test@example.com",
				role: "TEACHER",
				schoolName: "Test School",
				schoolId: "school-1",
			});
		});

		it("rejects invalid token", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			await expect(caller.invitation.verify({ token: "bad-token" })).rejects.toThrow(
				"Invalid invitation token",
			);
		});

		it("rejects expired invitation", async () => {
			const ctx = createPublicContext({
				prisma: {
					...createPublicContext().prisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							id: "inv-1",
							email: "test@example.com",
							expiresAt: new Date(Date.now() - 86400000), // expired yesterday
							acceptedAt: null,
						},
					]),
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.invitation.verify({ token: "expired-token" })).rejects.toThrow(
				"Invitation has expired",
			);
		});

		it("rejects already accepted invitation", async () => {
			const ctx = createPublicContext({
				prisma: {
					...createPublicContext().prisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							id: "inv-1",
							email: "test@example.com",
							expiresAt: new Date(Date.now() + 86400000),
							acceptedAt: new Date(), // already accepted
						},
					]),
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.invitation.verify({ token: "used-token" })).rejects.toThrow(
				"Invitation has already been accepted",
			);
		});
	});

	describe("accept", () => {
		it("accepts a valid invitation", async () => {
			const ctx = createPublicContext({
				prisma: {
					$queryRaw: vi.fn().mockResolvedValue([
						{
							id: "inv-1",
							email: "invitee@example.com",
							schoolId: "school-1",
							schoolName: "Test School",
							role: "TEACHER",
							token: "valid-token",
							expiresAt: new Date(Date.now() + 86400000),
							acceptedAt: null,
						},
					]),
					$executeRaw: vi.fn().mockResolvedValue(1),
					user: {
						findUnique: vi.fn().mockResolvedValue(null),
						upsert: vi.fn().mockResolvedValue({
							id: "new-user",
							email: "invitee@example.com",
							name: "invitee",
						}),
						update: vi.fn().mockResolvedValue({}),
					},
					school: {
						findUnique: vi.fn().mockResolvedValue({
							defaultNotifyByPush: true,
							defaultNotifyBySms: false,
							defaultNotifyByEmail: true,
						}),
					},
					staffMember: {
						create: vi.fn().mockResolvedValue({}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.invitation.accept({ token: "valid-token" });

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.staffMember.create).toHaveBeenCalledWith({
				data: {
					userId: "new-user",
					schoolId: "school-1",
					role: "TEACHER",
				},
			});
			expect(ctx.prisma.$executeRaw).toHaveBeenCalled();
		});

		it("rejects invalid token", async () => {
			const ctx = createPublicContext();
			const caller = appRouter.createCaller(ctx);

			await expect(caller.invitation.accept({ token: "bad-token" })).rejects.toThrow(
				"Invalid invitation token",
			);
		});

		it("rejects expired invitation", async () => {
			const ctx = createPublicContext({
				prisma: {
					...createPublicContext().prisma,
					$queryRaw: vi.fn().mockResolvedValue([
						{
							id: "inv-1",
							email: "test@example.com",
							expiresAt: new Date(Date.now() - 86400000),
							acceptedAt: null,
						},
					]),
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.invitation.accept({ token: "expired-token" })).rejects.toThrow(
				"Invitation has expired",
			);
		});
	});

	describe("list", () => {
		it("lists invitations for a school", async () => {
			const mockInvitations = [
				{ id: "inv-1", email: "a@test.com", role: "TEACHER", createdAt: new Date() },
				{ id: "inv-2", email: "b@test.com", role: "ADMIN", createdAt: new Date() },
			];

			const ctx = createAdminContext({
				prisma: {
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "admin-1",
							schoolId: "school-1",
							role: "ADMIN",
						}),
					},
					$queryRaw: vi.fn().mockResolvedValue(mockInvitations),
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.invitation.list({ schoolId: "school-1" });

			expect(result).toHaveLength(2);
			expect(ctx.prisma.$queryRaw).toHaveBeenCalled();
		});

		it("rejects non-admin users", async () => {
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

			await expect(caller.invitation.list({ schoolId: "school-1" })).rejects.toThrow(
				"Admin access required",
			);
		});
	});
});
