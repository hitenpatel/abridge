import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentsDashboardPage from "../app/dashboard/payments/page";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		auth: {
			getSession: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("PaymentsDashboardPage", () => {
	const mockSessionQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.auth.getSession.useQuery as any) = mockSessionQuery;
	});

	it("renders payment list with upcoming payments", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "John Smith" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByTestId("payments-list")).toBeDefined();
		expect(screen.getByText("Science Museum Trip")).toBeDefined();
		expect(screen.getByText("November Lunch Plan")).toBeDefined();
	});

	it("displays user name in expenses header", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "John Smith" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("John's School Expenses")).toBeDefined();
	});

	it("shows payment amounts", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Jane Doe" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("$25.00")).toBeDefined();
		expect(screen.getByText("$85.00")).toBeDefined();
	});

	it("shows due dates for upcoming payments", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Due Tomorrow")).toBeDefined();
		expect(screen.getByText("Due Nov 1")).toBeDefined();
	});

	it("shows recently paid section", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Recently Paid")).toBeDefined();
		expect(screen.getByText("Art Supplies Fee")).toBeDefined();
		expect(screen.getByText("Fall Festival Ticket")).toBeDefined();
	});

	it("shows current balance", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Current Balance")).toBeDefined();
		expect(screen.getByText("$142.50")).toBeDefined();
	});

	it("renders quick top-up section with preset amounts", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Quick Top-Up")).toBeDefined();
		expect(screen.getByText("+$20")).toBeDefined();
		expect(screen.getByText("+$50")).toBeDefined();
		expect(screen.getByText("+$100")).toBeDefined();
	});

	it("renders payment methods section", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Payment Methods")).toBeDefined();
		expect(screen.getByText("Visa ending in 4242")).toBeDefined();
	});

	it("switches between upcoming and history views", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		// Click history tab
		fireEvent.click(screen.getByText("History"));

		expect(screen.getByText("Payment history coming soon")).toBeDefined();

		// Click back to upcoming
		fireEvent.click(screen.getByText("Upcoming"));

		expect(screen.getByText("Science Museum Trip")).toBeDefined();
	});

	it("renders pay button for urgent payments", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent" },
		});

		render(<PaymentsDashboardPage />);

		const payButtons = screen.getAllByTestId("pay-button");
		expect(payButtons.length).toBeGreaterThanOrEqual(1);
		expect(payButtons[0].textContent).toBe("Pay");
	});

	it("falls back to Student when no session name", () => {
		mockSessionQuery.mockReturnValue({
			data: null,
		});

		render(<PaymentsDashboardPage />);

		expect(screen.getByText("Student's School Expenses")).toBeDefined();
	});
});
