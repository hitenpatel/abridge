import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OutstandingPayments } from "../outstanding-payments";

// Mock sonner
vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock the trpc client
vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: vi.fn(),
		payments: {
			listOutstandingPayments: { useQuery: vi.fn() },
			createCheckoutSession: { useMutation: vi.fn() },
			createCartCheckout: { useMutation: vi.fn() },
		},
	},
}));

describe("OutstandingPayments", () => {
	const mockUseQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.payments.listOutstandingPayments.useQuery as any) = mockUseQuery;
		(trpcLib.trpc.payments.createCheckoutSession.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
		(trpcLib.trpc.payments.createCartCheckout.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
	});

	it("shows loading state", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
		});

		render(<OutstandingPayments />);
		expect(screen.getByText("Loading your payments...")).toBeDefined();
	});

	it("shows error state", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		});

		render(<OutstandingPayments />);
		expect(screen.getByText("Error loading payments.")).toBeDefined();
	});

	it("shows empty state when no payments", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
		});

		render(<OutstandingPayments />);
		expect(screen.getByText("No outstanding payments")).toBeDefined();
		expect(screen.getByText("You're all caught up! Great job.")).toBeDefined();
	});

	it("renders payment cards with title, amount, and childName", () => {
		const mockPayments = [
			{
				id: "pay-1",
				title: "School Trip Fee",
				amount: 2500,
				category: "TRIP",
				childId: "child-1",
				childName: "Alice Smith",
				dueDate: null,
				description: null,
			},
			{
				id: "pay-2",
				title: "Lunch Money",
				amount: 1050,
				category: "MEAL",
				childId: "child-2",
				childName: "Bob Jones",
				dueDate: "2026-04-01T00:00:00.000Z",
				description: "April lunch fees",
			},
		];

		mockUseQuery.mockReturnValue({
			data: mockPayments,
			isLoading: false,
			isError: false,
		});

		render(<OutstandingPayments />);

		expect(screen.getByText("School Trip Fee")).toBeDefined();
		expect(screen.getByText("£25.00")).toBeDefined();
		expect(screen.getByText("Alice Smith")).toBeDefined();
		expect(screen.getByText("TRIP")).toBeDefined();

		expect(screen.getByText("Lunch Money")).toBeDefined();
		expect(screen.getByText("£10.50")).toBeDefined();
		expect(screen.getByText("Bob Jones")).toBeDefined();
		expect(screen.getByText("MEAL")).toBeDefined();
		expect(screen.getByText("April lunch fees")).toBeDefined();
	});

	it("toggles Add to Cart / In Cart when clicked", () => {
		const mockPayments = [
			{
				id: "pay-1",
				title: "School Trip Fee",
				amount: 2500,
				category: "TRIP",
				childId: "child-1",
				childName: "Alice Smith",
				dueDate: null,
				description: null,
			},
		];

		mockUseQuery.mockReturnValue({
			data: mockPayments,
			isLoading: false,
			isError: false,
		});

		render(<OutstandingPayments />);

		const addButton = screen.getByText("Add to Cart");
		expect(addButton).toBeDefined();

		fireEvent.click(addButton);

		expect(screen.getByText("In Cart")).toBeDefined();
		expect(screen.queryByText("Add to Cart")).toBeNull();

		fireEvent.click(screen.getByText("In Cart"));

		expect(screen.getByText("Add to Cart")).toBeDefined();
		expect(screen.queryByText("In Cart")).toBeNull();
	});
});
