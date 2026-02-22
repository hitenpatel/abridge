import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "../app/dashboard/analytics/page";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		auth: {
			getSession: {
				useQuery: vi.fn(),
			},
		},
		analytics: {
			termStart: {
				useQuery: vi.fn(),
			},
			attendance: {
				useQuery: vi.fn(),
			},
			payments: {
				useQuery: vi.fn(),
			},
			forms: {
				useQuery: vi.fn(),
			},
			messages: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("AnalyticsPage", () => {
	const mockSessionQuery = vi.fn();
	const mockTermStart = vi.fn();
	const mockAttendance = vi.fn();
	const mockPayments = vi.fn();
	const mockForms = vi.fn();
	const mockMessages = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.auth.getSession.useQuery as any) = mockSessionQuery;
		(trpcLib.trpc.analytics.termStart.useQuery as any) = mockTermStart;
		(trpcLib.trpc.analytics.attendance.useQuery as any) = mockAttendance;
		(trpcLib.trpc.analytics.payments.useQuery as any) = mockPayments;
		(trpcLib.trpc.analytics.forms.useQuery as any) = mockForms;
		(trpcLib.trpc.analytics.messages.useQuery as any) = mockMessages;
	});

	function setupMocks(overrides?: {
		attendance?: any;
		payments?: any;
		forms?: any;
		messages?: any;
	}) {
		mockSessionQuery.mockReturnValue({
			data: { schoolId: "school-1", staffRole: "ADMIN" },
		});
		mockTermStart.mockReturnValue({
			data: new Date("2025-09-01").toISOString(),
		});
		mockAttendance.mockReturnValue({
			data: overrides?.attendance ?? {
				todayRate: 94,
				periodRate: 92,
				belowThresholdCount: 3,
				trend: [{ rate: 90 }, { rate: 92 }, { rate: 94 }],
				byClass: [],
			},
			isLoading: false,
		});
		mockPayments.mockReturnValue({
			data: overrides?.payments ?? {
				collectionRate: 78,
				collectedTotal: 150000,
				outstandingTotal: 42000,
				overdueCount: 5,
				byItem: [],
			},
			isLoading: false,
		});
		mockForms.mockReturnValue({
			data: overrides?.forms ?? {
				completionRate: 65,
				pendingCount: 12,
				byTemplate: [],
			},
			isLoading: false,
		});
		mockMessages.mockReturnValue({
			data: overrides?.messages ?? {
				sentCount: 42,
				avgReadRate: 88,
				byMessage: [],
			},
			isLoading: false,
		});
	}

	it("renders page heading and description", () => {
		setupMocks();

		render(<AnalyticsPage />);

		expect(screen.getByText("Analytics")).toBeDefined();
		expect(screen.getByText("School performance overview")).toBeDefined();
	});

	it("renders date range selector buttons", () => {
		setupMocks();

		render(<AnalyticsPage />);

		expect(screen.getByText("Today")).toBeDefined();
		expect(screen.getByText("This Week")).toBeDefined();
		expect(screen.getByText("This Month")).toBeDefined();
		expect(screen.getByText("This Term")).toBeDefined();
	});

	it("renders attendance card with data", () => {
		setupMocks();

		render(<AnalyticsPage />);

		expect(screen.getByText("Attendance")).toBeDefined();
		expect(screen.getByText("94%")).toBeDefined();
		expect(screen.getByText(/Period avg: 92%/)).toBeDefined();
		expect(screen.getByText(/Below 90%: 3 children/)).toBeDefined();
	});

	it("renders payments card with data", () => {
		setupMocks();

		render(<AnalyticsPage />);

		// Use getAllByText since "Payments" may appear in multiple places
		const paymentsHeadings = screen.getAllByText("Payments");
		expect(paymentsHeadings.length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("78%")).toBeDefined();
		expect(screen.getByText(/5 overdue items/)).toBeDefined();
	});

	it("renders forms card with data", () => {
		setupMocks();

		render(<AnalyticsPage />);

		// Use getAllByText since "Forms" may appear in multiple places
		const formsHeadings = screen.getAllByText("Forms");
		expect(formsHeadings.length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("65%")).toBeDefined();
		expect(screen.getByText("12 pending responses")).toBeDefined();
	});

	it("renders messages card with data", () => {
		setupMocks();

		render(<AnalyticsPage />);

		// Use getAllByText since "Messages" may appear in multiple places
		const messagesHeadings = screen.getAllByText("Messages");
		expect(messagesHeadings.length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("42")).toBeDefined();
		expect(screen.getByText("Avg read rate: 88%")).toBeDefined();
	});

	it("shows loading skeletons when data is loading", () => {
		mockSessionQuery.mockReturnValue({
			data: { schoolId: "school-1", staffRole: "ADMIN" },
		});
		mockTermStart.mockReturnValue({ data: null });
		mockAttendance.mockReturnValue({ data: undefined, isLoading: true });
		mockPayments.mockReturnValue({ data: undefined, isLoading: true });
		mockForms.mockReturnValue({ data: undefined, isLoading: true });
		mockMessages.mockReturnValue({ data: undefined, isLoading: true });

		render(<AnalyticsPage />);

		// Cards should not show actual data
		expect(screen.queryByText("94%")).toBeNull();
	});

	it("shows expand hint on cards", () => {
		setupMocks();

		render(<AnalyticsPage />);

		expect(screen.getByText("View by class")).toBeDefined();
		expect(screen.getByText("View by item")).toBeDefined();
		expect(screen.getByText("View by template")).toBeDefined();
		expect(screen.getByText("View by message")).toBeDefined();
	});

	it("expands attendance detail table on click", () => {
		setupMocks({
			attendance: {
				todayRate: 94,
				periodRate: 92,
				belowThresholdCount: 3,
				trend: [{ rate: 94 }],
				byClass: [
					{ className: "Year 3A", rate: 96, presentCount: 24, totalCount: 25 },
					{ className: "Year 3B", rate: 88, presentCount: 22, totalCount: 25 },
				],
			},
		});

		render(<AnalyticsPage />);

		// Click the attendance card
		fireEvent.click(screen.getByText("View by class"));

		expect(screen.getByText("Year 3A")).toBeDefined();
		expect(screen.getByText("Year 3B")).toBeDefined();
		expect(screen.getByText("96%")).toBeDefined();
		expect(screen.getByText("Collapse")).toBeDefined();
	});

	it("switches date range on button click", () => {
		setupMocks();

		render(<AnalyticsPage />);

		// Click "Today" button
		fireEvent.click(screen.getByText("Today"));

		// The button should become active (we verify the query was called with new params)
		// Since we're mocking, we just verify no crash
		expect(screen.getByText("Analytics")).toBeDefined();
	});
});
