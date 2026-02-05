import { render, screen, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
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

jest.mock("lucide-react-native", () => ({
  X: () => "X",
}));

jest.spyOn(Alert, "alert");

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
    mockGetAttendance.mockReturnValue({ data: attendanceData, isLoading: false, refetch: jest.fn() });
  });

  it("shows loading when children are loading", () => {
    mockListChildren.mockReturnValue({ data: null, isLoading: true });
    render(<AttendanceScreen />);
    expect(screen.queryByText("Emma")).toBeNull();
  });

  it("renders child selector chips", () => {
    render(<AttendanceScreen />);
    expect(screen.getByText("Emma")).toBeTruthy();
    expect(screen.getByText("Jack")).toBeTruthy();
  });

  it("shows Report Absence button", () => {
    render(<AttendanceScreen />);
    expect(screen.getByText("Report Absence")).toBeTruthy();
  });

  it("renders attendance records with marks", () => {
    render(<AttendanceScreen />);
    expect(screen.getByText("AM Session")).toBeTruthy();
    expect(screen.getByText("PRESENT")).toBeTruthy();
    expect(screen.getByText("PM Session")).toBeTruthy();
    expect(screen.getByText("LATE")).toBeTruthy();
  });

  it("shows empty state when no attendance records", () => {
    mockGetAttendance.mockReturnValue({ data: [], isLoading: false, refetch: jest.fn() });
    render(<AttendanceScreen />);
    expect(screen.getByText("No attendance records found.")).toBeTruthy();
  });

  it("opens Report Absence modal when button pressed", () => {
    render(<AttendanceScreen />);
    fireEvent.press(screen.getByText("Report Absence"));
    expect(screen.getByText("Start Date (YYYY-MM-DD)")).toBeTruthy();
    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.getByText("Submit Report")).toBeTruthy();
  });
});
