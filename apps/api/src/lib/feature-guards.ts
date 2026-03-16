import type { PaymentCategory } from "@schoolconnect/db";
import { TRPCError } from "@trpc/server";

type FeatureName =
	| "messaging"
	| "payments"
	| "attendance"
	| "calendar"
	| "forms"
	| "translation"
	| "parentsEvening"
	| "wellbeing"
	| "emergencyComms"
	| "analytics"
	| "mealBooking"
	| "clubBooking"
	| "reportCards"
	| "communityHub"
	| "homework"
	| "readingDiary"
	| "visitorManagement"
	| "misIntegration"
	| "achievements"
	| "gallery"
	| "progressSummaries"
	| "liveChat";

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
	wellbeingEnabled: boolean;
	emergencyCommsEnabled: boolean;
	analyticsEnabled: boolean;
	mealBookingEnabled: boolean;
	clubBookingEnabled: boolean;
	reportCardsEnabled: boolean;
	communityHubEnabled: boolean;
	homeworkEnabled: boolean;
	readingDiaryEnabled: boolean;
	visitorManagementEnabled: boolean;
	misIntegrationEnabled: boolean;
	achievementsEnabled: boolean;
	galleryEnabled: boolean;
	progressSummariesEnabled: boolean;
	liveChatEnabled: boolean;
}

const featureFieldMap: Record<FeatureName, keyof SchoolFeatures> = {
	messaging: "messagingEnabled",
	payments: "paymentsEnabled",
	attendance: "attendanceEnabled",
	calendar: "calendarEnabled",
	forms: "formsEnabled",
	translation: "translationEnabled",
	parentsEvening: "parentsEveningEnabled",
	wellbeing: "wellbeingEnabled",
	emergencyComms: "emergencyCommsEnabled",
	analytics: "analyticsEnabled",
	mealBooking: "mealBookingEnabled",
	clubBooking: "clubBookingEnabled",
	reportCards: "reportCardsEnabled",
	communityHub: "communityHubEnabled",
	homework: "homeworkEnabled",
	readingDiary: "readingDiaryEnabled",
	visitorManagement: "visitorManagementEnabled",
	misIntegration: "misIntegrationEnabled",
	achievements: "achievementsEnabled",
	gallery: "galleryEnabled",
	progressSummaries: "progressSummariesEnabled",
	liveChat: "liveChatEnabled",
};

const featureLabel: Record<FeatureName, string> = {
	messaging: "Messaging",
	payments: "Payments",
	attendance: "Attendance",
	calendar: "Calendar",
	forms: "Forms",
	translation: "Translation",
	parentsEvening: "Parents' Evening",
	wellbeing: "Wellbeing Check-ins",
	emergencyComms: "Emergency Communications",
	analytics: "Analytics",
	mealBooking: "Meal Booking",
	clubBooking: "Club Booking",
	reportCards: "Report Cards",
	communityHub: "Community Hub",
	homework: "Homework Tracker",
	readingDiary: "Reading Diary",
	visitorManagement: "Visitor Management",
	misIntegration: "MIS Integration",
	achievements: "Achievements",
	gallery: "Gallery",
	progressSummaries: "Progress Summaries",
	liveChat: "Live Chat",
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
