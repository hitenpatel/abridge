import { render, screen } from "@testing-library/react-native";
import { StaffPaymentsScreen } from "../StaffPaymentsScreen";

const mockSessionQuery = jest.fn();
const mockPaymentItemsQuery = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		auth: {
			getSession: { useQuery: (...args: any[]) => mockSessionQuery(...args) },
		},
		payments: {
			listPaymentItems: { useQuery: (...args: any[]) => mockPaymentItemsQuery(...args) },
		},
	},
}));

describe("StaffPaymentsScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading skeleton while data loads", () => {
		mockSessionQuery.mockReturnValue({ data: { schoolId: "school-1" } });
		mockPaymentItemsQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffPaymentsScreen />);

		// Should render without crashing during loading
		expect(screen.toJSON()).toBeTruthy();
	});

	it("renders header text when loaded", () => {
		mockSessionQuery.mockReturnValue({ data: { schoolId: "school-1" } });
		mockPaymentItemsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffPaymentsScreen />);

		expect(screen.getAllByText("Payments").length).toBeGreaterThan(0);
		expect(screen.getByText("Manage payment items")).toBeTruthy();
	});

	it("shows empty state when no payment items", () => {
		mockSessionQuery.mockReturnValue({ data: { schoolId: "school-1" } });
		mockPaymentItemsQuery.mockReturnValue({
			data: { data: [] },
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffPaymentsScreen />);

		expect(screen.getByText("No payment items")).toBeTruthy();
		expect(screen.getByText("Create your first payment item")).toBeTruthy();
	});

	it("renders payment items with titles and amounts", () => {
		mockSessionQuery.mockReturnValue({ data: { schoolId: "school-1" } });
		mockPaymentItemsQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "item-1",
						title: "School Trip Fee",
						amount: 1500,
						category: "TRIP",
						recipientCount: 30,
						paymentCount: 15,
					},
					{
						id: "item-2",
						title: "Dinner Money",
						amount: 350,
						category: "DINNER_MONEY",
						recipientCount: 50,
						paymentCount: 40,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffPaymentsScreen />);

		expect(screen.getByText("School Trip Fee")).toBeTruthy();
		expect(screen.getByText("£15.00")).toBeTruthy();
		expect(screen.getByText("Dinner Money")).toBeTruthy();
		expect(screen.getByText("£3.50")).toBeTruthy();
	});

	it("shows summary counts", () => {
		mockSessionQuery.mockReturnValue({ data: { schoolId: "school-1" } });
		mockPaymentItemsQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "item-1",
						title: "Trip",
						amount: 1000,
						category: "TRIP",
						recipientCount: 10,
						paymentCount: 5,
					},
					{
						id: "item-2",
						title: "Dinner",
						amount: 200,
						category: "DINNER_MONEY",
						recipientCount: 20,
						paymentCount: 10,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffPaymentsScreen />);

		expect(screen.getByText("Total Items")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy(); // Total items count
	});

	it("shows recipient and payment progress", () => {
		mockSessionQuery.mockReturnValue({ data: { schoolId: "school-1" } });
		mockPaymentItemsQuery.mockReturnValue({
			data: {
				data: [
					{
						id: "item-1",
						title: "Trip Fee",
						amount: 1500,
						category: "TRIP",
						recipientCount: 20,
						paymentCount: 10,
					},
				],
			},
			isLoading: false,
			refetch: jest.fn(),
			isRefetching: false,
		});

		render(<StaffPaymentsScreen />);

		expect(screen.getByText("20 recipients")).toBeTruthy();
		expect(screen.getByText("10/20 paid")).toBeTruthy();
		expect(screen.getByText("50%")).toBeTruthy();
	});
});
