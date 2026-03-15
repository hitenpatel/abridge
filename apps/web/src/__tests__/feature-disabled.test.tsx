import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureDisabled } from "@/components/feature-disabled";

describe("FeatureDisabled", () => {
	it("renders feature name in heading", () => {
		render(<FeatureDisabled featureName="Payments" />);

		expect(
			screen.getByRole("heading", { name: /Payments is not enabled/i }),
		).toBeInTheDocument();
	});

	it("shows disabled message text", () => {
		render(<FeatureDisabled featureName="Messaging" />);

		expect(
			screen.getByText(/This feature has been disabled for your school/i),
		).toBeInTheDocument();
	});
});
