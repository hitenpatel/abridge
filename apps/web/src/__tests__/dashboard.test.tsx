import * as authClientLib from "@/lib/auth-client";
import * as trpcLib from "@/lib/trpc";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "../app/dashboard/page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

// Mock auth client
vi.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: vi.fn(),
	},
}));

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: vi.fn(),
		dashboard: {
			getSummary: {
				useQuery: vi.fn(),
			},
			getFeed: {
				useInfiniteQuery: vi.fn(),
			},
			getActionItems: {
				useQuery: vi.fn(),
			},
		},
		classPost: {
			react: {
				useMutation: vi.fn(),
			},
			removeReaction: {
				useMutation: vi.fn(),
			},
		},
	},
}));

// Mock feed components to simplify tests
vi.mock("@/components/feed/activity-feed", () => ({
	ActivityFeed: () => <div data-testid="activity-feed" />,
}));
vi.mock("@/components/feed/action-items-row", () => ({
	ActionItemsRow: () => <div data-testid="action-items-row" />,
}));
vi.mock("@/components/feed/child-switcher", () => ({
	ChildSwitcher: () => <div data-testid="child-switcher" />,
}));

describe("DashboardPage", () => {
	const mockUseSession = vi.fn();
	const mockSummaryQuery = vi.fn();
	const mockFeedQuery = vi.fn();
	const mockActionItemsQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(authClientLib.authClient.useSession as any) = mockUseSession;
		(trpcLib.trpc.dashboard.getSummary.useQuery as any) = mockSummaryQuery;
		(trpcLib.trpc.dashboard.getFeed.useInfiniteQuery as any) = mockFeedQuery;
		(trpcLib.trpc.dashboard.getActionItems.useQuery as any) = mockActionItemsQuery;
		(trpcLib.trpc.useUtils as any) = () => ({
			dashboard: { getFeed: { invalidate: vi.fn() } },
		});
		(trpcLib.trpc.classPost.react.useMutation as any) = () => ({ mutate: vi.fn() });
		(trpcLib.trpc.classPost.removeReaction.useMutation as any) = () => ({ mutate: vi.fn() });

		mockFeedQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			fetchNextPage: vi.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
		});
		mockActionItemsQuery.mockReturnValue({ data: undefined, isLoading: false });
	});

	it("shows loading state while auth is pending", () => {
		mockUseSession.mockReturnValue({ data: null, isPending: true });
		mockSummaryQuery.mockReturnValue({ data: undefined, isLoading: false });

		render(<DashboardPage />);

		expect(screen.queryByTestId("dashboard-view")).toBeNull();
	});

	it("redirects to login when no session", () => {
		mockUseSession.mockReturnValue({ data: null, isPending: false });
		mockSummaryQuery.mockReturnValue({ data: undefined, isLoading: false });

		render(<DashboardPage />);

		expect(mockPush).toHaveBeenCalledWith("/login");
	});

	it("renders dashboard view when authenticated", () => {
		mockUseSession.mockReturnValue({
			data: { name: "John Smith" },
			isPending: false,
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});

		render(<DashboardPage />);

		expect(screen.getByTestId("dashboard-view")).toBeDefined();
	});

	it("shows activity feed component", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Parent" },
			isPending: false,
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});

		render(<DashboardPage />);

		expect(screen.getByTestId("activity-feed")).toBeDefined();
	});

	it("shows Report Absence button", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Parent" },
			isPending: false,
		});
		mockSummaryQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice", lastName: "Smith" }],
			},
			isLoading: false,
		});

		render(<DashboardPage />);

		expect(screen.getByText("Report Absence")).toBeDefined();
	});
});
