import { describe, expect, it } from "vitest";
import { assertFeatureEnabled, assertPaymentCategoryEnabled } from "../lib/feature-guards";

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
		translationEnabled: true,
	};
}

function allTogglesDisabled() {
	return {
		messagingEnabled: false,
		paymentsEnabled: false,
		attendanceEnabled: false,
		calendarEnabled: false,
		formsEnabled: false,
		paymentDinnerMoneyEnabled: false,
		paymentTripsEnabled: false,
		paymentClubsEnabled: false,
		paymentUniformEnabled: false,
		paymentOtherEnabled: false,
		translationEnabled: false,
	};
}

describe("assertFeatureEnabled", () => {
	it("does not throw when feature is enabled", () => {
		const ctx = { schoolFeatures: allTogglesEnabled() };

		expect(() => assertFeatureEnabled(ctx, "messaging")).not.toThrow();
		expect(() => assertFeatureEnabled(ctx, "payments")).not.toThrow();
		expect(() => assertFeatureEnabled(ctx, "attendance")).not.toThrow();
		expect(() => assertFeatureEnabled(ctx, "calendar")).not.toThrow();
		expect(() => assertFeatureEnabled(ctx, "forms")).not.toThrow();
	});

	it("throws FORBIDDEN when messaging is disabled", () => {
		const ctx = { schoolFeatures: { ...allTogglesEnabled(), messagingEnabled: false } };

		expect(() => assertFeatureEnabled(ctx, "messaging")).toThrow(
			"Messaging is disabled for this school",
		);
	});

	it("throws FORBIDDEN when payments is disabled", () => {
		const ctx = { schoolFeatures: { ...allTogglesEnabled(), paymentsEnabled: false } };

		expect(() => assertFeatureEnabled(ctx, "payments")).toThrow(
			"Payments is disabled for this school",
		);
	});

	it("throws FORBIDDEN when attendance is disabled", () => {
		const ctx = { schoolFeatures: { ...allTogglesEnabled(), attendanceEnabled: false } };

		expect(() => assertFeatureEnabled(ctx, "attendance")).toThrow(
			"Attendance is disabled for this school",
		);
	});

	it("throws FORBIDDEN when calendar is disabled", () => {
		const ctx = { schoolFeatures: { ...allTogglesEnabled(), calendarEnabled: false } };

		expect(() => assertFeatureEnabled(ctx, "calendar")).toThrow(
			"Calendar is disabled for this school",
		);
	});

	it("throws FORBIDDEN when forms is disabled", () => {
		const ctx = { schoolFeatures: { ...allTogglesEnabled(), formsEnabled: false } };

		expect(() => assertFeatureEnabled(ctx, "forms")).toThrow("Forms is disabled for this school");
	});

	it("throws with FORBIDDEN code for disabled features", () => {
		const ctx = { schoolFeatures: allTogglesDisabled() };

		try {
			assertFeatureEnabled(ctx, "messaging");
			expect.fail("Should have thrown");
		} catch (error: any) {
			expect(error.code).toBe("FORBIDDEN");
		}
	});
});

describe("assertPaymentCategoryEnabled", () => {
	it("does not throw when both payments and category are enabled", () => {
		const ctx = { schoolFeatures: allTogglesEnabled() };

		expect(() => assertPaymentCategoryEnabled(ctx, "DINNER_MONEY")).not.toThrow();
		expect(() => assertPaymentCategoryEnabled(ctx, "TRIP")).not.toThrow();
		expect(() => assertPaymentCategoryEnabled(ctx, "CLUB")).not.toThrow();
		expect(() => assertPaymentCategoryEnabled(ctx, "UNIFORM")).not.toThrow();
		expect(() => assertPaymentCategoryEnabled(ctx, "OTHER")).not.toThrow();
	});

	it("throws FORBIDDEN when master payments toggle is off", () => {
		const ctx = { schoolFeatures: { ...allTogglesEnabled(), paymentsEnabled: false } };

		expect(() => assertPaymentCategoryEnabled(ctx, "DINNER_MONEY")).toThrow(
			"Payments is disabled for this school",
		);
		expect(() => assertPaymentCategoryEnabled(ctx, "TRIP")).toThrow(
			"Payments is disabled for this school",
		);
	});

	it("throws FORBIDDEN when DINNER_MONEY category is disabled", () => {
		const ctx = {
			schoolFeatures: { ...allTogglesEnabled(), paymentDinnerMoneyEnabled: false },
		};

		expect(() => assertPaymentCategoryEnabled(ctx, "DINNER_MONEY")).toThrow(
			"Dinner money payments are disabled for this school",
		);
	});

	it("throws FORBIDDEN when TRIP category is disabled", () => {
		const ctx = {
			schoolFeatures: { ...allTogglesEnabled(), paymentTripsEnabled: false },
		};

		expect(() => assertPaymentCategoryEnabled(ctx, "TRIP")).toThrow(
			"Trip payments are disabled for this school",
		);
	});

	it("throws FORBIDDEN when CLUB category is disabled", () => {
		const ctx = {
			schoolFeatures: { ...allTogglesEnabled(), paymentClubsEnabled: false },
		};

		expect(() => assertPaymentCategoryEnabled(ctx, "CLUB")).toThrow(
			"Club payments are disabled for this school",
		);
	});

	it("throws FORBIDDEN when UNIFORM category is disabled", () => {
		const ctx = {
			schoolFeatures: { ...allTogglesEnabled(), paymentUniformEnabled: false },
		};

		expect(() => assertPaymentCategoryEnabled(ctx, "UNIFORM")).toThrow(
			"Uniform payments are disabled for this school",
		);
	});

	it("throws FORBIDDEN when OTHER category is disabled", () => {
		const ctx = {
			schoolFeatures: { ...allTogglesEnabled(), paymentOtherEnabled: false },
		};

		expect(() => assertPaymentCategoryEnabled(ctx, "OTHER")).toThrow(
			"Other payments are disabled for this school",
		);
	});

	it("checks master toggle before category toggle", () => {
		// Both master and category disabled - should get master toggle error
		const ctx = {
			schoolFeatures: {
				...allTogglesDisabled(),
			},
		};

		expect(() => assertPaymentCategoryEnabled(ctx, "TRIP")).toThrow(
			"Payments is disabled for this school",
		);
	});

	it("throws with FORBIDDEN code for disabled categories", () => {
		const ctx = {
			schoolFeatures: { ...allTogglesEnabled(), paymentTripsEnabled: false },
		};

		try {
			assertPaymentCategoryEnabled(ctx, "TRIP");
			expect.fail("Should have thrown");
		} catch (error: any) {
			expect(error.code).toBe("FORBIDDEN");
		}
	});
});
