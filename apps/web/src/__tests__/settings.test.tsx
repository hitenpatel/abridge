import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "../app/dashboard/settings/page";

// Mock sonner
vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: vi.fn(),
		auth: {
			getSession: {
				useQuery: vi.fn(),
			},
		},
		stripe: {
			getStripeStatus: {
				useQuery: vi.fn(),
			},
			createOnboardingLink: {
				useMutation: vi.fn(),
			},
		},
		settings: {
			getProfile: {
				useQuery: vi.fn(),
			},
			updateProfile: {
				useMutation: vi.fn(),
			},
			getNotificationPreferences: {
				useQuery: vi.fn(),
			},
			updateNotificationPreferences: {
				useMutation: vi.fn(),
			},
			getSchoolSettings: {
				useQuery: vi.fn(),
			},
			updateSchoolSettings: {
				useMutation: vi.fn(),
			},
			getFeatureToggles: {
				useQuery: vi.fn(),
			},
			updateFeatureToggles: {
				useMutation: vi.fn(),
			},
		},
	},
}));

describe("SettingsPage", () => {
	const mockSessionQuery = vi.fn();
	const mockProfileQuery = vi.fn();
	const mockProfileMutation = vi.fn();
	const mockNotifQuery = vi.fn();
	const mockNotifMutation = vi.fn();
	const mockSchoolQuery = vi.fn();
	const mockSchoolMutation = vi.fn();
	const mockFeatureTogglesQuery = vi.fn();
	const mockFeatureTogglesMutation = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.stripe.getStripeStatus.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.stripe.createOnboardingLink.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
		(trpcLib.trpc.auth.getSession.useQuery as any) = mockSessionQuery;
		(trpcLib.trpc.settings.getProfile.useQuery as any) = mockProfileQuery;
		(trpcLib.trpc.settings.updateProfile.useMutation as any) = mockProfileMutation;
		(trpcLib.trpc.settings.getNotificationPreferences.useQuery as any) = mockNotifQuery;
		(trpcLib.trpc.settings.updateNotificationPreferences.useMutation as any) = mockNotifMutation;
		(trpcLib.trpc.settings.getSchoolSettings.useQuery as any) = mockSchoolQuery;
		(trpcLib.trpc.settings.updateSchoolSettings.useMutation as any) = mockSchoolMutation;
		(trpcLib.trpc.settings.getFeatureToggles.useQuery as any) = mockFeatureTogglesQuery;
		(trpcLib.trpc.settings.updateFeatureToggles.useMutation as any) = mockFeatureTogglesMutation;
		(trpcLib.trpc.useUtils as any) = () => ({
			settings: { getFeatureToggles: { invalidate: vi.fn() } },
		});

		mockProfileMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
		mockNotifMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
		mockSchoolMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
		mockFeatureTogglesMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
		mockFeatureTogglesQuery.mockReturnValue({ data: undefined, isLoading: false });
	});

	it("shows loading skeleton while session loads", () => {
		mockSessionQuery.mockReturnValue({ data: undefined, isLoading: true });
		mockProfileQuery.mockReturnValue({ data: undefined, isLoading: true });
		mockNotifQuery.mockReturnValue({ data: undefined, isLoading: true });

		render(<SettingsPage />);

		expect(screen.queryByText("Settings")).toBeNull();
	});

	it("renders settings page heading", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: "123" },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByText("Settings")).toBeDefined();
		expect(screen.getByText("Manage your account and preferences")).toBeDefined();
	});

	it("renders profile card with user data", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John Smith", email: "john@example.com", phone: "07700900000" },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByText("Profile")).toBeDefined();
		expect(screen.getByLabelText("Name")).toBeDefined();
		expect(screen.getByLabelText("Email")).toBeDefined();
		expect(screen.getByLabelText("Phone")).toBeDefined();
		expect(screen.getByText("Save Profile")).toBeDefined();
	});

	it("renders notifications card with toggle switches", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByText("Notifications")).toBeDefined();
		expect(screen.getByText("Push notifications")).toBeDefined();
		expect(screen.getByText("SMS notifications")).toBeDefined();
		expect(screen.getByText("Email notifications")).toBeDefined();
		expect(screen.getByText("Save Notifications")).toBeDefined();
	});

	it("renders quiet hours toggle", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByText("Quiet hours")).toBeDefined();
		expect(
			screen.getByText("Urgent messages will still be delivered during quiet hours"),
		).toBeDefined();
	});

	it("shows quiet hours time inputs when enabled", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: "21:00",
				quietEnd: "07:00",
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByLabelText("From")).toBeDefined();
		expect(screen.getByLabelText("To")).toBeDefined();
	});

	it("does not show school settings for non-admin users", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.queryByText("School Settings")).toBeNull();
	});

	it("shows school settings card for admin users", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1" },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "Admin", email: "admin@school.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});
		mockSchoolQuery.mockReturnValue({
			data: {
				name: "Oak Primary",
				defaultNotifyByPush: true,
				defaultNotifyBySms: false,
				defaultNotifyByEmail: true,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByText("School Settings")).toBeDefined();
		expect(screen.getByLabelText("School Name")).toBeDefined();
		expect(screen.getByText("Save School Settings")).toBeDefined();
	});

	it("shows default notification preferences in school settings", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1" },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "Admin", email: "admin@school.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});
		mockSchoolQuery.mockReturnValue({
			data: {
				name: "Oak Primary",
				defaultNotifyByPush: true,
				defaultNotifyBySms: false,
				defaultNotifyByEmail: true,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		expect(screen.getByText("Default notification preferences for new members")).toBeDefined();
	});

	it("email field is disabled", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
		expect(emailInput.disabled).toBe(true);
		expect(screen.getByText("Contact admin to change your email")).toBeDefined();
	});

	it("toggles notification switch on click", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockProfileQuery.mockReturnValue({
			data: { name: "John", email: "john@example.com", phone: null },
			isLoading: false,
		});
		mockNotifQuery.mockReturnValue({
			data: {
				notifyByPush: true,
				notifyBySms: false,
				notifyByEmail: true,
				quietStart: null,
				quietEnd: null,
			},
			isLoading: false,
		});

		render(<SettingsPage />);

		// SMS should start as off
		const smsSwitch = screen.getByRole("switch", { name: "SMS notifications" });
		expect(smsSwitch.getAttribute("aria-checked")).toBe("false");

		// Click to enable
		fireEvent.click(smsSwitch);

		expect(smsSwitch.getAttribute("aria-checked")).toBe("true");
	});
});
