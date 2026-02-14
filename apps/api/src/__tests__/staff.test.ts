import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

function createAdminContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "admin-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
				findMany: vi.fn().mockResolvedValue([]),
				delete: vi.fn().mockResolvedValue({}),
				update: vi.fn().mockResolvedValue({}),
			},
		},
		req: {},
		res: {},
		user: { id: "admin-1", name: "Admin User", email: "admin@school.com" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("staff router", () => {
	describe("list", () => {
		it("returns staff members for the school", async () => {
			const mockStaff = [
				{
					userId: "admin-1",
					schoolId: "school-1",
					role: "ADMIN",
					user: { id: "admin-1", name: "Admin", email: "admin@school.com", image: null },
				},
				{
					userId: "teacher-1",
					schoolId: "school-1",
					role: "TEACHER",
					user: { id: "teacher-1", name: "Teacher", email: "teacher@school.com", image: null },
				},
			];

			const ctx = createAdminContext({
				prisma: {
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "admin-1",
							schoolId: "school-1",
							role: "ADMIN",
						}),
						findMany: vi.fn().mockResolvedValue(mockStaff),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.staff.list({ schoolId: "school-1" });

			expect(result).toHaveLength(2);
			expect(result[0].role).toBe("ADMIN");
			expect(ctx.prisma.staffMember.findMany).toHaveBeenCalledWith({
				where: { schoolId: "school-1" },
				include: {
					user: {
						select: { id: true, name: true, email: true, image: true },
					},
				},
				orderBy: { role: "asc" },
			});
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createAdminContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.staff.list({ schoolId: "school-1" }),
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
				caller.staff.list({ schoolId: "school-1" }),
			).rejects.toThrow("Admin access required");
		});
	});

	describe("remove", () => {
		it("removes a staff member", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.staff.remove({
				schoolId: "school-1",
				userId: "teacher-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.staffMember.delete).toHaveBeenCalledWith({
				where: {
					userId_schoolId: {
						userId: "teacher-1",
						schoolId: "school-1",
					},
				},
			});
		});

		it("prevents removing yourself", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.staff.remove({
					schoolId: "school-1",
					userId: "admin-1",
				}),
			).rejects.toThrow("You cannot remove yourself");
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

			await expect(
				caller.staff.remove({ schoolId: "school-1", userId: "other-1" }),
			).rejects.toThrow("Admin access required");
		});
	});

	describe("updateRole", () => {
		it("updates a staff member role", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.staff.updateRole({
				schoolId: "school-1",
				userId: "teacher-1",
				role: "OFFICE",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.staffMember.update).toHaveBeenCalledWith({
				where: {
					userId_schoolId: {
						userId: "teacher-1",
						schoolId: "school-1",
					},
				},
				data: { role: "OFFICE" },
			});
		});

		it("prevents downgrading your own role", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.staff.updateRole({
					schoolId: "school-1",
					userId: "admin-1",
					role: "TEACHER",
				}),
			).rejects.toThrow("You cannot downgrade your own role");
		});

		it("allows setting your own role to ADMIN (no-op)", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.staff.updateRole({
				schoolId: "school-1",
				userId: "admin-1",
				role: "ADMIN",
			});

			expect(result).toEqual({ success: true });
		});

		it("rejects invalid role values", async () => {
			const ctx = createAdminContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.staff.updateRole({
					schoolId: "school-1",
					userId: "teacher-1",
					role: "SUPERADMIN" as any,
				}),
			).rejects.toThrow();
		});
	});
});
