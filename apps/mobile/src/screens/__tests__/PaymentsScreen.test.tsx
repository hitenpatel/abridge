import { fireEvent, render, screen } from "@testing-library/react-native";
import { PaymentsScreen } from "../PaymentsScreen";

const mockUseQuery = jest.fn();
const mockMutate = jest.fn();
jest.mock("../../lib/trpc", () => ({
	trpc: {
		payments: {
			listOutstandingPayments: { useQuery: (...args: any[]) => mockUseQuery(...args) },
			createCheckoutSession: {
				useMutation: (opts: any) => ({
					mutate: (...args: any[]) => {
						mockMutate(...args);
					},
					isPending: false,
				}),
			},
		},
	},
}));

const mockPayments = [
	{
		id: "pay-1",
		title: "School Trip Fee",
		amount: 1500,
		category: "TRIP",
		dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now (urgent)
		childId: "child-1",
		childName: "Emma Smith",
	},
];

describe("PaymentsScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading state", () => {
		mockUseQuery.mockReturnValue({
			data: null,
			isLoading: true,
			isError: false,
			refetch: jest.fn(),
		});
		render(<PaymentsScreen />);
		// Should render without crashing during loading
		expect(screen.toJSON()).toBeTruthy();
	});

	it("shows error state with retry button", () => {
		const mockRefetch = jest.fn();
		mockUseQuery.mockReturnValue({
			data: null,
			isLoading: false,
			isError: true,
			refetch: mockRefetch,
		});
		render(<PaymentsScreen />);
		expect(screen.getByText("Error loading payments")).toBeTruthy();
		fireEvent.press(screen.getByText("Retry"));
		expect(mockRefetch).toHaveBeenCalled();
	});

	it("renders payment items with title and child name", () => {
		mockUseQuery.mockReturnValue({
			data: mockPayments,
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
		});
		render(<PaymentsScreen />);
		expect(screen.getByText("School Trip Fee")).toBeTruthy();
		expect(screen.getByText("Emma Smith")).toBeTruthy();
	});

	it("shows empty state when no payments", () => {
		mockUseQuery.mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
		});
		render(<PaymentsScreen />);
		expect(screen.getByText("No outstanding payments")).toBeTruthy();
		expect(screen.getByText("You're all caught up!")).toBeTruthy();
	});

	it("calls createCheckoutSession when Pay Now is pressed", () => {
		mockUseQuery.mockReturnValue({
			data: mockPayments,
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
		});
		render(<PaymentsScreen />);
		fireEvent.press(screen.getByText("Pay Now"));
		expect(mockMutate).toHaveBeenCalledWith({ paymentItemId: "pay-1", childId: "child-1" });
	});
});
