import { fireEvent, render, screen } from "@testing-library/react-native";
import { MessagesScreen } from "../MessagesScreen";

const mockUseInfiniteQuery = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		messaging: {
			listReceived: {
				useInfiniteQuery: (...args: any[]) => mockUseInfiniteQuery(...args),
			},
		},
	},
}));

jest.mock("@react-navigation/native", () => ({
	useNavigation: () => ({ navigate: mockNavigate }),
}));

describe("MessagesScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading skeleton while messages load", () => {
		mockUseInfiniteQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<MessagesScreen />);

		expect(screen.getByText("Inbox")).toBeTruthy();
		expect(screen.queryByText("No messages yet")).toBeNull();
	});

	it("shows error state on failure", () => {
		mockUseInfiniteQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<MessagesScreen />);

		expect(screen.getByText("Failed to load messages")).toBeTruthy();
		expect(screen.getByText("Retry")).toBeTruthy();
	});

	it("calls refetch on retry press", () => {
		const mockRefetch = jest.fn();
		mockUseInfiniteQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			refetch: mockRefetch,
			isRefetching: false,
		});

		render(<MessagesScreen />);

		fireEvent.press(screen.getByText("Retry"));
		expect(mockRefetch).toHaveBeenCalled();
	});

	it("shows empty state when no messages", () => {
		mockUseInfiniteQuery.mockReturnValue({
			data: { pages: [{ items: [] }] },
			isLoading: false,
			isError: false,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<MessagesScreen />);

		expect(screen.getByText("No messages yet")).toBeTruthy();
	});

	it("renders message list with subjects", () => {
		const mockMessages = [
			{
				id: "msg-1",
				subject: "School Trip Update",
				body: "The trip to the museum has been rescheduled",
				category: "announcement",
				createdAt: new Date(),
				schoolName: "Oak Primary",
				isRead: false,
			},
			{
				id: "msg-2",
				subject: "Lunch Menu Change",
				body: "New vegetarian options available",
				category: "reminder",
				createdAt: new Date(),
				schoolName: "Oak Primary",
				isRead: true,
			},
		];

		mockUseInfiniteQuery.mockReturnValue({
			data: { pages: [{ items: mockMessages }] },
			isLoading: false,
			isError: false,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<MessagesScreen />);

		expect(screen.getByText("School Trip Update")).toBeTruthy();
		expect(screen.getByText("Lunch Menu Change")).toBeTruthy();
	});

	it("navigates to message detail on press", () => {
		const mockMessage = {
			id: "msg-1",
			subject: "Important Notice",
			body: "Please read carefully",
			category: "urgent",
			createdAt: new Date(),
			schoolName: "Oak Primary",
			isRead: false,
		};

		mockUseInfiniteQuery.mockReturnValue({
			data: { pages: [{ items: [mockMessage] }] },
			isLoading: false,
			isError: false,
			fetchNextPage: jest.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<MessagesScreen />);

		fireEvent.press(screen.getByText("Important Notice"));
		expect(mockNavigate).toHaveBeenCalledWith(
			"MessageDetail",
			expect.objectContaining({
				message: expect.objectContaining({ id: "msg-1" }),
			}),
		);
	});
});
