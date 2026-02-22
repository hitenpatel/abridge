import type { PaymentCategory } from "@schoolconnect/db";
import { TRPCError } from "@trpc/server";

type FeatureName = "messaging" | "payments" | "attendance" | "calendar" | "forms" | "translation" | "parentsEvening";

interface SchoolFeatures {
	messagingEnabled: boolean;
	paymentsEnabled: boolean;
	attendanceEnabled: boolean;
	calendarEnabled: boolean;
	formsEnabled: boolean;
	translationEnabled: boolean;
	parentsEveningEnabled: boolean;
	paymentDinnerMoneyEnabled: boolean;
	paymentTripsEnabled: boolean;
	paymentClubsEnabled: boolean;
	paymentUniformEnabled: boolean;
	paymentOtherEnabled: boolean;
}

const featureFieldMap: Record<FeatureName, keyof SchoolFeatures> = {
	messaging: "messagingEnabled",
	payments: "paymentsEnabled",
	attendance: "attendanceEnabled",
	calendar: "calendarEnabled",
	forms: "formsEnabled",
	translation: "translationEnabled",
	parentsEvening: "parentsEveningEnabled",
};

const featureLabel: Record<FeatureName, string> = {
	messaging: "Messaging",
	payments: "Payments",
	attendance: "Attendance",
	calendar: "Calendar",
	forms: "Forms",
	translation: "Translation",
	parentsEvening: "Parents' Evening",
};

const categoryFieldMap: Record<PaymentCategory, keyof SchoolFeatures> = {
	DINNER_MONEY: "paymentDinnerMoneyEnabled",
	TRIP: "paymentTripsEnabled",
	CLUB: "paymentClubsEnabled",
	UNIFORM: "paymentUniformEnabled",
	OTHER: "paymentOtherEnabled",
};

const categoryLabel: Record<PaymentCategory, string> = {
	DINNER_MONEY: "Dinner money",
	TRIP: "Trip",
	CLUB: "Club",
	UNIFORM: "Uniform",
	OTHER: "Other",
};

export function assertFeatureEnabled(
	ctx: { schoolFeatures: SchoolFeatures },
	feature: FeatureName,
): void {
	const field = featureFieldMap[feature];
	if (!ctx.schoolFeatures[field]) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `${featureLabel[feature]} is disabled for this school`,
		});
	}
}

export function assertPaymentCategoryEnabled(
	ctx: { schoolFeatures: SchoolFeatures },
	category: PaymentCategory,
): void {
	if (!ctx.schoolFeatures.paymentsEnabled) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Payments is disabled for this school",
		});
	}

	const field = categoryFieldMap[category];
	if (!ctx.schoolFeatures[field]) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `${categoryLabel[category]} payments are disabled for this school`,
		});
	}
}
