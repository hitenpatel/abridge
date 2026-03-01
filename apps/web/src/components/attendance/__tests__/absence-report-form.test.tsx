import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AbsenceReportForm } from "../absence-report-form";

vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: vi.fn(),
		attendance: {
			reportAbsence: {
				useMutation: vi.fn(),
			},
		},
	},
}));

const mockChildren = [
	{ childId: "child-1", child: { firstName: "Alice", lastName: "Smith" } },
	{ childId: "child-2", child: { firstName: "Bob", lastName: "Jones" } },
];

describe("AbsenceReportForm", () => {
	const mockOnSuccess = vi.fn();
	const mockOnCancel = vi.fn();
	const mockMutate = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.useUtils as any) = () => ({
			attendance: { getAttendanceForChild: { invalidate: vi.fn() } },
		});
		(trpcLib.trpc.attendance.reportAbsence.useMutation as any) = () => ({
			mutate: mockMutate,
			isPending: false,
			error: null,
		});
	});

	it("renders the form with title and description", () => {
		render(<AbsenceReportForm childrenLinks={mockChildren} onSuccess={mockOnSuccess} />);

		expect(screen.getByText("Report Future Absence")).toBeDefined();
		expect(screen.getByText("Authorised absences will be marked in the records")).toBeDefined();
	});

	it("renders date inputs and reason textarea", () => {
		render(<AbsenceReportForm childrenLinks={mockChildren} onSuccess={mockOnSuccess} />);

		expect(screen.getByLabelText("Start Date")).toBeDefined();
		expect(screen.getByLabelText("End Date")).toBeDefined();
		expect(screen.getByLabelText("Reason for Absence")).toBeDefined();
	});

	it("renders the submit button", () => {
		render(<AbsenceReportForm childrenLinks={mockChildren} onSuccess={mockOnSuccess} />);

		expect(screen.getByText("Submit Absence Report")).toBeDefined();
	});

	it("renders cancel button when onCancel is provided", () => {
		render(
			<AbsenceReportForm
				childrenLinks={mockChildren}
				onSuccess={mockOnSuccess}
				onCancel={mockOnCancel}
			/>,
		);

		expect(screen.getByText("Cancel")).toBeDefined();
	});

	it("does not render cancel button when onCancel is not provided", () => {
		render(<AbsenceReportForm childrenLinks={mockChildren} onSuccess={mockOnSuccess} />);

		expect(screen.queryByText("Cancel")).toBeNull();
	});

	it("calls onCancel when cancel button is clicked", () => {
		render(
			<AbsenceReportForm
				childrenLinks={mockChildren}
				onSuccess={mockOnSuccess}
				onCancel={mockOnCancel}
			/>,
		);

		fireEvent.click(screen.getByText("Cancel"));
		expect(mockOnCancel).toHaveBeenCalledOnce();
	});

	it("shows submitting state when mutation is pending", () => {
		(trpcLib.trpc.attendance.reportAbsence.useMutation as any) = () => ({
			mutate: mockMutate,
			isPending: true,
			error: null,
		});

		render(<AbsenceReportForm childrenLinks={mockChildren} onSuccess={mockOnSuccess} />);

		expect(screen.getByText("Submitting...")).toBeDefined();
	});

	it("shows error alert when mutation fails", () => {
		(trpcLib.trpc.attendance.reportAbsence.useMutation as any) = () => ({
			mutate: mockMutate,
			isPending: false,
			error: { message: "Network error" },
		});

		render(<AbsenceReportForm childrenLinks={mockChildren} onSuccess={mockOnSuccess} />);

		expect(screen.getByText("Error")).toBeDefined();
		expect(screen.getByText("Network error")).toBeDefined();
	});
});
