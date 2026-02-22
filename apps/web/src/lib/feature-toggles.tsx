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
};

const FeatureToggleContext = createContext<FeatureToggles>(defaultToggles);

export function FeatureToggleProvider({
	schoolId,
	children,
}: { schoolId: string | undefined; children: React.ReactNode }) {
	const { data } = trpc.settings.getFeatureToggles.useQuery(
		{ schoolId: schoolId as string },
		{ enabled: !!schoolId },
	);

	return (
		<FeatureToggleContext.Provider value={data ?? defaultToggles}>
			{children}
		</FeatureToggleContext.Provider>
	);
}

export function useFeatureToggles() {
	return useContext(FeatureToggleContext);
}
