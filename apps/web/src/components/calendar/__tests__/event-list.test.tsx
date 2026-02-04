import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { addMonths, format, subMonths } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventList } from "../event-list";

// Mock the trpc client
vi.mock("@/lib/trpc", () => ({
	trpc: {
		calendar: {
			listEvents: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("EventList", () => {
	const mockUseQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Setup the mock implementation
		(trpcLib.trpc.calendar.listEvents.useQuery as any) = mockUseQuery;
	});

	it("renders a list of events for the current month", () => {
		const today = new Date();
		const mockEvents = [
			{
				id: "1",
				title: "Math Test",
				startDate: today,
				category: "DEADLINE",
				allDay: false,
			},
			{
				id: "2",
				title: "Soccer Match",
				startDate: today,
				category: "CLUB",
				allDay: false,
			},
		];

		mockUseQuery.mockReturnValue({
			data: mockEvents,
			isLoading: false,
			error: null,
		});

		render(<EventList />);

		expect(screen.getByText("Math Test")).toBeDefined();
		expect(screen.getByText("Soccer Match")).toBeDefined();
		expect(screen.getByText(format(today, "MMMM yyyy"))).toBeDefined();
	});

	it("allows navigating to the next month", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<EventList />);

		const nextButton = screen.getByLabelText("Next month");
		fireEvent.click(nextButton);

		const nextMonth = addMonths(new Date(), 1);
		expect(screen.getByText(format(nextMonth, "MMMM yyyy"))).toBeDefined();
	});

	it("allows navigating to the previous month", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<EventList />);

		const prevButton = screen.getByLabelText("Previous month");
		fireEvent.click(prevButton);

		const prevMonth = subMonths(new Date(), 1);
		expect(screen.getByText(format(prevMonth, "MMMM yyyy"))).toBeDefined();
	});

	it("displays loading state", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<EventList />);
		expect(screen.getByText("Loading events...")).toBeDefined();
	});

	it("displays empty state", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<EventList />);
		expect(screen.getByText("No events found for this month")).toBeDefined();
	});
});
