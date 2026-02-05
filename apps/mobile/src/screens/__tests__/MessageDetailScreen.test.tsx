import { render, screen } from "@testing-library/react-native";
import { MessageDetailScreen } from "../MessageDetailScreen";

const mockMutate = jest.fn();
jest.mock("../../lib/trpc", () => ({
  trpc: {
    useUtils: jest.fn(() => ({
      messaging: { listReceived: { invalidate: jest.fn() } },
    })),
    messaging: {
      markRead: {
        useMutation: (opts: any) => ({
          mutate: mockMutate,
          isPending: false,
        }),
      },
    },
  },
}));

const baseMessage = {
  id: "msg-1",
  subject: "Important Update",
  body: "This is the full message body with all the details about the school update.",
  category: "URGENT",
  createdAt: new Date("2026-02-01T10:00:00Z"),
  schoolName: "Oakwood Primary",
  schoolLogo: null,
  isRead: false,
  readAt: undefined,
};

const mockRoute = {
  params: { message: baseMessage },
  key: "test-key",
  name: "MessageDetail" as const,
};

describe("MessageDetailScreen", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("renders message subject and body", () => {
    render(<MessageDetailScreen route={mockRoute as any} navigation={{} as any} />);
    expect(screen.getByText("Important Update")).toBeTruthy();
    expect(screen.getByText(/full message body/)).toBeTruthy();
  });

  it("renders school name", () => {
    render(<MessageDetailScreen route={mockRoute as any} navigation={{} as any} />);
    expect(screen.getByText("Oakwood Primary")).toBeTruthy();
  });

  it("renders category badge", () => {
    render(<MessageDetailScreen route={mockRoute as any} navigation={{} as any} />);
    expect(screen.getByText("URGENT")).toBeTruthy();
  });

  it("marks message as read on mount when unread", () => {
    render(<MessageDetailScreen route={mockRoute as any} navigation={{} as any} />);
    expect(mockMutate).toHaveBeenCalledWith({ messageId: "msg-1" });
  });

  it("does NOT mark message as read when already read", () => {
    const readRoute = {
      ...mockRoute,
      params: { message: { ...baseMessage, isRead: true } },
    };
    render(<MessageDetailScreen route={readRoute as any} navigation={{} as any} />);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows read receipt when readAt is present", () => {
    const readRoute = {
      ...mockRoute,
      params: { message: { ...baseMessage, isRead: true, readAt: new Date("2026-02-01T12:00:00Z") } },
    };
    render(<MessageDetailScreen route={readRoute as any} navigation={{} as any} />);
    expect(screen.getByText(/Read on/)).toBeTruthy();
  });
});
