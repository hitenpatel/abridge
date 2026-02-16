import { render, screen } from "@testing-library/react-native";
import { StaffHomeScreen } from "../StaffHomeScreen";

const mockSessionQuery = jest.fn();
const mockSummaryQuery = jest.fn();
const mockListRecentQuery = jest.fn();
const mockLogout = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		auth: {
			getSession: { useQuery: (...args: any[]) => mockSessionQuery(...args) },
		},
		dashboard: {
			getSummary: { useQuery: (...args: any[]) => mockSummaryQuery(...args) },
		},
		classPost: {
			listRecent: { useQuery: (...args: any[]) => mockListRecentQuery(...args) },
		},
	},
}));

jest.mock("../../../App", () => ({
	useLogout: () => mockLogout,
}));

jest.mock("@react-navigation/native", () => ({
	useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("StaffHomeScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockListRecentQuery.mockReturnValue({ data: undefined });
	});

	it("shows loading skeleton while data loads", () => {
		mockSessionQuery.mockReturnValue({ data: undefined });
		mockSummaryQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		// Should not show greeting when loading
		expect(screen.queryByText(/Good/)).toBeNull();
	});

	it("renders greeting with staff name", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Jane Teacher" }, staffRole: "TEACHER" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText(/Jane/)).toBeTruthy();
	});

	it("shows fallback name when no session", () => {
		mockSessionQuery.mockReturnValue({ data: undefined });
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText(/Teacher/)).toBeTruthy();
	});

	it("displays stat cards with metrics", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Jane" }, staffRole: "TEACHER" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 5, attendanceAlerts: 2 },
				upcomingEvents: [
					{ id: "ev-1", title: "Event", startDate: new Date(), category: "EVENT", body: null },
				],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText("5")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
		expect(screen.getByText("1")).toBeTruthy();
	});

	it("shows Post Update CTA", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Jane" }, staffRole: "TEACHER" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText("Post Update")).toBeTruthy();
	});

	it("shows 'No recent posts' when no events", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Jane" }, staffRole: "TEACHER" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText("No recent posts")).toBeTruthy();
	});

	it("shows recent posts when available", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Jane" }, staffRole: "TEACHER", schoolId: "school-1" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});
		mockListRecentQuery.mockReturnValue({
			data: [
				{
					id: "post-1",
					body: "Sports Day update",
					yearGroup: "Year 3",
					className: "3A",
					createdAt: new Date().toISOString(),
					mediaUrls: [],
				},
			],
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText("Sports Day update")).toBeTruthy();
	});

	it("shows Staff Management link for admin only", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Admin User" }, staffRole: "ADMIN" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.getByText("Staff Management")).toBeTruthy();
	});

	it("hides Staff Management link for non-admin", () => {
		mockSessionQuery.mockReturnValue({
			data: { user: { name: "Teacher" }, staffRole: "TEACHER" },
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				metrics: { unreadMessages: 0, attendanceAlerts: 0 },
				upcomingEvents: [],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffHomeScreen />);

		expect(screen.queryByText("Staff Management")).toBeNull();
	});
});
