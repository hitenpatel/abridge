import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			user: {
				findUniqueOrThrow: vi.fn().mockResolvedValue({
					name: "Test User",
					email: "test@example.com",
					phone: "+447700900000",
					language: "en",
					notifyByPush: true,
					notifyBySms: false,
					notifyByEmail: true,
					quietStart: "22:00",
					quietEnd: "07:00",
				}),
				update: vi.fn().mockResolvedValue({ success: true }),
			},
			school: {
				findUniqueOrThrow: vi.fn().mockResolvedValue({
					name: "Test Academy",
					defaultNotifyByPush: true,
					defaultNotifyBySms: false,
					defaultNotifyByEmail: true,
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
					translationEnabled: false,
					parentsEveningEnabled: false,
					wellbeingEnabled: false,
					emergencyCommsEnabled: false,
					analyticsEnabled: false,
					mealBookingEnabled: true,
					clubBookingEnabled: false,
					reportCardsEnabled: false,
					communityHubEnabled: false,
					brandColor: "#4F46E5",
					secondaryColor: "#10B981",
					schoolMotto: "Learning Together",
					brandFont: "DEFAULT",
				}),
				update: vi.fn().mockImplementation(({ select }) => {
					// Return only the selected fields
					const full: Record<string, any> = {
						name: "Updated Academy",
						defaultNotifyByPush: true,
						defaultNotifyBySms: true,
						defaultNotifyByEmail: true,
						messagingEnabled: true,
						paymentsEnabled: false,
						attendanceEnabled: true,
						calendarEnabled: true,
						formsEnabled: true,
						paymentDinnerMoneyEnabled: true,
						paymentTripsEnabled: true,
						paymentClubsEnabled: true,
						paymentUniformEnabled: true,
						paymentOtherEnabled: true,
						translationEnabled: false,
						parentsEveningEnabled: false,
						wellbeingEnabled: false,
						emergencyCommsEnabled: false,
						analyticsEnabled: false,
						mealBookingEnabled: true,
						clubBookingEnabled: false,
						reportCardsEnabled: false,
						communityHubEnabled: false,
						brandColor: "#FF5733",
						secondaryColor: "#33FF57",
						schoolMotto: "Excellence Always",
						brandFont: "ROBOTO",
					};
					if (select) {
						const result: Record<string, any> = {};
						for (const key of Object.keys(select)) {
							if (key in full) result[key] = full[key];
						}
						return Promise.resolve(result);
					}
					return Promise.resolve(full);
				}),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					child: { schoolId: "school-1" },
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

describe("settings router", () => {
	// ── getProfile ──────────────────────────────────────────────

	describe("getProfile", () => {
		it("returns the user profile", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getProfile();

			expect(result).toEqual({
				name: "Test User",
				email: "test@example.com",
				phone: "+447700900000",
				language: "en",
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: "22:00",
				quietEnd: "07:00",
			});
			expect(ctx.prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
				where: { id: "user-1" },
				select: { name: true, email: true, phone: true, language: true },
			});
		});

		it("throws UNAUTHORIZED when no user session", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getProfile()).rejects.toThrow("UNAUTHORIZED");
		});
	});

	// ── updateProfile ───────────────────────────────────────────

	describe("updateProfile", () => {
		it("updates name and phone", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateProfile({
				name: "Updated Name",
				phone: "+447700900001",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: { name: "Updated Name", phone: "+447700900001", language: undefined },
			});
		});

		it("updates with language preference", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateProfile({
				name: "Test User",
				phone: null,
				language: "cy",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: { name: "Test User", phone: null, language: "cy" },
			});
		});

		it("rejects empty name", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.updateProfile({ name: "", phone: null })).rejects.toThrow();
		});

		it("throws UNAUTHORIZED when no user session", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.updateProfile({ name: "Test", phone: null })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});

	// ── getNotificationPreferences ──────────────────────────────

	describe("getNotificationPreferences", () => {
		it("returns notification preferences", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getNotificationPreferences();

			expect(result).toMatchObject({
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: "22:00",
				quietEnd: "07:00",
			});
		});
	});

	// ── updateNotificationPreferences ───────────────────────────

	describe("updateNotificationPreferences", () => {
		it("updates notification preferences", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateNotificationPreferences({
				notifyByPush: false,
				notifyBySms: true,
				notifyByEmail: true,
				quietStart: "23:00",
				quietEnd: "06:00",
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.user.update).toHaveBeenCalledWith({
				where: { id: "user-1" },
				data: {
					notifyByPush: false,
					notifyBySms: true,
					notifyByEmail: true,
					quietStart: "23:00",
					quietEnd: "06:00",
				},
			});
		});

		it("accepts null quiet hours", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateNotificationPreferences({
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			});

			expect(result).toEqual({ success: true });
		});

		it("rejects invalid time format for quietStart", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateNotificationPreferences({
					notifyByPush: true,
					notifyBySms: false,
					notifyByEmail: true,
					quietStart: "9pm",
					quietEnd: "07:00",
				}),
			).rejects.toThrow();
		});

		it("rejects invalid time format for quietEnd", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateNotificationPreferences({
					notifyByPush: true,
					notifyBySms: false,
					notifyByEmail: true,
					quietStart: "22:00",
					quietEnd: "7",
				}),
			).rejects.toThrow();
		});
	});

	// ── getSchoolSettings ───────────────────────────────────────

	describe("getSchoolSettings", () => {
		it("returns school settings for admin", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getSchoolSettings({
				schoolId: "school-1",
			});

			expect(result).toMatchObject({
				name: "Test Academy",
				defaultNotifyByPush: true,
				defaultNotifyBySms: false,
				defaultNotifyByEmail: true,
			});
		});

		it("throws UNAUTHORIZED when no user session", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getSchoolSettings({ schoolId: "school-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});

		it("throws FORBIDDEN for non-staff users", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getSchoolSettings({ schoolId: "school-1" })).rejects.toThrow(
				"Admin access required for this school",
			);
		});

		it("throws FORBIDDEN for non-admin staff", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "user-1",
				schoolId: "school-1",
				role: "TEACHER",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getSchoolSettings({ schoolId: "school-1" })).rejects.toThrow(
				"Admin access required for this school",
			);
		});
	});

	// ── updateSchoolSettings ────────────────────────────────────

	describe("updateSchoolSettings", () => {
		it("updates school settings for admin", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateSchoolSettings({
				schoolId: "school-1",
				name: "Updated Academy",
				defaultNotifyByPush: true,
				defaultNotifyBySms: true,
				defaultNotifyByEmail: true,
			});

			expect(result).toEqual({ success: true });
			expect(ctx.prisma.school.update).toHaveBeenCalledWith({
				where: { id: "school-1" },
				data: {
					name: "Updated Academy",
					defaultNotifyByPush: true,
					defaultNotifyBySms: true,
					defaultNotifyByEmail: true,
				},
			});
		});

		it("rejects empty school name", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateSchoolSettings({
					schoolId: "school-1",
					name: "",
					defaultNotifyByPush: true,
					defaultNotifyBySms: false,
					defaultNotifyByEmail: true,
				}),
			).rejects.toThrow();
		});

		it("throws FORBIDDEN for non-admin staff", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "user-1",
				schoolId: "school-1",
				role: "TEACHER",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateSchoolSettings({
					schoolId: "school-1",
					name: "New Name",
					defaultNotifyByPush: true,
					defaultNotifyBySms: false,
					defaultNotifyByEmail: true,
				}),
			).rejects.toThrow("Admin access required for this school");
		});
	});

	// ── getFeatureToggles ───────────────────────────────────────

	describe("getFeatureToggles", () => {
		it("returns feature toggles for staff", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getFeatureToggles({
				schoolId: "school-1",
			});

			expect(result).toMatchObject({
				messagingEnabled: true,
				paymentsEnabled: true,
				attendanceEnabled: true,
				mealBookingEnabled: true,
				translationEnabled: false,
			});
		});

		it("allows non-admin staff to read feature toggles", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "user-1",
				schoolId: "school-1",
				role: "TEACHER",
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getFeatureToggles({
				schoolId: "school-1",
			});

			expect(result).toHaveProperty("messagingEnabled");
		});

		it("throws FORBIDDEN for non-staff users", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getFeatureToggles({ schoolId: "school-1" })).rejects.toThrow(
				"Not a staff member of this school",
			);
		});
	});

	// ── getFeatureTogglesForParent ───────────────────────────────

	describe("getFeatureTogglesForParent", () => {
		it("returns feature toggles for a parent with children", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getFeatureTogglesForParent();

			expect(result).toMatchObject({
				messagingEnabled: true,
				paymentsEnabled: true,
			});
		});

		it("returns null when parent has no children", async () => {
			const ctx = createTestContext();
			ctx.prisma.parentChild.findFirst.mockResolvedValue(null);
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getFeatureTogglesForParent();

			expect(result).toBeNull();
		});

		it("throws UNAUTHORIZED when no user session", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getFeatureTogglesForParent()).rejects.toThrow("UNAUTHORIZED");
		});
	});

	// ── updateFeatureToggles ────────────────────────────────────

	describe("updateFeatureToggles", () => {
		it("updates selected feature toggles for admin", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateFeatureToggles({
				schoolId: "school-1",
				paymentsEnabled: false,
				translationEnabled: true,
			});

			expect(result).toHaveProperty("paymentsEnabled");
			expect(ctx.prisma.school.update).toHaveBeenCalled();
		});

		it("throws FORBIDDEN for non-admin staff", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "user-1",
				schoolId: "school-1",
				role: "TEACHER",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateFeatureToggles({
					schoolId: "school-1",
					messagingEnabled: false,
				}),
			).rejects.toThrow("Admin access required for this school");
		});
	});

	// ── getBranding ─────────────────────────────────────────────

	describe("getBranding", () => {
		it("returns branding settings for admin", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.getBranding({
				schoolId: "school-1",
			});

			expect(result).toMatchObject({
				brandColor: "#4F46E5",
				secondaryColor: "#10B981",
				schoolMotto: "Learning Together",
				brandFont: "DEFAULT",
			});
		});

		it("throws FORBIDDEN for non-admin staff", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "user-1",
				schoolId: "school-1",
				role: "TEACHER",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getBranding({ schoolId: "school-1" })).rejects.toThrow(
				"Admin access required for this school",
			);
		});

		it("throws UNAUTHORIZED when no user session", async () => {
			const ctx = createTestContext({ user: null, session: null });
			const caller = appRouter.createCaller(ctx);

			await expect(caller.settings.getBranding({ schoolId: "school-1" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});
	});

	// ── updateBranding ──────────────────────────────────────────

	describe("updateBranding", () => {
		it("updates branding for admin", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateBranding({
				schoolId: "school-1",
				brandColor: "#FF5733",
				secondaryColor: "#33FF57",
				schoolMotto: "Excellence Always",
				brandFont: "ROBOTO",
			});

			expect(result).toMatchObject({
				brandColor: "#FF5733",
				brandFont: "ROBOTO",
			});
			expect(ctx.prisma.school.update).toHaveBeenCalled();
		});

		it("accepts partial branding update", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateBranding({
				schoolId: "school-1",
				brandColor: "#FF5733",
			});

			expect(result).toHaveProperty("brandColor");
		});

		it("accepts null secondaryColor and schoolMotto", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.settings.updateBranding({
				schoolId: "school-1",
				secondaryColor: null,
				schoolMotto: null,
			});

			expect(result).toHaveProperty("brandColor");
		});

		it("rejects invalid hex color for brandColor", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateBranding({
					schoolId: "school-1",
					brandColor: "red",
				}),
			).rejects.toThrow();
		});

		it("rejects short hex color", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateBranding({
					schoolId: "school-1",
					brandColor: "#FFF",
				}),
			).rejects.toThrow();
		});

		it("rejects invalid hex color for secondaryColor", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateBranding({
					schoolId: "school-1",
					secondaryColor: "not-a-color",
				}),
			).rejects.toThrow();
		});

		it("rejects invalid brandFont value", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateBranding({
					schoolId: "school-1",
					brandFont: "PAPYRUS" as any,
				}),
			).rejects.toThrow();
		});

		it("throws FORBIDDEN for non-admin staff", async () => {
			const ctx = createTestContext();
			ctx.prisma.staffMember.findUnique.mockResolvedValue({
				userId: "user-1",
				schoolId: "school-1",
				role: "TEACHER",
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.settings.updateBranding({
					schoolId: "school-1",
					brandColor: "#FF5733",
				}),
			).rejects.toThrow("Admin access required for this school");
		});
	});
});
