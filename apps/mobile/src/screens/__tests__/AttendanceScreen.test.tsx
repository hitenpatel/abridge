import { render, screen } from "@testing-library/react-native";
import { AttendanceScreen } from "../AttendanceScreen";

const mockListChildren = jest.fn();
const mockGetAttendance = jest.fn();
const mockReportMutate = jest.fn();

jest.mock("../../lib/trpc", () => ({
	trpc: {
		user: {
			listChildren: { useQuery: (...args: any[]) => mockListChildren(...args) },
		},
		attendance: {
			getAttendanceForChild: { useQuery: (...args: any[]) => mockGetAttendance(...args) },
			reportAbsence: {
				useMutation: (opts: any) => ({
					mutate: mockReportMutate,
					isPending: false,
				}),
			},
		},
	},
}));

const childrenData = [
	{ child: { id: "child-1", firstName: "Emma", lastName: "Smith" } },
	{ child: { id: "child-2", firstName: "Jack", lastName: "Smith" } },
];

const attendanceData = [
	{ date: new Date("2026-02-03"), session: "AM", mark: "PRESENT", note: null },
	{ date: new Date("2026-02-03"), session: "PM", mark: "LATE", note: null },
];

describe("AttendanceScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockListChildren.mockReturnValue({ data: childrenData, isLoading: false });
		mockGetAttendance.mockReturnValue({
			data: attendanceData,
			isLoading: false,
			refetch: jest.fn(),
		});
	});

	it("shows loading when children are loading", () => {
		mockListChildren.mockReturnValue({ data: null, isLoading: true });
		render(<AttendanceScreen />);
		expect(screen.toJSON()).toBeTruthy();
	});

	it("renders attendance hub title", () => {
		render(<AttendanceScreen />);
		expect(screen.getByText("Attendance Hub")).toBeTruthy();
	});

	it("renders attendance records with mark labels", () => {
		render(<AttendanceScreen />);
		expect(screen.getByText("Present")).toBeTruthy();
		expect(screen.getByText("Late")).toBeTruthy();
	});

	it("renders report absence section", () => {
		render(<AttendanceScreen />);
		expect(screen.getAllByText("Report Absence").length).toBeGreaterThan(0);
	});
});
