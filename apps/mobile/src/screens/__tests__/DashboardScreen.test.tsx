import { fireEvent, render, screen } from "@testing-library/react-native";
import { DashboardScreen } from "../DashboardScreen";

const mockUseQuery = jest.fn();
jest.mock("../../lib/trpc", () => ({
	trpc: {
		dashboard: {
			getSummary: { useQuery: (...args: any[]) => mockUseQuery(...args) },
		},
	},
}));

jest.mock("lucide-react-native", () => ({
	AlertCircle: () => "AlertCircle",
	Calendar: () => "Calendar",
	Clock: () => "Clock",
	CreditCard: () => "CreditCard",
	Mail: () => "Mail",
	TrendingUp: () => "TrendingUp",
}));

const mockNavigation = { navigate: jest.fn() } as any;

const dashboardData = {
	children: [{ id: "child-1", firstName: "Emma", lastName: "Smith" }],
	metrics: { unreadMessages: 3, paymentsTotal: 2500 },
	todayAttendance: [
		{ childId: "child-1", session: "AM", mark: "PRESENT" },
		{ childId: "child-1", session: "PM", mark: "LATE" },
	],
	upcomingEvents: [
		{
			id: "evt-1",
			title: "Sports Day",
			startDate: new Date("2026-02-10T09:00:00Z"),
			category: "EVENT",
		},
	],
	attendancePercentage: [{ childId: "child-1", percentage: 95 }],
};

describe("DashboardScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading spinner when data is loading", () => {
		mockUseQuery.mockReturnValue({
			isLoading: true,
			data: null,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		// During loading, skeleton components are shown
		expect(screen.toJSON()).toBeTruthy();
	});

	it("shows error state with retry button", () => {
		const mockRefetch = jest.fn();
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: null,
			isError: true,
			refetch: mockRefetch,
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		expect(screen.getByText("Failed to load dashboard")).toBeTruthy();
		fireEvent.press(screen.getByText("Retry"));
		expect(mockRefetch).toHaveBeenCalled();
	});

	it("renders overview stats", () => {
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: dashboardData,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		expect(screen.getByText("Overview")).toBeTruthy();
		expect(screen.getByText("3")).toBeTruthy();
		expect(screen.getByText("Unread Messages")).toBeTruthy();
		expect(screen.getByText("Outstanding")).toBeTruthy();
	});

	it("renders children with attendance data", () => {
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: dashboardData,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		expect(screen.getByText("Emma Smith")).toBeTruthy();
		expect(screen.getByText("95% Attendance")).toBeTruthy();
		expect(screen.getByText("PRESENT")).toBeTruthy();
		expect(screen.getByText("LATE")).toBeTruthy();
	});

	it("shows empty text when no children linked", () => {
		const emptyData = { ...dashboardData, children: [] };
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: emptyData,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		expect(screen.getByText("No children linked.")).toBeTruthy();
	});

	it("renders upcoming events", () => {
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: dashboardData,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		expect(screen.getByText("Upcoming Events")).toBeTruthy();
		expect(screen.getByText("Sports Day")).toBeTruthy();
		expect(screen.getByText("EVENT")).toBeTruthy();
	});

	it("navigates to Messages when unread messages card tapped", () => {
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: dashboardData,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		fireEvent.press(screen.getByText("Unread Messages"));
		expect(mockNavigation.navigate).toHaveBeenCalledWith("Messages");
	});

	it("navigates to Payments when outstanding card tapped", () => {
		mockUseQuery.mockReturnValue({
			isLoading: false,
			data: dashboardData,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		render(<DashboardScreen navigation={mockNavigation} />);
		fireEvent.press(screen.getByText("Outstanding"));
		expect(mockNavigation.navigate).toHaveBeenCalledWith("Payments");
	});
});
