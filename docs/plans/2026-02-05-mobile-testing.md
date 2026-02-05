# Mobile App Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive component tests (Jest + React Native Testing Library) and E2E smoke tests (Maestro) to the SchoolConnect mobile app.

**Architecture:** Component tests mock tRPC hooks and auth client to test each screen in isolation. Maestro flows run against a live Expo Go app for real device E2E coverage. Test files live alongside source under `__tests__/` directories.

**Tech Stack:** jest-expo, @testing-library/react-native, Jest, Maestro CLI, YAML flows

---

### Task 1: Install and Configure Jest + React Native Testing Library

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install testing dependencies**

Run:
```bash
cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && npx expo install jest-expo jest @types/jest -- --dev && pnpm add -D @testing-library/react-native @testing-library/jest-native
```

**Step 2: Add jest config and test script to package.json**

Add to `apps/mobile/package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watchAll"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|superjson|better-auth|@tanstack|@trpc))"
    ],
    "setupFilesAfterSetup": ["@testing-library/react-native/extend-expect"],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    }
  }
}
```

**Step 3: Run tests to verify empty suite passes**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --passWithNoTests`
Expected: PASS (no test suites found, exits 0)

**Step 4: Commit**
```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore(mobile): add Jest + React Native Testing Library"
```

---

### Task 2: Create Test Utilities and Mocks

**Files:**
- Create: `apps/mobile/src/__tests__/test-utils.tsx`
- Create: `apps/mobile/src/__tests__/__mocks__/trpc.ts`
- Create: `apps/mobile/src/__tests__/__mocks__/auth-client.ts`
- Create: `apps/mobile/src/__tests__/__mocks__/expo-modules.ts`

**Step 1: Create tRPC mock utility**

Create `apps/mobile/src/__tests__/__mocks__/trpc.ts`:
```typescript
// Mock tRPC hooks that return configurable data
// Usage: mockQuery(trpc.dashboard.getSummary, { data: {...}, isLoading: false })
export function createMockTRPC() {
  return {
    dashboard: {
      getSummary: { useQuery: jest.fn() },
    },
    messaging: {
      listReceived: { useInfiniteQuery: jest.fn() },
      markRead: { useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })) },
    },
    calendar: {
      listEvents: { useQuery: jest.fn() },
    },
    attendance: {
      getAttendanceForChild: { useQuery: jest.fn() },
      reportAbsence: { useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })) },
    },
    payments: {
      listOutstandingPayments: { useQuery: jest.fn() },
      createCheckoutSession: { useMutation: jest.fn(() => ({ mutate: jest.fn(), isPending: false })) },
    },
    search: {
      query: { useQuery: jest.fn() },
    },
    user: {
      listChildren: { useQuery: jest.fn() },
      updatePushToken: { useMutation: jest.fn(() => ({ mutateAsync: jest.fn() })) },
    },
    useUtils: jest.fn(() => ({
      messaging: { listReceived: { invalidate: jest.fn() } },
    })),
  };
}
```

**Step 2: Create auth client mock**

Create `apps/mobile/src/__tests__/__mocks__/auth-client.ts`:
```typescript
export const mockAuthClient = {
  useSession: jest.fn(() => ({ data: null, isPending: false })),
  signIn: { email: jest.fn() },
  signOut: jest.fn(),
};
```

**Step 3: Create Expo module mocks**

Create `apps/mobile/src/__tests__/__mocks__/expo-modules.ts`:
```typescript
// Mocks for expo-secure-store, expo-notifications, expo-constants
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "test-token" })),
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { apiUrl: "http://localhost:4000" } },
}));
```

**Step 4: Create test render wrapper**

Create `apps/mobile/src/__tests__/test-utils.tsx`:
```tsx
import React from "react";
import { render, type RenderOptions } from "@testing-library/react-native";

// Minimal wrapper - screens are tested without providers since we mock tRPC
export function renderScreen(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { ...options });
}

// Helper to create a mock navigation prop
export function createMockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    dispatch: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    getParent: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
  } as any;
}
```

**Step 5: Verify mocks compile**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && npx tsc --noEmit --skipLibCheck`
Expected: No errors (or only pre-existing ones)

**Step 6: Commit**
```bash
git add apps/mobile/src/__tests__/
git commit -m "chore(mobile): add test utilities and mocks"
```

---

### Task 3: Test MessageCard Component

**Files:**
- Create: `apps/mobile/src/components/__tests__/MessageCard.test.tsx`

**Step 1: Write the tests**

Create `apps/mobile/src/components/__tests__/MessageCard.test.tsx`:
```tsx
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

    // The body is 89 chars, should be truncated to 80 + "..."
    const bodyText = screen.getByText(/Please sign the permission slip/);
    expect(bodyText.props.children.length).toBeLessThanOrEqual(83); // 80 + "..."
  });

  it("shows unread badge when message is not read", () => {
    const { toJSON } = render(<MessageCard message={baseMessage} onPress={jest.fn()} />);
    // Unread badge is a View with specific style (width: 8, height: 8, red bg)
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

  it("applies correct category styles", () => {
    const urgentMessage = { ...baseMessage, category: "urgent" };
    const { toJSON } = render(<MessageCard message={urgentMessage} onPress={jest.fn()} />);
    const tree = JSON.stringify(toJSON());
    // Urgent should have red background
    expect(tree).toContain('"backgroundColor":"#fee2e2"');
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --testPathPattern=MessageCard`
Expected: All tests PASS

**Step 3: Commit**
```bash
git add apps/mobile/src/components/__tests__/
git commit -m "test(mobile): add MessageCard component tests"
```

---

### Task 4: Test LoginScreen

**Files:**
- Create: `apps/mobile/src/screens/__tests__/LoginScreen.test.tsx`

**Step 1: Write the tests**

Create `apps/mobile/src/screens/__tests__/LoginScreen.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { LoginScreen } from "../LoginScreen";

// Mock auth client
const mockSignIn = jest.fn();
jest.mock("../../lib/auth-client", () => ({
  authClient: {
    signIn: { email: mockSignIn },
  },
}));

jest.spyOn(Alert, "alert");

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title, email input, password input, and login button", () => {
    render(<LoginScreen />);

    expect(screen.getByText("SchoolConnect")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
    expect(screen.getByPlaceholderText("Password")).toBeTruthy();
    expect(screen.getByText("Login")).toBeTruthy();
  });

  it("shows error alert when fields are empty", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Login"));

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Please fill in all fields");
  });

  it("shows error alert when only email is provided", () => {
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "test@example.com");
    fireEvent.press(screen.getByText("Login"));

    expect(Alert.alert).toHaveBeenCalledWith("Error", "Please fill in all fields");
  });

  it("calls signIn with email and password on submit", async () => {
    mockSignIn.mockResolvedValue({ data: { user: {} }, error: null });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "parent@school.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByText("Login"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "parent@school.com",
        password: "password123",
      });
    });
  });

  it("shows success alert on successful login", async () => {
    mockSignIn.mockResolvedValue({ data: { user: {} }, error: null });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "parent@school.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByText("Login"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Success", "Logged in successfully");
    });
  });

  it("shows error alert on failed login", async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: "Invalid credentials" } });

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "wrong@email.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "bad");
    fireEvent.press(screen.getByText("Login"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Login Failed", "Invalid credentials");
    });
  });

  it("shows error alert on unexpected exception", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "test@test.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "pass");
    fireEvent.press(screen.getByText("Login"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "An unexpected error occurred");
    });
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --testPathPattern=LoginScreen`
Expected: All tests PASS

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/__tests__/
git commit -m "test(mobile): add LoginScreen tests"
```

---

### Task 5: Test DashboardScreen

**Files:**
- Create: `apps/mobile/src/screens/__tests__/DashboardScreen.test.tsx`

**Step 1: Write the tests**

Create `apps/mobile/src/screens/__tests__/DashboardScreen.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react-native";
import { DashboardScreen } from "../DashboardScreen";

// Mock tRPC
const mockUseQuery = jest.fn();
jest.mock("../../lib/trpc", () => ({
  trpc: {
    dashboard: {
      getSummary: { useQuery: (...args: any[]) => mockUseQuery(...args) },
    },
  },
}));

// Mock lucide icons
jest.mock("lucide-react-native", () => ({
  AlertCircle: () => "AlertCircle",
  Calendar: () => "Calendar",
  Clock: () => "Clock",
  CreditCard: () => "CreditCard",
  Mail: () => "Mail",
  TrendingUp: () => "TrendingUp",
}));

const mockNavigation = {
  navigate: jest.fn(),
} as any;

const dashboardData = {
  children: [
    { id: "child-1", firstName: "Emma", lastName: "Smith" },
  ],
  metrics: { unreadMessages: 3, paymentsTotal: 2500 },
  todayAttendance: [
    { childId: "child-1", session: "AM", mark: "PRESENT" },
    { childId: "child-1", session: "PM", mark: "LATE" },
  ],
  upcomingEvents: [
    { id: "evt-1", title: "Sports Day", startDate: new Date("2026-02-10T09:00:00Z"), category: "EVENT" },
  ],
  attendancePercentage: [{ childId: "child-1", percentage: 95 }],
};

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner when data is loading", () => {
    mockUseQuery.mockReturnValue({ isLoading: true, data: null, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    // ActivityIndicator should be rendered (no text content, just the spinner)
    expect(screen.queryByText("Overview")).toBeNull();
  });

  it("shows error state with retry button", () => {
    const mockRefetch = jest.fn();
    mockUseQuery.mockReturnValue({ isLoading: false, data: null, isError: true, refetch: mockRefetch, isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    expect(screen.getByText("Failed to load dashboard")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders overview stats with correct data", () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: dashboardData, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy(); // unread messages
    expect(screen.getByText("Unread Messages")).toBeTruthy();
    expect(screen.getByText("Outstanding")).toBeTruthy();
  });

  it("renders children with attendance data", () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: dashboardData, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    expect(screen.getByText("Emma Smith")).toBeTruthy();
    expect(screen.getByText("95% Attendance")).toBeTruthy();
    expect(screen.getByText("PRESENT")).toBeTruthy();
    expect(screen.getByText("LATE")).toBeTruthy();
  });

  it("shows empty text when no children linked", () => {
    const emptyData = { ...dashboardData, children: [] };
    mockUseQuery.mockReturnValue({ isLoading: false, data: emptyData, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    expect(screen.getByText("No children linked.")).toBeTruthy();
  });

  it("renders upcoming events", () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: dashboardData, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    expect(screen.getByText("Upcoming Events")).toBeTruthy();
    expect(screen.getByText("Sports Day")).toBeTruthy();
    expect(screen.getByText("EVENT")).toBeTruthy();
  });

  it("navigates to Messages when unread messages card tapped", () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: dashboardData, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    fireEvent.press(screen.getByText("Unread Messages"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Messages");
  });

  it("navigates to Payments when outstanding card tapped", () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: dashboardData, isError: false, refetch: jest.fn(), isRefetching: false });

    render(<DashboardScreen navigation={mockNavigation} />);

    fireEvent.press(screen.getByText("Outstanding"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Payments");
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --testPathPattern=DashboardScreen`
Expected: All tests PASS

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/__tests__/DashboardScreen.test.tsx
git commit -m "test(mobile): add DashboardScreen tests"
```

---

### Task 6: Test PaymentsScreen

**Files:**
- Create: `apps/mobile/src/screens/__tests__/PaymentsScreen.test.tsx`

**Step 1: Write the tests**

Create `apps/mobile/src/screens/__tests__/PaymentsScreen.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PaymentsScreen } from "../PaymentsScreen";

const mockUseQuery = jest.fn();
const mockMutate = jest.fn();
jest.mock("../../lib/trpc", () => ({
  trpc: {
    payments: {
      listOutstandingPayments: { useQuery: (...args: any[]) => mockUseQuery(...args) },
      createCheckoutSession: {
        useMutation: (opts: any) => ({
          mutate: (...args: any[]) => {
            mockMutate(...args);
            if (opts?.onSuccess) opts.onSuccess({ url: "https://checkout.stripe.com/test" });
          },
          isPending: false,
        }),
      },
    },
  },
}));

jest.mock("lucide-react-native", () => ({
  Calendar: () => "Calendar",
  ChevronRight: () => "ChevronRight",
  CreditCard: () => "CreditCard",
  User: () => "User",
}));

const mockPayments = [
  {
    id: "pay-1",
    title: "School Trip Fee",
    amount: 1500,
    category: "TRIP",
    dueDate: new Date("2026-03-01"),
    childId: "child-1",
    childName: "Emma Smith",
  },
];

describe("PaymentsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: true, isError: false, refetch: jest.fn() });

    render(<PaymentsScreen />);

    expect(screen.queryByText("School Trip Fee")).toBeNull();
  });

  it("shows error state", () => {
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, isError: true, refetch: jest.fn() });

    render(<PaymentsScreen />);

    expect(screen.getByText("Error loading payments.")).toBeTruthy();
  });

  it("renders payment items with amount and child name", () => {
    mockUseQuery.mockReturnValue({ data: mockPayments, isLoading: false, isError: false, refetch: jest.fn() });

    render(<PaymentsScreen />);

    expect(screen.getByText("School Trip Fee")).toBeTruthy();
    expect(screen.getByText("Emma Smith")).toBeTruthy();
    expect(screen.getByText("TRIP")).toBeTruthy();
  });

  it("shows empty state when no payments", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: jest.fn() });

    render(<PaymentsScreen />);

    expect(screen.getByText("No outstanding payments")).toBeTruthy();
    expect(screen.getByText("You're all caught up!")).toBeTruthy();
  });

  it("calls createCheckoutSession when Pay Now is pressed", () => {
    mockUseQuery.mockReturnValue({ data: mockPayments, isLoading: false, isError: false, refetch: jest.fn() });

    render(<PaymentsScreen />);

    fireEvent.press(screen.getByText("Pay Now"));
    expect(mockMutate).toHaveBeenCalledWith({ paymentItemId: "pay-1", childId: "child-1" });
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --testPathPattern=PaymentsScreen`
Expected: All tests PASS

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/__tests__/PaymentsScreen.test.tsx
git commit -m "test(mobile): add PaymentsScreen tests"
```

---

### Task 7: Test AttendanceScreen

**Files:**
- Create: `apps/mobile/src/screens/__tests__/AttendanceScreen.test.tsx`

**Step 1: Write the tests**

Create `apps/mobile/src/screens/__tests__/AttendanceScreen.test.tsx`:
```tsx
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

    // Modal should show form fields
    expect(screen.getByText("Start Date (YYYY-MM-DD)")).toBeTruthy();
    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.getByText("Submit Report")).toBeTruthy();
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --testPathPattern=AttendanceScreen`
Expected: All tests PASS

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/__tests__/AttendanceScreen.test.tsx
git commit -m "test(mobile): add AttendanceScreen tests"
```

---

### Task 8: Test MessageDetailScreen

**Files:**
- Create: `apps/mobile/src/screens/__tests__/MessageDetailScreen.test.tsx`

**Step 1: Write the tests**

Create `apps/mobile/src/screens/__tests__/MessageDetailScreen.test.tsx`:
```tsx
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
```

**Step 2: Run tests**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --testPathPattern=MessageDetailScreen`
Expected: All tests PASS

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/__tests__/MessageDetailScreen.test.tsx
git commit -m "test(mobile): add MessageDetailScreen tests"
```

---

### Task 9: Install Maestro and Create E2E Flows

Maestro is installed system-wide via the CLI. Flows live in `apps/mobile/.maestro/`.

**Files:**
- Create: `apps/mobile/.maestro/login.yaml`
- Create: `apps/mobile/.maestro/dashboard.yaml`
- Create: `apps/mobile/.maestro/messages.yaml`
- Create: `apps/mobile/.maestro/navigation.yaml`

**Step 1: Install Maestro CLI (if not already installed)**

Run:
```bash
which maestro || curl -Ls "https://get.maestro.mobile.dev" | bash
```

**Step 2: Create login flow**

Create `apps/mobile/.maestro/login.yaml`:
```yaml
appId: host.exp.Exponent
name: Login Flow
tags:
  - smoke
  - auth
---
- launchApp:
    clearState: true

- assertVisible: "SchoolConnect"

# Enter credentials
- tapOn: "Email"
- inputText: "parent@test.com"

- tapOn: "Password"
- inputText: "password123"

- tapOn: "Login"

# Should show success or navigate to dashboard
- assertVisible:
    text: "Home"
    timeout: 10000
```

**Step 3: Create dashboard flow**

Create `apps/mobile/.maestro/dashboard.yaml`:
```yaml
appId: host.exp.Exponent
name: Dashboard Overview
tags:
  - smoke
  - dashboard
---
- launchApp

# Verify we're on the dashboard (assumes logged in)
- assertVisible:
    text: "Home"
    timeout: 10000

- assertVisible: "Overview"
- assertVisible: "Unread Messages"
- assertVisible: "Outstanding"
- assertVisible: "My Children"
- assertVisible: "Upcoming Events"
```

**Step 4: Create messages flow**

Create `apps/mobile/.maestro/messages.yaml`:
```yaml
appId: host.exp.Exponent
name: Messages Flow
tags:
  - smoke
  - messages
---
- launchApp

# Navigate to Messages tab
- tapOn: "Inbox"

- assertVisible:
    text: "Inbox"
    timeout: 5000

# If messages exist, tap the first one
- runFlow:
    when:
      visible: "Today|Yesterday|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
    commands:
      - tapOn:
          index: 0
      - assertVisible: "Back"
      - back
```

**Step 5: Create navigation smoke flow**

Create `apps/mobile/.maestro/navigation.yaml`:
```yaml
appId: host.exp.Exponent
name: Tab Navigation Smoke Test
tags:
  - smoke
  - navigation
---
- launchApp

# Verify all tabs are accessible
- assertVisible: "Home"
- tapOn: "Inbox"
- assertVisible: "Inbox"

- tapOn: "Calendar"
- assertVisible: "Calendar"

- tapOn: "Attendance"
- assertVisible: "Attendance"

- tapOn: "Payments"
- assertVisible: "Payments"

# Navigate back to Home
- tapOn: "Home"
- assertVisible: "Overview"
```

**Step 6: Test a Maestro flow (requires running Expo + simulator)**

Run:
```bash
# In one terminal: cd apps/mobile && npx expo start
# In another terminal:
maestro test apps/mobile/.maestro/navigation.yaml
```

Note: Maestro flows require a running simulator with Expo Go. They are meant for local dev and CI with a simulator.

**Step 7: Commit**
```bash
git add apps/mobile/.maestro/
git commit -m "test(mobile): add Maestro E2E smoke flows"
```

---

### Task 10: Add test scripts to root package.json and verify all tests pass

**Files:**
- Modify: `apps/mobile/package.json` (add test:ci script)

**Step 1: Add CI test script**

Add to `apps/mobile/package.json` scripts:
```json
{
  "scripts": {
    "test:ci": "jest --ci --coverage --forceExit"
  }
}
```

**Step 2: Run full test suite**

Run: `cd /Users/hitenpatel/dev/personal/abridge/apps/mobile && pnpm test -- --ci`
Expected: All test suites PASS (6 test files, ~30+ tests)

**Step 3: Commit**
```bash
git add apps/mobile/package.json
git commit -m "chore(mobile): add CI test script and verify full suite"
```
