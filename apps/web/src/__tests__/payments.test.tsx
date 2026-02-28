import * as trpcLib from "@/lib/trpc";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentsDashboardPage from "../app/dashboard/payments/page";

// Mock feature toggles
vi.mock("@/lib/feature-toggles", () => ({
	useFeatureToggles: () => ({
		paymentsEnabled: true,
		messagingEnabled: true,
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
	}),
}));

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		auth: {
			getSession: {
				useQuery: vi.fn(),
			},
		},
		payments: {
			listPaymentItems: {
				useQuery: vi.fn(),
			},
			listOutstandingPayments: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("PaymentsDashboardPage", () => {
	const mockSessionQuery = vi.fn();
	const mockOutstandingQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.auth.getSession.useQuery as any) = mockSessionQuery;
		(trpcLib.trpc.payments.listPaymentItems.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.payments.listOutstandingPayments.useQuery as any) = mockOutstandingQuery;
	});

	it("renders parent payments view with outstanding payments heading", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
		});
		mockOutstandingQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Outstanding Payments")).toBeDefined();
		expect(screen.getByTestId("payments-list")).toBeDefined();
	});

	it("shows empty state when no outstanding payments", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
		});
		mockOutstandingQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("No outstanding payments. You're all paid up!")).toBeDefined();
	});

	it("renders outstanding payment items", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
		});
		mockOutstandingQuery.mockReturnValue({
			data: [
				{
					id: "1",
					childId: "c1",
					title: "Science Museum Trip",
					childName: "Emma",
					description: "Year 5 outing",
					amount: 2500,
					category: "TRIPS",
				},
			],
			isLoading: false,
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Science Museum Trip")).toBeDefined();
		expect(screen.getByText("£25.00")).toBeDefined();
		expect(screen.getByText("TRIPS")).toBeDefined();
	});

	it("shows view payment history link", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: null, schoolId: null },
		});
		mockOutstandingQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("View Payment History")).toBeDefined();
	});

	it("renders staff view for staff users", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Payment Items")).toBeDefined();
		expect(screen.getByText("Create Payment Item")).toBeDefined();
	});

	it("shows staff empty state when no payment items", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1" },
		});
		(trpcLib.trpc.payments.listPaymentItems.useQuery as any) = () => ({
			data: { data: [] },
			isLoading: false,
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("No payment items yet. Create one to get started.")).toBeDefined();
	});
});
