import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		settings: {
			getFeatureToggles: {
				useQuery: vi.fn().mockReturnValue({ data: null }),
			},
			getFeatureTogglesForParent: {
				useQuery: vi.fn().mockReturnValue({ data: null }),
			},
		},
		useUtils: vi.fn().mockReturnValue({}),
	},
}));

// Must import after mocks
import { FeatureToggleProvider, useFeatureToggles } from "@/lib/feature-toggles";

function ToggleConsumer() {
	const toggles = useFeatureToggles();
	return (
		<div>
			<span data-testid="messaging">{String(toggles.messagingEnabled)}</span>
			<span data-testid="payments">{String(toggles.paymentsEnabled)}</span>
			<span data-testid="translation">{String(toggles.translationEnabled)}</span>
			<span data-testid="wellbeing">{String(toggles.wellbeingEnabled)}</span>
		</div>
	);
}

describe("useFeatureToggles", () => {
	it("returns default values when no provider data", () => {
		render(<ToggleConsumer />);

		// defaults: messaging=true, payments=true, translation=false, wellbeing=false
		expect(screen.getByTestId("messaging")).toHaveTextContent("true");
		expect(screen.getByTestId("payments")).toHaveTextContent("true");
		expect(screen.getByTestId("translation")).toHaveTextContent("false");
		expect(screen.getByTestId("wellbeing")).toHaveTextContent("false");
	});
});

describe("FeatureToggleProvider", () => {
	it("passes server values to consumers", async () => {
		const { trpc } = (await import("@/lib/trpc")) as any;
		trpc.settings.getFeatureToggles.useQuery.mockReturnValue({
			data: {
				messagingEnabled: false,
				paymentsEnabled: false,
				attendanceEnabled: true,
				calendarEnabled: true,
				formsEnabled: true,
				paymentDinnerMoneyEnabled: true,
				paymentTripsEnabled: true,
				paymentClubsEnabled: true,
				paymentUniformEnabled: true,
				paymentOtherEnabled: true,
				translationEnabled: true,
				parentsEveningEnabled: false,
				wellbeingEnabled: true,
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
			},
		});

		render(
			<FeatureToggleProvider schoolId="school-1">
				<ToggleConsumer />
			</FeatureToggleProvider>,
		);

		expect(screen.getByTestId("messaging")).toHaveTextContent("false");
		expect(screen.getByTestId("payments")).toHaveTextContent("false");
		expect(screen.getByTestId("translation")).toHaveTextContent("true");
		expect(screen.getByTestId("wellbeing")).toHaveTextContent("true");
	});
});
