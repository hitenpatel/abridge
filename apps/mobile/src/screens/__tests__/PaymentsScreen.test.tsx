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

jest.mock("lucide-react-native", () => ({
	Calendar: () => "Calendar",
	ChevronRight: () => "ChevronRight",
	CreditCard: () => "CreditCard",
	User: () => "User",
}));

const mockPayments = [
	{
		id: "pay-1",
		title: "School Trip Fee",
		amount: 1500,
		category: "TRIP",
		dueDate: new Date("2026-03-01"),
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
		expect(screen.queryByText("School Trip Fee")).toBeNull();
	});

	it("shows error state", () => {
		mockUseQuery.mockReturnValue({
			data: null,
			isLoading: false,
			isError: true,
			refetch: jest.fn(),
		});
		render(<PaymentsScreen />);
		expect(screen.getByText("Error loading payments.")).toBeTruthy();
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
		expect(screen.getByText("TRIP")).toBeTruthy();
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
