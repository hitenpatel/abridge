import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttendancePage from "../app/dashboard/attendance/page";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		user: {
			listChildren: {
				useQuery: vi.fn(),
			},
		},
	},
}));

describe("AttendancePage", () => {
	const mockListChildren = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.user.listChildren.useQuery as any) = mockListChildren;
	});

	it("shows loading skeleton while data loads", () => {
		mockListChildren.mockReturnValue({ data: undefined, isLoading: true });

		render(<AttendancePage />);

		expect(screen.queryByTestId("attendance-view")).toBeNull();
	});

	it("shows empty state when no children linked", () => {
		mockListChildren.mockReturnValue({ data: [], isLoading: false });

		render(<AttendancePage />);

		expect(screen.getByText("No children found")).toBeDefined();
		expect(
			screen.getByText("You need to have children linked to your account to view attendance."),
		).toBeDefined();
	});

	it("renders attendance hub with child data", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Attendance Hub")).toBeDefined();
		expect(screen.getByText("95% Present")).toBeDefined();
	});

	it("shows child status banner", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Alice is at School")).toBeDefined();
		expect(screen.getByText("Checked in at 8:15 AM • On Time")).toBeDefined();
	});

	it("renders absence report form", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Report Upcoming Absence")).toBeDefined();
		expect(screen.getByText("Submit Absence Report")).toBeDefined();
		expect(screen.getByText("Sick / Ill")).toBeDefined();
		expect(screen.getByText("Appointment")).toBeDefined();
		expect(screen.getByText("Family/Trip")).toBeDefined();
		expect(screen.getByText("Other")).toBeDefined();
	});

	it("renders calendar with day headers", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Sun")).toBeDefined();
		expect(screen.getByText("Mon")).toBeDefined();
		expect(screen.getByText("Tue")).toBeDefined();
		expect(screen.getByText("Wed")).toBeDefined();
		expect(screen.getByText("Thu")).toBeDefined();
		expect(screen.getByText("Fri")).toBeDefined();
		expect(screen.getByText("Sat")).toBeDefined();
	});

	it("renders attendance legend", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Present")).toBeDefined();
		expect(screen.getByText("Late")).toBeDefined();
		expect(screen.getByText("Absent")).toBeDefined();
	});

	it("shows child selector when multiple children exist", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
				{
					childId: "child-2",
					child: { firstName: "Bob", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Alice")).toBeDefined();
		expect(screen.getByText("Bob")).toBeDefined();
	});

	it("switches child on selector click", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
				{
					childId: "child-2",
					child: { firstName: "Bob", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		fireEvent.click(screen.getByText("Bob"));

		expect(screen.getByText("Bob is at School")).toBeDefined();
	});

	it("renders export button", () => {
		mockListChildren.mockReturnValue({
			data: [
				{
					childId: "child-1",
					child: { firstName: "Alice", lastName: "Smith" },
				},
			],
			isLoading: false,
		});

		render(<AttendancePage />);

		expect(screen.getByText("Export Log")).toBeDefined();
	});
});
