import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

const schoolFeatures = {
	messagingEnabled: true,
	paymentsEnabled: true,
	attendanceEnabled: true,
	calendarEnabled: true,
	formsEnabled: true,
	translationEnabled: false,
	parentsEveningEnabled: false,
	wellbeingEnabled: false,
	emergencyCommsEnabled: false,
	analyticsEnabled: false,
	mealBookingEnabled: false,
	clubBookingEnabled: true,
	reportCardsEnabled: false,
	communityHubEnabled: false,
	paymentDinnerMoneyEnabled: true,
	paymentTripsEnabled: true,
	paymentClubsEnabled: true,
	paymentUniformEnabled: true,
	paymentOtherEnabled: true,
};

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue(schoolFeatures),
			},
			club: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "club-1",
						name: "Chess Club",
						day: "MONDAY",
						startTime: "15:30",
						endTime: "16:30",
						isActive: true,
						_count: { enrollments: 5 },
					},
				]),
				findUnique: vi.fn().mockResolvedValue({
					id: "club-1",
					name: "Chess Club",
					schoolId: "school-1",
					day: "MONDAY",
					startTime: "15:30",
					endTime: "16:30",
					maxCapacity: 30,
					isActive: true,
					yearGroups: [],
					enrollments: [],
					_count: { enrollments: 5 },
				}),
				create: vi.fn().mockResolvedValue({
					id: "club-new",
					name: "Art Club",
				}),
				update: vi.fn().mockResolvedValue({
					id: "club-1",
					name: "Updated Club",
				}),
				delete: vi.fn().mockResolvedValue({ id: "club-1" }),
			},
			clubEnrollment: {
				findUnique: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue({
					id: "enrollment-1",
					clubId: "club-1",
					childId: "child-1",
					status: "ACTIVE",
				}),
				update: vi.fn().mockResolvedValue({
					id: "enrollment-1",
					status: "CANCELLED",
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
					child: { schoolId: "school-1", yearGroup: "Year 3" },
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("club booking router", () => {
	// ──────────────────────────────────────────────
	// listClubs
	// ──────────────────────────────────────────────
	describe("listClubs", () => {
		it("returns clubs for a school", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.listClubs({
				schoolId: "school-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result[0]).toHaveProperty("name", "Chess Club");
			expect(ctx.prisma.club.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ schoolId: "school-1", isActive: true }),
				}),
			);
		});

		it("returns all clubs when activeOnly is false", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await caller.clubBooking.listClubs({
				schoolId: "school-1",
				activeOnly: false,
			});

			expect(ctx.prisma.club.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { schoolId: "school-1" },
				}),
			);
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.clubBooking.listClubs({ schoolId: "school-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});

	// ──────────────────────────────────────────────
	// getClub
	// ──────────────────────────────────────────────
	describe("getClub", () => {
		it("returns a club with enrollments", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.getClub({ clubId: "club-1" });

			expect(result).toHaveProperty("id", "club-1");
			expect(result).toHaveProperty("name", "Chess Club");
			expect(ctx.prisma.club.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "club-1" },
				}),
			);
		});

		it("throws NOT_FOUND for missing club", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(caller.clubBooking.getClub({ clubId: "nonexistent" })).rejects.toThrow(
				"Club not found",
			);
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.clubBooking.getClub({ clubId: "club-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});

	// ──────────────────────────────────────────────
	// createClub
	// ──────────────────────────────────────────────
	describe("createClub", () => {
		const validInput = {
			schoolId: "school-1",
			name: "Art Club",
			day: "WEDNESDAY" as const,
			startTime: "15:00",
			endTime: "16:00",
			maxCapacity: 20,
			feeInPence: 500,
			yearGroups: ["Year 3", "Year 4"],
			termStartDate: new Date("2026-09-01"),
			termEndDate: new Date("2026-12-18"),
		};

		it("creates a club successfully", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.createClub(validInput);

			expect(result).toEqual({ success: true, clubId: "club-new" });
			expect(ctx.prisma.club.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						schoolId: "school-1",
						name: "Art Club",
						day: "WEDNESDAY",
						createdBy: "user-1",
					}),
				}),
			);
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.clubBooking.createClub(validInput)).rejects.toThrow("UNAUTHORIZED");
		});

		it("rejects non-staff users", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(caller.clubBooking.createClub(validInput)).rejects.toThrow("Not a staff member");
		});

		it("rejects when clubBooking feature is disabled", async () => {
			const ctx = createTestContext();
			ctx.prisma.school.findUnique.mockResolvedValueOnce({
				...schoolFeatures,
				clubBookingEnabled: false,
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.clubBooking.createClub(validInput)).rejects.toThrow(
				"Club Booking is disabled for this school",
			);
		});

		it("rejects invalid time format", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.createClub({
					...validInput,
					startTime: "3pm",
				}),
			).rejects.toThrow();
		});

		it("rejects empty name", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.createClub({
					...validInput,
					name: "",
				}),
			).rejects.toThrow();
		});
	});

	// ──────────────────────────────────────────────
	// updateClub
	// ──────────────────────────────────────────────
	describe("updateClub", () => {
		it("updates a club successfully", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.updateClub({
				schoolId: "school-1",
				clubId: "club-1",
				name: "Updated Chess Club",
				maxCapacity: 40,
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.club.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "club-1" },
					data: expect.objectContaining({ name: "Updated Chess Club", maxCapacity: 40 }),
				}),
			);
		});

		it("throws NOT_FOUND when club does not exist", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.updateClub({
					schoolId: "school-1",
					clubId: "nonexistent",
					name: "No Club",
				}),
			).rejects.toThrow("Club not found");
		});

		it("throws NOT_FOUND when club belongs to different school", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce({
				id: "club-1",
				schoolId: "school-other",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.updateClub({
					schoolId: "school-1",
					clubId: "club-1",
					name: "Hijack",
				}),
			).rejects.toThrow("Club not found");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.updateClub({
					schoolId: "school-1",
					clubId: "club-1",
					name: "X",
				}),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	// ──────────────────────────────────────────────
	// deleteClub
	// ──────────────────────────────────────────────
	describe("deleteClub", () => {
		it("deletes a club successfully", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.deleteClub({
				schoolId: "school-1",
				clubId: "club-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.club.delete).toHaveBeenCalledWith({
				where: { id: "club-1" },
			});
		});

		it("throws NOT_FOUND when club does not exist", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.deleteClub({
					schoolId: "school-1",
					clubId: "nonexistent",
				}),
			).rejects.toThrow("Club not found");
		});

		it("throws NOT_FOUND when club belongs to different school", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce({
				id: "club-1",
				schoolId: "school-other",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.deleteClub({
					schoolId: "school-1",
					clubId: "club-1",
				}),
			).rejects.toThrow("Club not found");
		});

		it("rejects non-staff users", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.deleteClub({
					schoolId: "school-1",
					clubId: "club-1",
				}),
			).rejects.toThrow("Not a staff member");
		});
	});

	// ──────────────────────────────────────────────
	// enroll
	// ──────────────────────────────────────────────
	describe("enroll", () => {
		it("enrolls a child in a club", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.enroll({
				clubId: "club-1",
				childId: "child-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.clubEnrollment.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						clubId: "club-1",
						childId: "child-1",
						enrolledBy: "user-1",
					}),
				}),
			);
		});

		it("re-enrolls a previously cancelled enrollment", async () => {
			const ctx = createTestContext();
			ctx.prisma.clubEnrollment.findUnique.mockResolvedValueOnce({
				id: "enrollment-old",
				clubId: "club-1",
				childId: "child-1",
				status: "CANCELLED",
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.enroll({
				clubId: "club-1",
				childId: "child-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.clubEnrollment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "enrollment-old" },
					data: { status: "ACTIVE", enrolledBy: "user-1" },
				}),
			);
		});

		it("rejects when parent-child link is missing", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findFirst.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Not authorised for this child");
		});

		it("rejects when club is not found or inactive", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Club not found or inactive");
		});

		it("rejects when club is inactive", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce({
				id: "club-1",
				isActive: false,
				schoolId: "school-1",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Club not found or inactive");
		});

		it("rejects when club is at a different school", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce({
				id: "club-1",
				isActive: true,
				schoolId: "school-other",
				yearGroups: [],
				maxCapacity: 30,
				_count: { enrollments: 5 },
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Club is not at child's school");
		});

		it("rejects when club is full", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce({
				id: "club-1",
				isActive: true,
				schoolId: "school-1",
				yearGroups: [],
				maxCapacity: 5,
				_count: { enrollments: 5 },
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Club is full");
		});

		it("rejects when child is already actively enrolled", async () => {
			const ctx = createTestContext();
			ctx.prisma.clubEnrollment.findUnique.mockResolvedValueOnce({
				id: "enrollment-1",
				status: "ACTIVE",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Child is already enrolled");
		});

		it("rejects when child year group is not allowed", async () => {
			const ctx = createTestContext();
			ctx.prisma.club.findUnique.mockResolvedValueOnce({
				id: "club-1",
				isActive: true,
				schoolId: "school-1",
				yearGroups: ["Year 5", "Year 6"],
				maxCapacity: 30,
				_count: { enrollments: 5 },
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("not available for your child's year group");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.enroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	// ──────────────────────────────────────────────
	// unenroll
	// ──────────────────────────────────────────────
	describe("unenroll", () => {
		it("cancels an active enrollment", async () => {
			const ctx = createTestContext();
			ctx.prisma.clubEnrollment.findUnique.mockResolvedValueOnce({
				id: "enrollment-1",
				clubId: "club-1",
				childId: "child-1",
				status: "ACTIVE",
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.unenroll({
				clubId: "club-1",
				childId: "child-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.clubEnrollment.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "enrollment-1" },
					data: { status: "CANCELLED" },
				}),
			);
		});

		it("rejects when parent-child link is missing", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findFirst.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.unenroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("Not authorised for this child");
		});

		it("throws NOT_FOUND when no active enrollment exists", async () => {
			const ctx = createTestContext();
			ctx.prisma.clubEnrollment.findUnique.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.unenroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("No active enrollment found");
		});

		it("throws NOT_FOUND when enrollment is already cancelled", async () => {
			const ctx = createTestContext();
			ctx.prisma.clubEnrollment.findUnique.mockResolvedValueOnce({
				id: "enrollment-1",
				status: "CANCELLED",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.unenroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("No active enrollment found");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.unenroll({ clubId: "club-1", childId: "child-1" }),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});

	// ──────────────────────────────────────────────
	// getEnrollmentsForChild
	// ──────────────────────────────────────────────
	describe("getEnrollmentsForChild", () => {
		it("returns enrollments for a child", async () => {
			const ctx = createTestContext();
			ctx.prisma.clubEnrollment.findMany.mockResolvedValueOnce([
				{
					id: "enrollment-1",
					clubId: "club-1",
					childId: "child-1",
					status: "ACTIVE",
					club: {
						id: "club-1",
						name: "Chess Club",
						day: "MONDAY",
						startTime: "15:30",
						endTime: "16:30",
						staffLead: "Mr Smith",
						feeInPence: 0,
					},
				},
			]);
			const caller = appRouter.createCaller(ctx);

			const result = await caller.clubBooking.getEnrollmentsForChild({
				childId: "child-1",
			});

			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(1);
			expect(result[0]!.club).toHaveProperty("name", "Chess Club");
			expect(ctx.prisma.clubEnrollment.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { childId: "child-1", status: "ACTIVE" },
				}),
			);
		});

		it("rejects when parent-child link is missing", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findFirst.mockResolvedValueOnce(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.getEnrollmentsForChild({ childId: "child-1" }),
			).rejects.toThrow("Not authorised for this child");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.clubBooking.getEnrollmentsForChild({ childId: "child-1" }),
			).rejects.toThrow("UNAUTHORIZED");
		});
	});
});
