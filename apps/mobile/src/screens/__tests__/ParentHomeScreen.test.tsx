import { render, screen } from "@testing-library/react-native";
import { ParentHomeScreen } from "../ParentHomeScreen";

const mockUseQuery = jest.fn();
const mockFeedQuery = jest.fn();
const mockActionItemsQuery = jest.fn();
const mockReactMutate = jest.fn();
const mockRemoveReactionMutate = jest.fn();
const mockLogout = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		dashboard: {
			getSummary: { useQuery: (...args: any[]) => mockUseQuery(...args) },
			getFeed: { useInfiniteQuery: (...args: any[]) => mockFeedQuery(...args) },
			getActionItems: { useQuery: (...args: any[]) => mockActionItemsQuery(...args) },
		},
		classPost: {
			react: { useMutation: () => ({ mutate: mockReactMutate }) },
			removeReaction: { useMutation: () => ({ mutate: mockRemoveReactionMutate }) },
		},
		useUtils: () => ({
			dashboard: { getFeed: { invalidate: jest.fn() } },
		}),
	},
}));

jest.mock("../../../App", () => ({
	useLogout: () => mockLogout,
}));

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigation = {
	navigate: jest.fn(),
	getParent: jest.fn(() => ({ navigate: jest.fn() })),
} as any;

describe("ParentHomeScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockFeedQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});
		mockActionItemsQuery.mockReturnValue({ data: undefined });
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

	it("shows date header and greeting when data loads", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
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

		expect(screen.getByText(/Hi, Alice!/)).toBeTruthy();
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

	it("renders Report Absence button", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
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

		expect(screen.getByText("Report Absence")).toBeTruthy();
	});

	it("shows Settings and Log Out buttons", () => {
		mockUseQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
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

		expect(screen.getByLabelText("Settings")).toBeTruthy();
		expect(screen.getByLabelText("Log Out")).toBeTruthy();
	});
});
