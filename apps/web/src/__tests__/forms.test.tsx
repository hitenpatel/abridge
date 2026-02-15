import * as trpcLib from "@/lib/trpc";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FormsPage from "../app/dashboard/forms/page";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: any }) => (
		<a href={href} {...rest}>{children}</a>
	),
}));

// Mock lucide-react
vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<Record<string, any>>();
	return {
		...actual,
		FileText: ({ className }: any) => <span data-testid="icon-file-text" className={className} />,
	};
});

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		dashboard: {
			getSummary: {
				useQuery: vi.fn(),
			},
		},
		forms: {
			getPendingForms: {
				useQuery: vi.fn(),
			},
			getCompletedForms: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("FormsPage", () => {
	const mockSummaryQuery = vi.fn();
	const mockPendingQuery = vi.fn();
	const mockCompletedQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.dashboard.getSummary.useQuery as any) = mockSummaryQuery;
		(trpcLib.trpc.forms.getPendingForms.useQuery as any) = mockPendingQuery;
		(trpcLib.trpc.forms.getCompletedForms.useQuery as any) = mockCompletedQuery;
	});

	it("shows loading skeleton while data loads", () => {
		mockSummaryQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});

		render(<FormsPage />);

		expect(screen.queryByText("Forms & Consent")).toBeNull();
	});

	it("shows error state on failure", () => {
		mockSummaryQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: { message: "Something went wrong" },
		});

		render(<FormsPage />);

		expect(screen.getByText("Error loading forms: Something went wrong")).toBeDefined();
	});

	it("shows empty state when no children", () => {
		mockSummaryQuery.mockReturnValue({
			data: { children: [] },
			isLoading: false,
			error: null,
		});

		render(<FormsPage />);

		expect(screen.getByText("Forms & Consent")).toBeDefined();
		expect(screen.getByText("No forms available at this time.")).toBeDefined();
	});

	it("renders page heading and description", () => {
		mockSummaryQuery.mockReturnValue({
			data: { children: [] },
			isLoading: false,
			error: null,
		});

		render(<FormsPage />);

		expect(screen.getByText("Forms & Consent")).toBeDefined();
		expect(
			screen.getByText("Review and sign important documents from your children's school."),
		).toBeDefined();
	});

	it("renders child forms sections when children exist", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [
					{ id: "child-1", firstName: "Alice", lastName: "Smith" },
				],
			},
			isLoading: false,
			error: null,
		});
		mockPendingQuery.mockReturnValue({
			data: [
				{ id: "form-1", title: "Photo Consent", description: "Allow photos in newsletters" },
			],
			isLoading: false,
		});
		mockCompletedQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<FormsPage />);

		expect(screen.getByText("Alice Smith")).toBeDefined();
		expect(screen.getByText("Action Required")).toBeDefined();
		expect(screen.getByText("Photo Consent")).toBeDefined();
		expect(screen.getByText("Allow photos in newsletters")).toBeDefined();
	});

	it("renders completed forms section", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [
					{ id: "child-1", firstName: "Alice", lastName: "Smith" },
				],
			},
			isLoading: false,
			error: null,
		});
		mockPendingQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});
		mockCompletedQuery.mockReturnValue({
			data: [
				{
					id: "resp-1",
					submittedAt: new Date("2025-03-10"),
					template: { title: "Medical Info" },
				},
			],
			isLoading: false,
		});

		render(<FormsPage />);

		expect(screen.getByText("Completed")).toBeDefined();
		expect(screen.getByText("Medical Info")).toBeDefined();
		expect(screen.getByText("Submitted")).toBeDefined();
	});

	it("shows loading state for child forms", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [
					{ id: "child-1", firstName: "Alice", lastName: "Smith" },
				],
			},
			isLoading: false,
			error: null,
		});
		mockPendingQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
		});
		mockCompletedQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<FormsPage />);

		// Should show skeleton, not form items
		expect(screen.queryByText("Action Required")).toBeNull();
	});

	it("renders pending form links with correct href", () => {
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [
					{ id: "child-1", firstName: "Alice", lastName: "Smith" },
				],
			},
			isLoading: false,
			error: null,
		});
		mockPendingQuery.mockReturnValue({
			data: [
				{ id: "form-1", title: "Trip Permission", description: null },
			],
			isLoading: false,
		});
		mockCompletedQuery.mockReturnValue({
			data: [],
			isLoading: false,
		});

		render(<FormsPage />);

		const formLink = screen.getByTestId("form-item");
		expect(formLink.getAttribute("href")).toBe("/dashboard/forms/form-1?childId=child-1");
	});
});
