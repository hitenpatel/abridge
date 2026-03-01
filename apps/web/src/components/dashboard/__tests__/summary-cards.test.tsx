import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SummaryCards } from "../summary-cards";

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const defaultData = {
	unreadMessages: 3,
	paymentsCount: 2,
	paymentsTotal: 1550,
	attendanceAlerts: 1,
};

describe("SummaryCards", () => {
	it("renders all three card titles", () => {
		render(<SummaryCards data={defaultData} />);

		expect(screen.getByText("Unread Messages")).toBeDefined();
		expect(screen.getByText("Outstanding Payments")).toBeDefined();
		expect(screen.getByText("Attendance Alerts")).toBeDefined();
	});

	it("displays formatted currency correctly (pence to GBP)", () => {
		render(<SummaryCards data={defaultData} />);

		expect(screen.getByText("£15.50")).toBeDefined();
	});

	it("formats zero pence as £0.00", () => {
		render(<SummaryCards data={{ ...defaultData, paymentsTotal: 0 }} />);

		expect(screen.getByText("£0.00")).toBeDefined();
	});

	it("formats large amounts correctly", () => {
		render(<SummaryCards data={{ ...defaultData, paymentsTotal: 123456 }} />);

		expect(screen.getByText("£1,234.56")).toBeDefined();
	});

	it("shows plural message text when unreadMessages > 1", () => {
		render(<SummaryCards data={{ ...defaultData, unreadMessages: 3 }} />);

		expect(screen.getByText("3 new messages")).toBeDefined();
	});

	it("shows singular message text when unreadMessages is 1", () => {
		render(<SummaryCards data={{ ...defaultData, unreadMessages: 1 }} />);

		expect(screen.getByText("1 new message")).toBeDefined();
	});

	it("does not show new message text when unreadMessages is 0", () => {
		render(<SummaryCards data={{ ...defaultData, unreadMessages: 0 }} />);

		expect(screen.queryByText(/new message/)).toBeNull();
	});

	it("shows plural items text when paymentsCount > 1", () => {
		render(<SummaryCards data={{ ...defaultData, paymentsCount: 5 }} />);

		expect(screen.getByText("5 items pending")).toBeDefined();
	});

	it("shows singular item text when paymentsCount is 1", () => {
		render(<SummaryCards data={{ ...defaultData, paymentsCount: 1 }} />);

		expect(screen.getByText("1 item pending")).toBeDefined();
	});

	it("shows 'Last 7 days' when attendanceAlerts > 0", () => {
		render(<SummaryCards data={{ ...defaultData, attendanceAlerts: 2 }} />);

		expect(screen.getByText("Last 7 days")).toBeDefined();
	});

	it("does not show 'Last 7 days' when attendanceAlerts is 0", () => {
		render(<SummaryCards data={{ ...defaultData, attendanceAlerts: 0 }} />);

		expect(screen.queryByText("Last 7 days")).toBeNull();
	});

	it("links to /dashboard/messages", () => {
		render(<SummaryCards data={defaultData} />);

		const messagesLink = screen.getByText("Unread Messages").closest("a");
		expect(messagesLink).toBeDefined();
		expect(messagesLink?.getAttribute("href")).toBe("/dashboard/messages");
	});

	it("links to /dashboard/payments", () => {
		render(<SummaryCards data={defaultData} />);

		const paymentsLink = screen.getByText("Outstanding Payments").closest("a");
		expect(paymentsLink).toBeDefined();
		expect(paymentsLink?.getAttribute("href")).toBe("/dashboard/payments");
	});

	it("links to /dashboard/attendance", () => {
		render(<SummaryCards data={defaultData} />);

		const attendanceLink = screen.getByText("Attendance Alerts").closest("a");
		expect(attendanceLink).toBeDefined();
		expect(attendanceLink?.getAttribute("href")).toBe("/dashboard/attendance");
	});
});
