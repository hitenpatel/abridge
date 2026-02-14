import { render, screen } from "@testing-library/react-native";
import { FormsScreen } from "../FormsScreen";

const mockSummaryQuery = jest.fn();
const mockPendingQuery = jest.fn();
const mockCompletedQuery = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		dashboard: {
			getSummary: { useQuery: (...args: any[]) => mockSummaryQuery(...args) },
		},
		forms: {
			getPendingForms: { useQuery: (...args: any[]) => mockPendingQuery(...args) },
			getCompletedForms: { useQuery: (...args: any[]) => mockCompletedQuery(...args) },
		},
	},
}));

jest.mock("@react-navigation/native", () => ({
	useNavigation: () => ({ navigate: mockNavigate }),
}));

describe("FormsScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows loading skeleton while summary loads", () => {
		mockSummaryQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		mockPendingQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			refetch: jest.fn(),
		});
		mockCompletedQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			refetch: jest.fn(),
		});

		render(<FormsScreen />);

		expect(screen.queryByText("Forms & Consent")).toBeNull();
	});

	it("renders header text when loaded", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});
		mockPendingQuery.mockReturnValue({
			data: [],
			isLoading: false,
			refetch: jest.fn(),
		});
		mockCompletedQuery.mockReturnValue({
			data: [],
			isLoading: false,
			refetch: jest.fn(),
		});

		render(<FormsScreen />);

		expect(screen.getByText("Forms & Consent")).toBeTruthy();
		expect(screen.getByText("Complete required forms for your children")).toBeTruthy();
	});

	it("shows empty state when no forms", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});
		mockPendingQuery.mockReturnValue({
			data: [],
			isLoading: false,
			refetch: jest.fn(),
		});
		mockCompletedQuery.mockReturnValue({
			data: [],
			isLoading: false,
			refetch: jest.fn(),
		});

		render(<FormsScreen />);

		expect(screen.getByText("No forms available")).toBeTruthy();
	});

	it("shows pending forms with titles", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});
		mockPendingQuery.mockReturnValue({
			data: [
				{ id: "form-1", title: "Permission Slip", description: "School trip permission" },
				{ id: "form-2", title: "Medical Form", description: null },
			],
			isLoading: false,
			refetch: jest.fn(),
		});
		mockCompletedQuery.mockReturnValue({
			data: [],
			isLoading: false,
			refetch: jest.fn(),
		});

		render(<FormsScreen />);

		expect(screen.getByText("Action Required")).toBeTruthy();
		expect(screen.getByText("Permission Slip")).toBeTruthy();
		expect(screen.getByText("Medical Form")).toBeTruthy();
	});

	it("shows completed forms section", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});
		mockPendingQuery.mockReturnValue({
			data: [],
			isLoading: false,
			refetch: jest.fn(),
		});
		mockCompletedQuery.mockReturnValue({
			data: [
				{
					id: "resp-1",
					submittedAt: new Date("2025-03-01"),
					template: { title: "Consent Form" },
				},
			],
			isLoading: false,
			refetch: jest.fn(),
		});

		render(<FormsScreen />);

		expect(screen.getByText("Completed")).toBeTruthy();
		expect(screen.getByText("Consent Form")).toBeTruthy();
	});
});
