"use client";

import { trpc } from "@/lib/trpc";
import { createContext, useContext } from "react";

interface FeatureToggles {
	messagingEnabled: boolean;
	paymentsEnabled: boolean;
	attendanceEnabled: boolean;
	calendarEnabled: boolean;
	formsEnabled: boolean;
	paymentDinnerMoneyEnabled: boolean;
	paymentTripsEnabled: boolean;
	paymentClubsEnabled: boolean;
	paymentUniformEnabled: boolean;
	paymentOtherEnabled: boolean;
	translationEnabled: boolean;
	parentsEveningEnabled: boolean;
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
}

const defaultToggles: FeatureToggles = {
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
	mealBookingEnabled: false,
	clubBookingEnabled: false,
	reportCardsEnabled: false,
	communityHubEnabled: false,
	homeworkEnabled: false,
	readingDiaryEnabled: false,
	visitorManagementEnabled: false,
	misIntegrationEnabled: false,
	achievementsEnabled: false,
	galleryEnabled: false,
	progressSummariesEnabled: false,
};

const FeatureToggleContext = createContext<FeatureToggles>(defaultToggles);

export function FeatureToggleProvider({
	schoolId,
	children,
}: { schoolId: string | undefined; children: React.ReactNode }) {
	// Staff path: use school-scoped query when schoolId is available
	const { data: staffData } = trpc.settings.getFeatureToggles.useQuery(
		{ schoolId: schoolId as string },
		{ enabled: !!schoolId },
	);

	// Parent path: derive school from parent's child link
	const { data: parentData } = trpc.settings.getFeatureTogglesForParent.useQuery(undefined, {
		enabled: !schoolId,
	});

	const data = staffData ?? parentData;

	return (
		<FeatureToggleContext.Provider value={data ?? defaultToggles}>
			{children}
		</FeatureToggleContext.Provider>
	);
}

export function useFeatureToggles() {
	return useContext(FeatureToggleContext);
}
