import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffManagementPage from "../app/dashboard/staff/page";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

// Mock sonner
vi.mock("sonner", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock lucide-react icons used by staff page and UI components
vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<Record<string, any>>();
	return {
		...actual,
		User: ({ className }: any) => <span data-testid="icon-user" className={className} />,
		Users: ({ className }: any) => <span data-testid="icon-users" className={className} />,
		Plus: ({ className }: any) => <span data-testid="icon-plus" className={className} />,
		Trash2: ({ className }: any) => <span data-testid="icon-trash" className={className} />,
		ShieldCheck: ({ className }: any) => (
			<span data-testid="icon-shield" className={className} />
		),
	};
});

// Mock trpc
const mockMutate = vi.fn();
vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: () => ({
			invitation: { list: { invalidate: vi.fn() } },
			staff: { list: { invalidate: vi.fn() } },
		}),
		auth: {
			getSession: {
				useQuery: vi.fn(),
			},
		},
		invitation: {
			list: {
				useQuery: vi.fn(),
			},
			send: {
				useMutation: vi.fn(),
			},
		},
		staff: {
			list: {
				useQuery: vi.fn(),
			},
			remove: {
				useMutation: vi.fn(),
			},
		},
	},
}));

describe("StaffManagementPage", () => {
	const mockSessionQuery = vi.fn();
	const mockInvitationList = vi.fn();
	const mockStaffList = vi.fn();
	const mockSendMutation = vi.fn();
	const mockRemoveMutation = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.auth.getSession.useQuery as any) = mockSessionQuery;
		(trpcLib.trpc.invitation.list.useQuery as any) = mockInvitationList;
		(trpcLib.trpc.staff.list.useQuery as any) = mockStaffList;
		(trpcLib.trpc.invitation.send.useMutation as any) = mockSendMutation;
		(trpcLib.trpc.staff.remove.useMutation as any) = mockRemoveMutation;

		mockSendMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
		mockRemoveMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
	});

	it("shows loading state while session loads", () => {
		mockSessionQuery.mockReturnValue({ data: null, isLoading: true });
		mockInvitationList.mockReturnValue({ data: undefined, isLoading: false });
		mockStaffList.mockReturnValue({ data: undefined, isLoading: false });

		render(<StaffManagementPage />);

		expect(screen.getByText("Loading...")).toBeDefined();
	});

	it("shows not authenticated when no session", () => {
		mockSessionQuery.mockReturnValue({ data: null, isLoading: false });
		mockInvitationList.mockReturnValue({ data: undefined, isLoading: false });
		mockStaffList.mockReturnValue({ data: undefined, isLoading: false });

		render(<StaffManagementPage />);

		expect(screen.getByText("Not Authenticated")).toBeDefined();
		expect(screen.getByText("Go to Login")).toBeDefined();
	});

	it("shows access denied for non-admin staff", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "TEACHER", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({ data: undefined, isLoading: false });
		mockStaffList.mockReturnValue({ data: undefined, isLoading: false });

		render(<StaffManagementPage />);

		expect(screen.getByText("Access Denied")).toBeDefined();
		expect(screen.getByText("You need admin access to view this page.")).toBeDefined();
	});

	it("renders staff management page for admin", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({ data: [], isLoading: false });
		mockStaffList.mockReturnValue({ data: [], isLoading: false });

		render(<StaffManagementPage />);

		expect(screen.getByText("Staff Management")).toBeDefined();
		expect(screen.getByText("Manage teachers and staff for your school")).toBeDefined();
	});

	it("shows empty state when no staff members", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({ data: [], isLoading: false });
		mockStaffList.mockReturnValue({ data: [], isLoading: false });

		render(<StaffManagementPage />);

		expect(screen.getByText("No staff members found.")).toBeDefined();
	});

	it("renders staff list with names and roles", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({ data: [], isLoading: false });
		mockStaffList.mockReturnValue({
			data: [
				{
					id: "staff-1",
					userId: "user-2",
					role: "TEACHER",
					user: { name: "Jane Teacher", email: "jane@school.com" },
				},
				{
					id: "staff-2",
					userId: "user-3",
					role: "OFFICE",
					user: { name: "Bob Office", email: "bob@school.com" },
				},
			],
			isLoading: false,
		});

		render(<StaffManagementPage />);

		expect(screen.getByText("Jane Teacher")).toBeDefined();
		expect(screen.getByText("jane@school.com")).toBeDefined();
		expect(screen.getByText("TEACHER")).toBeDefined();
		expect(screen.getByText("Bob Office")).toBeDefined();
		expect(screen.getByText("OFFICE")).toBeDefined();
	});

	it("shows loading skeleton for staff list", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({ data: [], isLoading: false });
		mockStaffList.mockReturnValue({ data: undefined, isLoading: true });

		render(<StaffManagementPage />);

		// Staff list shows skeletons
		expect(screen.queryByText("No staff members found.")).toBeNull();
	});

	it("toggles invite form on button click", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({ data: [], isLoading: false });
		mockStaffList.mockReturnValue({ data: [], isLoading: false });

		render(<StaffManagementPage />);

		// Click Invite button to show form
		fireEvent.click(screen.getByText("Invite"));

		expect(screen.getByText("Send Invitation")).toBeDefined();
		expect(screen.getByLabelText("Email Address")).toBeDefined();

		// Click Cancel to hide form
		fireEvent.click(screen.getByText("Cancel"));

		expect(screen.queryByText("Send Invitation")).toBeNull();
	});

	it("renders pending invitations when they exist", () => {
		mockSessionQuery.mockReturnValue({
			data: { staffRole: "ADMIN", schoolId: "school-1", id: "user-1" },
			isLoading: false,
		});
		mockInvitationList.mockReturnValue({
			data: [
				{
					id: "inv-1",
					email: "new-teacher@school.com",
					role: "TEACHER",
					token: "abc123",
					expiresAt: new Date("2025-04-01"),
				},
			],
			isLoading: false,
		});
		mockStaffList.mockReturnValue({ data: [], isLoading: false });

		render(<StaffManagementPage />);

		expect(screen.getByText("Pending Invitations")).toBeDefined();
		expect(screen.getByText("new-teacher@school.com")).toBeDefined();
		expect(screen.getByText("Copy Link")).toBeDefined();
	});
});
