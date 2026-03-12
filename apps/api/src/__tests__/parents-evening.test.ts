import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

const now = new Date();
const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const bookingOpensAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const bookingClosesAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue({
					messagingEnabled: true,
					paymentsEnabled: true,
					attendanceEnabled: true,
					calendarEnabled: true,
					formsEnabled: true,
					translationEnabled: false,
					parentsEveningEnabled: true,
					wellbeingEnabled: false,
					emergencyCommsEnabled: false,
					analyticsEnabled: false,
					mealBookingEnabled: false,
					clubBookingEnabled: false,
					reportCardsEnabled: false,
					communityHubEnabled: false,
					paymentDinnerMoneyEnabled: true,
					paymentTripsEnabled: true,
					paymentClubsEnabled: true,
					paymentUniformEnabled: true,
					paymentOtherEnabled: true,
				}),
			},
			parentsEvening: {
				create: vi.fn().mockResolvedValue({
					id: "pe-1",
					schoolId: "school-1",
					title: "Year 6 Parents Evening",
					date: futureDate,
					slotDurationMin: 10,
					breakDurationMin: 5,
					startTime: "15:00",
					endTime: "18:00",
					bookingOpensAt,
					bookingClosesAt,
					allowVideoCall: false,
					isPublished: false,
				}),
				findUnique: vi.fn().mockResolvedValue({
					id: "pe-1",
					schoolId: "school-1",
					title: "Year 6 Parents Evening",
					date: futureDate,
					slotDurationMin: 10,
					breakDurationMin: 5,
					startTime: "15:00",
					endTime: "18:00",
					bookingOpensAt,
					bookingClosesAt,
					allowVideoCall: false,
					isPublished: false,
					_count: { slots: 12 },
				}),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "pe-1",
						title: "Year 6 Parents Evening",
						date: futureDate,
						startTime: "15:00",
						endTime: "18:00",
						isPublished: true,
						bookingOpensAt,
						bookingClosesAt,
						allowVideoCall: false,
						_count: { slots: 12 },
					},
				]),
				update: vi.fn().mockResolvedValue({
					id: "pe-1",
					isPublished: true,
				}),
			},
			parentsEveningSlot: {
				createMany: vi.fn().mockResolvedValue({ count: 12 }),
				findMany: vi.fn().mockResolvedValue([
					{
						id: "slot-1",
						staffId: "staff-1",
						startTime: "15:00",
						endTime: "15:10",
						location: null,
						videoCallLink: null,
						parentId: null,
						childId: null,
						bookedAt: null,
						staffNotes: null,
					},
				]),
				findUnique: vi.fn().mockResolvedValue({
					id: "slot-1",
					staffId: "user-1",
					parentId: null,
					childId: null,
					parentsEveningId: "pe-1",
					parentsEvening: {
						bookingOpensAt,
						bookingClosesAt,
					},
				}),
				findFirst: vi.fn().mockResolvedValue(null),
				update: vi.fn().mockResolvedValue({
					id: "slot-1",
					parentId: "user-1",
					childId: "child-1",
					bookedAt: new Date(),
				}),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
				findMany: vi.fn().mockResolvedValue([
					{ userId: "staff-1" },
					{ userId: "staff-2" },
				]),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					userId: "user-1",
					childId: "child-1",
					child: { schoolId: "school-1" },
				}),
			},
			user: {
				findMany: vi.fn().mockResolvedValue([
					{ id: "staff-1", name: "Mrs Smith" },
				]),
			},
		},
		user: { id: "user-1", name: "Test User" },
		session: { id: "session-1" },
		...overrides,
	};
}

describe("parents evening router", () => {
	// ─── CREATE ──────────────────────────────────────────────────────
	describe("create", () => {
		it("creates a parents evening", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.create({
				schoolId: "school-1",
				title: "Year 6 Parents Evening",
				date: futureDate,
				slotDurationMin: 10,
				breakDurationMin: 5,
				startTime: "15:00",
				endTime: "18:00",
				bookingOpensAt,
				bookingClosesAt,
				allowVideoCall: false,
			});

			expect(result).toHaveProperty("id", "pe-1");
			expect(result.title).toBe("Year 6 Parents Evening");
			expect(ctx.prisma.parentsEvening.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					schoolId: "school-1",
					title: "Year 6 Parents Evening",
					slotDurationMin: 10,
					breakDurationMin: 5,
					startTime: "15:00",
					endTime: "18:00",
				}),
			});
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.create({
					schoolId: "school-1",
					title: "Evening",
					date: futureDate,
					startTime: "15:00",
					endTime: "18:00",
					bookingOpensAt,
					bookingClosesAt,
				}),
			).rejects.toThrow();
		});

		it("rejects non-admin staff", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.create({
					schoolId: "school-1",
					title: "Evening",
					date: futureDate,
					startTime: "15:00",
					endTime: "18:00",
					bookingOpensAt,
					bookingClosesAt,
				}),
			).rejects.toThrow();
		});
	});

	// ─── ADD TEACHERS ────────────────────────────────────────────────
	describe("addTeachers", () => {
		it("adds teachers and generates time slots", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.addTeachers({
				schoolId: "school-1",
				parentsEveningId: "pe-1",
				staffIds: ["staff-1", "staff-2"],
			});

			expect(result.teacherCount).toBe(2);
			expect(result.slotsPerTeacher).toBeGreaterThan(0);
			expect(ctx.prisma.parentsEveningSlot.createMany).toHaveBeenCalled();
		});

		it("throws NOT_FOUND for wrong school evening", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEvening.findUnique.mockResolvedValue({
				id: "pe-1",
				schoolId: "other-school",
				isPublished: false,
				startTime: "15:00",
				endTime: "18:00",
				slotDurationMin: 10,
				breakDurationMin: 5,
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.addTeachers({
					schoolId: "school-1",
					parentsEveningId: "pe-1",
					staffIds: ["staff-1"],
				}),
			).rejects.toThrow("Parents' evening not found");
		});

		it("throws BAD_REQUEST when evening is already published", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEvening.findUnique.mockResolvedValue({
				id: "pe-1",
				schoolId: "school-1",
				isPublished: true,
				startTime: "15:00",
				endTime: "18:00",
				slotDurationMin: 10,
				breakDurationMin: 5,
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.addTeachers({
					schoolId: "school-1",
					parentsEveningId: "pe-1",
					staffIds: ["staff-1"],
				}),
			).rejects.toThrow("Cannot modify published evening");
		});
	});

	// ─── PUBLISH ─────────────────────────────────────────────────────
	describe("publish", () => {
		it("publishes a parents evening with slots", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.publish({
				schoolId: "school-1",
				parentsEveningId: "pe-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.parentsEvening.update).toHaveBeenCalledWith({
				where: { id: "pe-1" },
				data: { isPublished: true },
			});
		});

		it("throws BAD_REQUEST when no slots exist", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEvening.findUnique.mockResolvedValue({
				id: "pe-1",
				schoolId: "school-1",
				isPublished: false,
				_count: { slots: 0 },
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.publish({
					schoolId: "school-1",
					parentsEveningId: "pe-1",
				}),
			).rejects.toThrow("Add teachers before publishing");
		});

		it("throws NOT_FOUND for nonexistent evening", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEvening.findUnique.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.publish({
					schoolId: "school-1",
					parentsEveningId: "pe-nonexistent",
				}),
			).rejects.toThrow("Parents' evening not found");
		});
	});

	// ─── LIST (protected, parent-facing) ─────────────────────────────
	describe("list", () => {
		it("returns published evenings for a school", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.list({
				schoolId: "school-1",
			});

			expect(result.items).toHaveLength(1);
			expect(result.items[0]).toHaveProperty("title");
			expect(ctx.prisma.parentsEvening.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { schoolId: "school-1", isPublished: true },
				}),
			);
		});

		it("returns empty when no schoolId and no parent link", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findFirst.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.list({});

			expect(result).toEqual({ items: [] });
		});

		it("infers schoolId from parentChild link when not provided", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await caller.parentsEvening.list({});

			expect(ctx.prisma.parentChild.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { userId: "user-1" },
				}),
			);
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.list({ schoolId: "school-1" }),
			).rejects.toThrow();
		});
	});

	// ─── LIST ALL (admin) ────────────────────────────────────────────
	describe("listAll", () => {
		it("returns all evenings including unpublished for admin", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.listAll({
				schoolId: "school-1",
			});

			expect(result.items).toHaveLength(1);
			expect(ctx.prisma.parentsEvening.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { schoolId: "school-1" },
				}),
			);
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.listAll({ schoolId: "school-1" }),
			).rejects.toThrow();
		});
	});

	// ─── GET SLOTS ───────────────────────────────────────────────────
	describe("getSlots", () => {
		it("returns slots with staff names", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.getSlots({
				parentsEveningId: "pe-1",
			});

			expect(result.slots).toHaveLength(1);
			expect(result.slots[0]).toHaveProperty("staffName");
			expect(result.slots[0]).toHaveProperty("isBooked", false);
			expect(result.slots[0]).toHaveProperty("isOwnBooking", false);
		});

		it("filters by staffId when provided", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await caller.parentsEvening.getSlots({
				parentsEveningId: "pe-1",
				staffId: "staff-1",
			});

			expect(ctx.prisma.parentsEveningSlot.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						parentsEveningId: "pe-1",
						staffId: "staff-1",
					},
				}),
			);
		});
	});

	// ─── BOOK ────────────────────────────────────────────────────────
	describe("book", () => {
		it("books a slot for a parent", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.book({
				slotId: "slot-1",
				childId: "child-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.parentsEveningSlot.update).toHaveBeenCalledWith({
				where: { id: "slot-1" },
				data: expect.objectContaining({
					parentId: "user-1",
					childId: "child-1",
				}),
			});
		});

		it("throws NOT_FOUND for nonexistent slot", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.book({
					slotId: "slot-nonexistent",
					childId: "child-1",
				}),
			).rejects.toThrow("Slot not found");
		});

		it("throws BAD_REQUEST when slot is already booked", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue({
				id: "slot-1",
				staffId: "staff-1",
				parentId: "other-user",
				parentsEveningId: "pe-1",
				parentsEvening: {
					bookingOpensAt,
					bookingClosesAt,
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.book({
					slotId: "slot-1",
					childId: "child-1",
				}),
			).rejects.toThrow("Slot already booked");
		});

		it("throws BAD_REQUEST when booking is not open", async () => {
			const ctx = createTestContext();
			const pastClose = new Date(now.getTime() - 60 * 60 * 1000);
			const pastOpen = new Date(now.getTime() - 2 * 60 * 60 * 1000);
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue({
				id: "slot-1",
				staffId: "staff-1",
				parentId: null,
				parentsEveningId: "pe-1",
				parentsEvening: {
					bookingOpensAt: pastOpen,
					bookingClosesAt: pastClose,
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.book({
					slotId: "slot-1",
					childId: "child-1",
				}),
			).rejects.toThrow("Booking is not open");
		});

		it("throws FORBIDDEN when child does not belong to parent", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findFirst.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.book({
					slotId: "slot-1",
					childId: "child-999",
				}),
			).rejects.toThrow("Not your child");
		});

		it("throws BAD_REQUEST when already booked with same teacher", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEveningSlot.findFirst.mockResolvedValue({
				id: "existing-slot",
				staffId: "user-1",
				parentId: "user-1",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.book({
					slotId: "slot-1",
					childId: "child-1",
				}),
			).rejects.toThrow("Already booked with this teacher");
		});

		it("rejects unauthenticated users", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.book({
					slotId: "slot-1",
					childId: "child-1",
				}),
			).rejects.toThrow();
		});
	});

	// ─── CANCEL BOOKING ──────────────────────────────────────────────
	describe("cancelBooking", () => {
		it("cancels a booking owned by the user", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue({
				id: "slot-1",
				parentId: "user-1",
				parentsEvening: {
					bookingClosesAt,
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.cancelBooking({
				slotId: "slot-1",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.parentsEveningSlot.update).toHaveBeenCalledWith({
				where: { id: "slot-1" },
				data: { parentId: null, childId: null, bookedAt: null },
			});
		});

		it("throws NOT_FOUND when booking does not belong to user", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue({
				id: "slot-1",
				parentId: "other-user",
				parentsEvening: {
					bookingClosesAt,
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.cancelBooking({ slotId: "slot-1" }),
			).rejects.toThrow("Booking not found");
		});

		it("throws NOT_FOUND when slot does not exist", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.cancelBooking({ slotId: "slot-999" }),
			).rejects.toThrow("Booking not found");
		});

		it("throws BAD_REQUEST when booking deadline has passed", async () => {
			const ctx = createTestContext();
			const pastClose = new Date(now.getTime() - 60 * 60 * 1000);
			ctx.prisma.parentsEveningSlot.findUnique.mockResolvedValue({
				id: "slot-1",
				parentId: "user-1",
				parentsEvening: {
					bookingClosesAt: pastClose,
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.cancelBooking({ slotId: "slot-1" }),
			).rejects.toThrow("Booking deadline has passed");
		});
	});

	// ─── ADD NOTES (staff) ───────────────────────────────────────────
	describe("addNotes", () => {
		it("adds notes to own slot", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "user-1",
							schoolId: "school-1",
							role: "TEACHER",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.addNotes({
				schoolId: "school-1",
				slotId: "slot-1",
				notes: "Good progress this term",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.parentsEveningSlot.update).toHaveBeenCalledWith({
				where: { id: "slot-1" },
				data: { staffNotes: "Good progress this term" },
			});
		});

		it("throws FORBIDDEN when slot belongs to different staff", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "user-1",
							schoolId: "school-1",
							role: "TEACHER",
						}),
					},
					parentsEveningSlot: {
						...createTestContext().prisma.parentsEveningSlot,
						findUnique: vi.fn().mockResolvedValue({
							id: "slot-1",
							staffId: "other-staff",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.addNotes({
					schoolId: "school-1",
					slotId: "slot-1",
					notes: "Notes",
				}),
			).rejects.toThrow("Not your slot");
		});
	});

	// ─── SET VIDEO LINK (staff) ──────────────────────────────────────
	describe("setVideoLink", () => {
		it("sets a video call link on own slot", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "user-1",
							schoolId: "school-1",
							role: "TEACHER",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.parentsEvening.setVideoLink({
				schoolId: "school-1",
				slotId: "slot-1",
				videoCallLink: "https://meet.google.com/abc-defg-hij",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.parentsEveningSlot.update).toHaveBeenCalledWith({
				where: { id: "slot-1" },
				data: { videoCallLink: "https://meet.google.com/abc-defg-hij" },
			});
		});

		it("throws FORBIDDEN when slot belongs to different staff", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "user-1",
							schoolId: "school-1",
							role: "TEACHER",
						}),
					},
					parentsEveningSlot: {
						...createTestContext().prisma.parentsEveningSlot,
						findUnique: vi.fn().mockResolvedValue({
							id: "slot-1",
							staffId: "other-staff",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.setVideoLink({
					schoolId: "school-1",
					slotId: "slot-1",
					videoCallLink: "https://meet.google.com/abc-defg-hij",
				}),
			).rejects.toThrow("Not your slot");
		});
	});

	// ─── FORBIDDEN ACCESS (non-staff on admin route) ─────────────────
	describe("forbidden access", () => {
		it("rejects non-staff user from admin procedures", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.listAll({ schoolId: "school-1" }),
			).rejects.toThrow();
		});

		it("rejects non-staff user from staff procedures", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.parentsEvening.addNotes({
					schoolId: "school-1",
					slotId: "slot-1",
					notes: "Notes",
				}),
			).rejects.toThrow();
		});
	});
});
