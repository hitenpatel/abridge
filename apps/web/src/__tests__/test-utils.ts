import { vi } from "vitest";

/** Standard return shape for a useQuery mock */
export function mockQuery(data: unknown = undefined, overrides?: Record<string, unknown>) {
	return { data, isLoading: false, error: null, ...overrides };
}

/** Standard return shape for a useMutation mock */
export function mockMutation(overrides?: Record<string, unknown>) {
	return { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, ...overrides };
}

/** All-enabled feature toggles for useFeatureToggles mock */
export const ALL_FEATURES_ENABLED = {
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
	parentsEveningEnabled: true,
};
