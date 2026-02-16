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
		dashboard: {
			getSummary: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("DashboardPage", () => {
	const mockUseSession = vi.fn();
	const mockUseQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(authClientLib.authClient.useSession as any) = mockUseSession;
		(trpcLib.trpc.dashboard.getSummary.useQuery as any) = mockUseQuery;
	});

	it("shows loading state while auth is pending", () => {
		mockUseSession.mockReturnValue({ data: null, isPending: true });
		mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });

		render(<DashboardPage />);

		// Should show skeleton loading UI
		expect(screen.queryByTestId("dashboard-view")).toBeNull();
	});

	it("redirects to login when no session", () => {
		mockUseSession.mockReturnValue({ data: null, isPending: false });
		mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });

		render(<DashboardPage />);

		expect(mockPush).toHaveBeenCalledWith("/login");
	});

	it("renders dashboard with greeting when authenticated", () => {
		mockUseSession.mockReturnValue({
			data: { name: "John Smith" },
			isPending: false,
		});
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: 0,
			},
			isLoading: false,
			error: null,
		});

		render(<DashboardPage />);

		expect(screen.getByText("Hi, John!")).toBeDefined();
		expect(screen.getByTestId("dashboard-view")).toBeDefined();
	});

	it("shows child status card when child data exists", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Jane Doe" },
			isPending: false,
		});
		mockUseQuery.mockReturnValue({
			data: {
				children: [{ id: "child-1", firstName: "Alice" }],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: 95,
			},
			isLoading: false,
			error: null,
		});

		render(<DashboardPage />);

		expect(screen.getByText("Alice is at School")).toBeDefined();
		expect(screen.getByText("95%")).toBeDefined();
	});

	it("shows upcoming events when available", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Parent" },
			isPending: false,
		});
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [{ id: "e1", title: "Sports Day", body: "Annual sports event" }],
				attendancePercentage: 0,
			},
			isLoading: false,
			error: null,
		});

		render(<DashboardPage />);

		expect(screen.getByText("Sports Day")).toBeDefined();
		expect(screen.getByText("Annual sports event")).toBeDefined();
	});

	it("shows no upcoming events message when none exist", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Parent" },
			isPending: false,
		});
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: 0,
			},
			isLoading: false,
			error: null,
		});

		render(<DashboardPage />);

		expect(screen.getByText("No upcoming events")).toBeDefined();
	});

	it("shows error message when summary query fails", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Parent" },
			isPending: false,
		});
		mockUseQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: { message: "Failed to load" },
		});

		render(<DashboardPage />);

		expect(screen.getByText(/Error loading dashboard/)).toBeDefined();
	});

	it("renders quick action links", () => {
		mockUseSession.mockReturnValue({
			data: { name: "Parent" },
			isPending: false,
		});
		mockUseQuery.mockReturnValue({
			data: {
				children: [],
				metrics: { unreadMessages: 0, paymentsCount: 0, paymentsTotal: 0, attendanceAlerts: 0 },
				todayAttendance: [],
				upcomingEvents: [],
				attendancePercentage: 0,
			},
			isLoading: false,
			error: null,
		});

		render(<DashboardPage />);

		expect(screen.getByText("Calendar")).toBeDefined();
		expect(screen.getByText("Sick Note")).toBeDefined();
		expect(screen.getByText("Lunch Menu")).toBeDefined();
	});
});
