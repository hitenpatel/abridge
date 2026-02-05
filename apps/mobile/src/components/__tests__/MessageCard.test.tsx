import { render, screen, fireEvent } from "@testing-library/react-native";
import { MessageCard, type MessageItem } from "../MessageCard";

const baseMessage: MessageItem = {
  id: "msg-1",
  subject: "School Trip Permission",
  body: "Please sign the permission slip for the upcoming school trip to the science museum on Friday.",
  category: "announcement",
  createdAt: new Date("2026-01-15T10:00:00Z"),
  schoolName: "Oakwood Primary",
  isRead: false,
};

describe("MessageCard", () => {
  it("renders subject, school name, and category", () => {
    render(<MessageCard message={baseMessage} onPress={jest.fn()} />);
    expect(screen.getByText("School Trip Permission")).toBeTruthy();
    expect(screen.getByText("Oakwood Primary")).toBeTruthy();
    expect(screen.getByText("announcement")).toBeTruthy();
  });

  it("truncates body to 80 characters with ellipsis", () => {
    render(<MessageCard message={baseMessage} onPress={jest.fn()} />);
    const bodyText = screen.getByText(/Please sign the permission slip/);
    expect(bodyText.props.children.length).toBeLessThanOrEqual(83);
  });

  it("shows unread badge when message is not read", () => {
    const { toJSON } = render(<MessageCard message={baseMessage} onPress={jest.fn()} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"backgroundColor":"#ef4444"');
  });

  it("does not show unread badge when message is read", () => {
    const readMessage = { ...baseMessage, isRead: true };
    const { toJSON } = render(<MessageCard message={readMessage} onPress={jest.fn()} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('"backgroundColor":"#ef4444"');
  });

  it("calls onPress when card is tapped", () => {
    const onPress = jest.fn();
    render(<MessageCard message={baseMessage} onPress={onPress} />);
    fireEvent.press(screen.getByText("School Trip Permission"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("formats today's date as 'Today'", () => {
    const todayMessage = { ...baseMessage, createdAt: new Date() };
    render(<MessageCard message={todayMessage} onPress={jest.fn()} />);
    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("formats yesterday's date as 'Yesterday'", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayMessage = { ...baseMessage, createdAt: yesterday };
    render(<MessageCard message={yesterdayMessage} onPress={jest.fn()} />);
    expect(screen.getByText("Yesterday")).toBeTruthy();
  });

  it("shows short body without truncation when under 80 chars", () => {
    const shortMessage = { ...baseMessage, body: "Short message" };
    render(<MessageCard message={shortMessage} onPress={jest.fn()} />);
    expect(screen.getByText("Short message")).toBeTruthy();
  });

  it("applies correct category styles for urgent", () => {
    const urgentMessage = { ...baseMessage, category: "urgent" };
    const { toJSON } = render(<MessageCard message={urgentMessage} onPress={jest.fn()} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"backgroundColor":"#fee2e2"');
  });
});
