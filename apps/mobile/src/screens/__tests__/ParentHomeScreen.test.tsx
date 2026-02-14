import { fireEvent, render, screen } from "@testing-library/react-native";
import { ParentHomeScreen } from "../ParentHomeScreen";

const mockUseQuery = jest.fn();
const mockLogout = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		dashboard: {
			getSummary: { useQuery: (...args: any[]) => mockUseQuery(...args) },
		},
	},
}));

jest.mock("../../../App", () => ({
	useLogout: () => mockLogout,
}));

const mockNavigation = {
	navigate: jest.fn(),
	getParent: jest.fn(() => ({ navigate: jest.fn() })),
} as any;

describe("ParentHomeScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading skeleton when data is loading", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.queryByText(/Hi,/)).toBeNull();
	});

	it("shows error state on failure", () => {
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.getByText("Failed to load")).toBeTruthy();
		expect(screen.getByText("Retry")).toBeTruthy();
	});

	it("renders greeting with child name when data loads", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice" }],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
			},
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.getByText("Hi, Alice!")).toBeTruthy();
	});

	it("shows fallback greeting when no children", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
			},
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.getByText("Hi, there!")).toBeTruthy();
	});

	it("renders quick action buttons", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
			},
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.getByText("Calendar")).toBeTruthy();
		expect(screen.getByText("Forms")).toBeTruthy();
		expect(screen.getByText("Sick Note")).toBeTruthy();
		expect(screen.getByText("Awards")).toBeTruthy();
	});

	it("shows unread messages card when there are unread messages", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 3, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
			},
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.getByText("3 New Messages")).toBeTruthy();
	});

	it("shows payment due card when payments outstanding", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 1, paymentsTotal: 2500, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: [],
			},
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		expect(screen.getByText("Payment Due")).toBeTruthy();
		expect(screen.getByText("£25.00 outstanding")).toBeTruthy();
	});

	it("calls refetch on retry press in error state", () => {
		const mockRefetch = jest.fn();
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: mockRefetch,
			isRefetching: false,
		});

		render(<ParentHomeScreen navigation={mockNavigation} />);

		fireEvent.press(screen.getByText("Retry"));
		expect(mockRefetch).toHaveBeenCalled();
	});
});
