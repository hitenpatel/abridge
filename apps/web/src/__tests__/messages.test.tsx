import * as trpcLib from "@/lib/trpc";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MessagesPage from "../app/dashboard/messages/page";

// Mock feature toggles
vi.mock("@/lib/feature-toggles", () => ({
	useFeatureToggles: () => ({
		messagingEnabled: true,
		paymentsEnabled: true,
		attendanceEnabled: true,
		calendarEnabled: true,
		formsEnabled: true,
		paymentDinnerMoneyEnabled: true,
		paymentTripsEnabled: true,
		paymentClubsEnabled: true,
		paymentUniformEnabled: true,
		paymentOtherEnabled: true,
		translationEnabled: false,
		parentsEveningEnabled: false,
	}),
}));

// Mock translation hook
vi.mock("@/hooks/use-translation", () => ({
	useTranslation: () => ({
		userLang: "en",
		translate: vi.fn().mockResolvedValue([]),
		isTranslating: false,
	}),
}));

// Mock trpc
vi.mock("@/lib/trpc", () => ({
	trpc: {
		useUtils: vi.fn(),
		auth: {
			getSession: {
				useQuery: vi.fn(),
			},
		},
		messaging: {
			listReceived: {
				useQuery: vi.fn(),
			},
			listSent: {
				useQuery: vi.fn(),
			},
			listConversations: {
				useQuery: vi.fn(),
			},
			listReplies: {
				useQuery: vi.fn(),
			},
			getConversation: {
				useQuery: vi.fn(),
			},
			listSchoolStaff: {
				useQuery: vi.fn(),
			},
			reply: {
				useMutation: vi.fn(),
			},
			sendDirect: {
				useMutation: vi.fn(),
			},
			createConversation: {
				useMutation: vi.fn(),
			},
			closeConversation: {
				useMutation: vi.fn(),
			},
		},
	},
}));

describe("MessagesPage", () => {
	const mockSessionQuery = vi.fn();
	const mockMessagesQuery = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(trpcLib.trpc.auth.getSession.useQuery as any) = mockSessionQuery;
		(trpcLib.trpc.messaging.listReceived.useQuery as any) = mockMessagesQuery;
		(trpcLib.trpc.messaging.listSent.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.messaging.listConversations.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.messaging.listReplies.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.messaging.getConversation.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.messaging.listSchoolStaff.useQuery as any) = () => ({
			data: undefined,
			isLoading: false,
		});
		(trpcLib.trpc.useUtils as any) = () => ({
			messaging: {
				listReplies: { invalidate: vi.fn() },
				getConversation: { invalidate: vi.fn() },
				listConversations: { invalidate: vi.fn() },
			},
		});
		(trpcLib.trpc.messaging.reply.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
		(trpcLib.trpc.messaging.sendDirect.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
		(trpcLib.trpc.messaging.createConversation.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
		(trpcLib.trpc.messaging.closeConversation.useMutation as any) = () => ({
			mutate: vi.fn(),
			isPending: false,
		});
	});

	it("shows loading skeleton while session is loading", () => {
		mockSessionQuery.mockReturnValue({ data: null, isLoading: true });
		mockMessagesQuery.mockReturnValue({ data: undefined, isLoading: true });

		render(<MessagesPage />);

		expect(screen.queryByTestId("messages-list")).toBeNull();
	});

	it("shows loading skeleton while messages are loading", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({ data: undefined, isLoading: true });

		render(<MessagesPage />);

		expect(screen.queryByTestId("messages-list")).toBeNull();
	});

	it("shows empty state when no messages", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<MessagesPage />);

		expect(screen.getByText("No messages yet")).toBeDefined();
	});

	it("renders message list with subjects and school names", () => {
		const mockMessages = [
			{
				id: "msg-1",
				subject: "School Trip Update",
				body: "The trip has been rescheduled",
				category: "ANNOUNCEMENT",
				createdAt: new Date("2025-03-15"),
				schoolName: "Oak Primary",
				isRead: false,
			},
			{
				id: "msg-2",
				subject: "Lunch Menu Change",
				body: "New options available",
				category: "REMINDER",
				createdAt: new Date("2025-03-14"),
				schoolName: "Oak Primary",
				isRead: true,
			},
		];

		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: mockMessages },
			isLoading: false,
		});

		render(<MessagesPage />);

		// Subject appears in sidebar; first message auto-selected so its subject also appears in detail
		expect(screen.getAllByText("School Trip Update").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText("Lunch Menu Change").length).toBeGreaterThanOrEqual(1);
	});

	it("shows unread indicator for unread messages", () => {
		const mockMessages = [
			{
				id: "msg-1",
				subject: "Unread Message",
				body: "Content",
				category: "ANNOUNCEMENT",
				createdAt: new Date(),
				schoolName: "Oak Primary",
				isRead: false,
			},
		];

		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: mockMessages },
			isLoading: false,
		});

		render(<MessagesPage />);

		// Unread messages show a "!" badge
		expect(screen.getByText("!")).toBeDefined();
	});

	it("displays selected message content", () => {
		const mockMessages = [
			{
				id: "msg-1",
				subject: "Important Notice",
				body: "Please read this carefully",
				category: "URGENT",
				createdAt: new Date("2025-03-15"),
				schoolName: "Oak Primary",
				isRead: true,
			},
		];

		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: mockMessages },
			isLoading: false,
		});

		render(<MessagesPage />);

		// First message is auto-selected, subject appears in sidebar + detail
		const subjects = screen.getAllByText("Important Notice");
		expect(subjects.length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Please read this carefully")).toBeDefined();
		// Category badge appears in detail panel
		const categories = screen.getAllByText("URGENT");
		expect(categories.length).toBeGreaterThanOrEqual(1);
	});

	it("shows placeholder when no message is selected and list is empty", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<MessagesPage />);

		expect(screen.getByText("No messages yet")).toBeDefined();
	});

	it("renders search input", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<MessagesPage />);

		expect(screen.getByTestId("search-input")).toBeDefined();
	});

	it("renders filter tabs", () => {
		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<MessagesPage />);

		expect(screen.getByText("Messages")).toBeDefined();
		expect(screen.getByText("Direct")).toBeDefined();
	});

	it("selects a different message on click", () => {
		const mockMessages = [
			{
				id: "msg-1",
				subject: "First Message",
				body: "First body",
				category: "ANNOUNCEMENT",
				createdAt: new Date("2025-03-15"),
				schoolName: "Oak Primary",
				isRead: true,
			},
			{
				id: "msg-2",
				subject: "Second Message",
				body: "Second body",
				category: "REMINDER",
				createdAt: new Date("2025-03-14"),
				schoolName: "Oak Primary",
				isRead: true,
			},
		];

		mockSessionQuery.mockReturnValue({
			data: { name: "Parent", staffRole: null, schoolId: null },
			isLoading: false,
		});
		mockMessagesQuery.mockReturnValue({
			data: { items: mockMessages },
			isLoading: false,
		});

		render(<MessagesPage />);

		// Click on the second message in the sidebar
		const secondSubject = screen.getAllByText("Second Message");
		fireEvent.click(secondSubject[0]!.closest("[class*=cursor-pointer]")!);

		// The message detail should show the second message's body
		expect(screen.getByText("Second body")).toBeDefined();
	});
});
