import { fireEvent, render, screen } from "@testing-library/react-native";
import { CalendarScreen } from "../CalendarScreen";

const mockUseQuery = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		calendar: {
			listEvents: { useQuery: (...args: any[]) => mockUseQuery(...args) },
		},
	},
}));

describe("CalendarScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading skeleton while events load", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<CalendarScreen />);

		expect(screen.queryByText("No events found")).toBeNull();
	});

	it("shows error state on failure", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<CalendarScreen />);

		expect(screen.getByText("Failed to load events")).toBeTruthy();
		expect(screen.getByText("Retry")).toBeTruthy();
	});

	it("calls refetch on retry press", () => {
		const mockRefetch = jest.fn();
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: mockRefetch,
			isRefetching: false,
		});

		render(<CalendarScreen />);

		fireEvent.press(screen.getByText("Retry"));
		expect(mockRefetch).toHaveBeenCalled();
	});

	it("shows empty state when no events", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<CalendarScreen />);

		expect(screen.getByText("No events found")).toBeTruthy();
	});

	it("displays current month name", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<CalendarScreen />);

		const now = new Date();
		const monthYear = now.toLocaleString("default", { month: "long", year: "numeric" });
		expect(screen.getByText(monthYear)).toBeTruthy();
	});

	it("renders events with titles", () => {
		const mockEvents = [
			{
				id: "ev-1",
				title: "Sports Day",
				startDate: new Date(),
				category: "EVENT",
				allDay: true,
				body: "Annual sports competition",
			},
			{
				id: "ev-2",
				title: "Parents Evening",
				startDate: new Date(),
				category: "DEADLINE",
				allDay: false,
				body: null,
			},
		];

		mockUseQuery.mockReturnValue({
			data: mockEvents,
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<CalendarScreen />);

		expect(screen.getByText("Sports Day")).toBeTruthy();
		expect(screen.getByText("Parents Evening")).toBeTruthy();
		expect(screen.getByText("Annual sports competition")).toBeTruthy();
	});

	it("shows category badges on events", () => {
		mockUseQuery.mockReturnValue({
			data: [
				{
					id: "ev-1",
					title: "Inset Day",
					startDate: new Date(),
					category: "INSET_DAY",
					allDay: true,
					body: null,
				},
			],
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<CalendarScreen />);

		expect(screen.getByText("INSET DAY")).toBeTruthy();
	});
});
