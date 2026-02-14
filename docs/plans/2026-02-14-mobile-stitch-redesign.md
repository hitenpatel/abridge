# Mobile Stitch Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Expo React Native mobile app to match the Stitch design system with role-based navigation, webapp feature parity, and 16 screens.

**Architecture:** Full rewrite of screen components and navigation. Keep existing tRPC hooks and data-fetching patterns; rewrite the UI layer to match Stitch designs. Add role-based tab navigation (4 parent tabs, 4 staff tabs) with a shared floating pill bottom bar. New screens for Forms, Staff Management, Compose Message, Payment Success, Payment History, and Student Profile.

**Tech Stack:** Expo 54, React Native 0.83, React Navigation 7, NativeWind 4 / Tailwind 3.4, tRPC 11, Plus Jakarta Sans font, Material Icons via @expo/vector-icons

**Design doc:** `docs/plans/2026-02-14-mobile-stitch-redesign-design.md`

**Stitch HTML references:** Downloaded to `/tmp/stitch-screens/` (9 files: 01-home-feed.html through 09-teacher-chat.html)

---

## Task 1: Update Design System (theme, fonts, colors)

**Files:**
- Modify: `apps/mobile/tailwind.config.js` (all 66 lines — full rewrite of theme)
- Modify: `apps/mobile/package.json` (swap font package)
- Modify: `apps/mobile/App.tsx:295-318` (font loading)
- Modify: `packages/ui-config/src/colors.ts` (update color values)
- Modify: `apps/mobile/src/components/ui/typography.tsx` (font-family class)

**Step 1: Install new font package**

Run:
```bash
cd apps/mobile && npx pnpm add @expo-google-fonts/plus-jakarta-sans && npx pnpm remove @expo-google-fonts/poppins
```

**Step 2: Update tailwind.config.js**

Replace the entire theme config with Stitch values:

```js
const { abridgePreset } = require("@schoolconnect/ui-config");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset"), abridgePreset],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#f56e3d",
          light: "#fff0eb",
          dark: "#d65021",
        },
        background: {
          DEFAULT: "#f8f6f5",
          dark: "#221510",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark: "#33221b",
        },
        "neutral-surface": {
          DEFAULT: "#fffbf9",
          dark: "#33221b",
        },
        "text-main": {
          DEFAULT: "#5c4d47",
          dark: "#ffffff",
        },
        "text-muted": {
          DEFAULT: "#96867f",
          dark: "#9CA3AF",
        },
        "accent-yellow": {
          DEFAULT: "#ffca28",
          light: "#fff8e1",
        },
        foreground: "#2D3748",
        card: "#ffffff",
        muted: {
          DEFAULT: "#F1F2F5",
          foreground: "#6B7280",
        },
        border: "#E5E7EB",
        input: "#E5E7EB",
        success: {
          DEFAULT: "#22C55E",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#EAB308",
          foreground: "#2D3748",
        },
        info: {
          DEFAULT: "#0EA5E9",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#F87171",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        "sans-medium": ["PlusJakartaSans_500Medium"],
        "sans-semibold": ["PlusJakartaSans_600SemiBold"],
        "sans-bold": ["PlusJakartaSans_700Bold"],
        "sans-extrabold": ["PlusJakartaSans_800ExtraBold"],
        display: ["PlusJakartaSans_700Bold"],
      },
      borderRadius: {
        DEFAULT: "16px",
        sm: "8px",
        md: "12px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
        "3xl": "48px",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 8px 24px -6px rgba(245,110,61,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)",
        glow: "0 0 20px -5px rgba(245,110,61,0.4)",
        card: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)",
      },
    },
  },
  plugins: [],
};
```

**Step 3: Update font loading in App.tsx**

In `App.tsx`, replace Poppins imports with Plus Jakarta Sans:

```tsx
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
```

Update the `useFonts` call to load these 5 weights.

**Step 4: Update typography.tsx**

Change all `font-sans` references to use the new font family. Update text size classes to match Stitch:

```tsx
export function H1({ className = "", ...props }: TypographyProps) {
  return <Text className={`text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight ${className}`} {...props} />;
}

export function H2({ className = "", ...props }: TypographyProps) {
  return <Text className={`text-lg font-sans-bold text-foreground dark:text-white ${className}`} {...props} />;
}

export function Body({ className = "", ...props }: TypographyProps) {
  return <Text className={`text-sm font-sans text-text-main dark:text-gray-200 ${className}`} {...props} />;
}

export function Muted({ className = "", ...props }: TypographyProps) {
  return <Text className={`text-sm font-sans text-text-muted dark:text-gray-400 ${className}`} {...props} />;
}

export function Small({ className = "", ...props }: TypographyProps) {
  return <Text className={`text-xs font-sans text-text-muted dark:text-gray-500 ${className}`} {...props} />;
}
```

**Step 5: Update ui-config colors.ts**

Update the light palette primary from `#FF7D45` to `#f56e3d`, background from `#F7F8FA` to `#f8f6f5`, etc. Keep the color structure but swap values to match Stitch.

**Step 6: Run lint and verify build**

```bash
cd /Users/hitenpatel/dev/personal/abridge && npx pnpm lint:fix
```

**Step 7: Commit**

```bash
git add apps/mobile/tailwind.config.js apps/mobile/package.json apps/mobile/App.tsx apps/mobile/src/components/ui/typography.tsx packages/ui-config/src/colors.ts
git commit -m "feat: update mobile design system to Stitch theme"
```

---

## Task 2: FloatingTabBar Component

**Files:**
- Create: `apps/mobile/src/components/FloatingTabBar.tsx`

**Step 1: Create the floating pill tab bar**

This is a custom `tabBar` component for React Navigation's BottomTabNavigator. It renders a floating pill-shaped bar matching the Stitch Home Feed nav.

```tsx
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, View, Text } from "react-native";
import { hapticLight } from "../lib/haptics";

interface TabConfig {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className="absolute bottom-6 left-6 right-6 h-16 bg-white dark:bg-neutral-surface-dark/90 backdrop-blur-xl rounded-full flex-row items-center justify-between px-2 z-30 border border-white/20 dark:border-white/5"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        elevation: 20,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tabConfig = options.tabBarLabel as unknown as TabConfig;
        const icon = tabConfig?.icon ?? "home";
        const label = tabConfig?.label ?? route.name;

        const onPress = () => {
          hapticLight();
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isFocused) {
          return (
            <Pressable key={route.key} onPress={onPress} className="flex-row items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <MaterialIcons name={icon} size={24} color="#f56e3d" />
              <Text className="text-sm font-sans-bold text-primary">{label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} className="items-center justify-center w-12 h-12 rounded-full">
            <MaterialIcons name={icon} size={24} color="#9CA3AF" />
          </Pressable>
        );
      })}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/FloatingTabBar.tsx
git commit -m "feat: add FloatingTabBar component"
```

---

## Task 3: Role-Based Navigation in App.tsx

**Files:**
- Modify: `apps/mobile/App.tsx` (full rewrite of navigation section, lines 106-244)
- Modify: `apps/mobile/package.json` (add @expo/vector-icons if not present)

**Step 1: Add @expo/vector-icons dependency if needed**

Check if `@expo/vector-icons` is already included with Expo SDK. It is bundled with Expo, so no install needed.

**Step 2: Rewrite App.tsx navigation**

Replace `TabNavigator` (lines 106-175) and `AuthenticatedApp` (lines 177-244) with role-based navigation:

Key changes:
- Import all new screens
- Create `ParentTabNavigator` with 4 tabs (Home, Messages, Attendance, Payments) using FloatingTabBar
- Create `StaffTabNavigator` with 4 tabs (Home, Messages, Attendance, Payments) using FloatingTabBar
- `AuthenticatedApp` checks user role from session to pick which tab navigator to render
- Add all stack screens: MessageDetail, ComposeMessage, PaymentSuccess, PaymentHistory, Calendar, Forms, FormDetail, StudentProfile, Search, StaffManagement
- Update `RootStackParamList` type to include all new screens
- Keep push notification registration logic
- Keep HeaderRight component (update styling to Stitch)

The role detection: use `trpc.auth.getSession` — if the user has a staff membership for the selected school, show staff nav. Otherwise show parent nav.

**Step 3: Update RootStackParamList type**

```tsx
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  MessageDetail: { message: MessageItem };
  ComposeMessage: undefined;
  PaymentSuccess: { amount: number; transactionId: string; itemName: string };
  PaymentHistory: undefined;
  Calendar: undefined;
  Forms: undefined;
  FormDetail: { formId: string; childId: string };
  StudentProfile: { childId: string };
  Search: undefined;
  StaffManagement: undefined;
};

export type ParentTabParamList = {
  ParentHome: undefined;
  Messages: undefined;
  Attendance: undefined;
  Payments: undefined;
};

export type StaffTabParamList = {
  StaffHome: undefined;
  StaffMessages: undefined;
  StaffAttendance: undefined;
  StaffPayments: undefined;
};
```

**Step 4: Run the app to verify navigation renders**

```bash
cd apps/mobile && npx pnpm start
```

**Step 5: Commit**

```bash
git add apps/mobile/App.tsx
git commit -m "feat: add role-based navigation with floating tab bar"
```

---

## Task 4: Shared Components (HeroCard, TimelineCard, StatCard, etc.)

**Files:**
- Create: `apps/mobile/src/components/HeroCard.tsx`
- Create: `apps/mobile/src/components/TimelineCard.tsx`
- Create: `apps/mobile/src/components/StatCard.tsx`
- Create: `apps/mobile/src/components/GradientAvatar.tsx`
- Create: `apps/mobile/src/components/ChildSelector.tsx`
- Create: `apps/mobile/src/components/ProgressBar.tsx`
- Create: `apps/mobile/src/components/AchievementBadge.tsx`
- Create: `apps/mobile/src/components/WalletCard.tsx`

**Step 1: Create each component**

Each component should match the Stitch HTML patterns. Reference the downloaded HTML files in `/tmp/stitch-screens/` for exact class names and structures.

**HeroCard** (from 01-home-feed.html lines 97-111):
- Full-width `bg-primary` rounded-2xl card
- Child avatar (w-14 rounded-full border-4 border-white/20)
- Status text "{Child} is at School" (font-bold text-lg)
- Check-in time (text-white/80 text-sm)
- Decorative circles (absolute positioned white/10 and yellow-300/20 with blur)
- shadow-glow

**TimelineCard** (from 01-home-feed.html lines 131-191):
- Props: `borderColor`, `iconBg`, `iconColor`, `icon`, `title`, `subtitle`, `badge?`, `time?`, `actionButton?`
- Rounded-2xl, p-5, shadow-soft, border-l-4 with dynamic color
- Left icon circle (w-12 h-12 rounded-full)
- Content right side with title, subtitle, optional badge
- Optional CTA button

**StatCard** (from 07-teacher-dashboard.html lines 86-114):
- Flex-shrink-0, bg-white rounded-2xl, shadow-sm, border border-gray-100
- Icon circle (w-10 h-10 rounded-full, colored bg)
- Value (text-lg font-bold) + label (text-xs text-muted)

**GradientAvatar** (from 03-attendance-hub.html lines 97-107):
- Props: `uri`, `size`, `selected`, `onlineDot?`
- Selected: gradient ring (primary to orange-300) with check badge
- Unselected: simple border, grayscale

**ChildSelector** (from 03-attendance-hub.html lines 93-117):
- Horizontal ScrollView of GradientAvatar buttons
- Selected child has gradient ring + check icon
- Unselected: 60% opacity, grayscale

**ProgressBar** (from 06-student-profile.html lines 149-151):
- Props: `label`, `value` (0-100), `icon`, `color`
- Full width, h-4, rounded-full background
- Colored fill bar with width percentage

**AchievementBadge** (from 06-student-profile.html lines 108-135):
- Props: `icon`, `label`, `bgColor`
- w-20 h-20 rounded-[24px] with icon center
- Label below (text-xs font-semibold)

**WalletCard** (from 08-payment-wallet.html lines 84-103):
- Gradient background (135deg #f56e3d to #ff8a65), rounded-[32px]
- Balance display (text-5xl font-extrabold)
- Yellow progress bar
- "Top Up Wallet" button (white, rounded-full)
- Decorative circles

**Step 2: Commit**

```bash
git add apps/mobile/src/components/HeroCard.tsx apps/mobile/src/components/TimelineCard.tsx apps/mobile/src/components/StatCard.tsx apps/mobile/src/components/GradientAvatar.tsx apps/mobile/src/components/ChildSelector.tsx apps/mobile/src/components/ProgressBar.tsx apps/mobile/src/components/AchievementBadge.tsx apps/mobile/src/components/WalletCard.tsx
git commit -m "feat: add Stitch shared components"
```

---

## Task 5: ParentHomeScreen

**Files:**
- Create: `apps/mobile/src/screens/ParentHomeScreen.tsx`
- Delete: `apps/mobile/src/screens/DashboardScreen.tsx` (replaced)

**Step 1: Write ParentHomeScreen**

Reference: `/tmp/stitch-screens/01-home-feed.html`

Structure:
- Sticky header with backdrop blur: date (text-sm font-semibold uppercase tracking-wider text-text-muted) + greeting "Hi, {firstName}!" (text-2xl font-sans-bold) + avatar with green dot
- ScrollView with pb-28 (space for floating nav)
- HeroCard component with first child data from `dashboard.getSummary`
- Quick actions 2x2 grid: Calendar, Forms, Sick Note, Awards — each a Pressable with colored icon circle + label
- "Today & Upcoming" section with TimelineCard components for each event
- Progress section: Attendance % + Participation bars using ProgressBar
- Achievements: horizontal ScrollView of AchievementBadge components
- Loading state: Skeleton components
- Pull-to-refresh via RefreshControl

Data: `trpc.dashboard.getSummary.useQuery({ schoolId })` — same hook as current DashboardScreen.

**Step 2: Delete DashboardScreen.tsx**

Remove the old screen file since ParentHomeScreen replaces it entirely.

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/ParentHomeScreen.tsx
git rm apps/mobile/src/screens/DashboardScreen.tsx
git commit -m "feat: add ParentHomeScreen with Stitch design"
```

---

## Task 6: MessagesScreen Redesign

**Files:**
- Modify: `apps/mobile/src/screens/MessagesScreen.tsx` (full rewrite)
- Modify: `apps/mobile/src/screens/MessageDetailScreen.tsx` (restyle)
- Delete: `apps/mobile/src/components/MessageCard.tsx` (replaced by inline styling)

**Step 1: Rewrite MessagesScreen**

Keep the `trpc.messaging.listReceived.useInfiniteQuery()` data fetching. Rewrite the UI to Stitch style:
- Each message: rounded-2xl card, shadow-soft, neutral-surface bg
- Left: school avatar (w-12 h-12 rounded-full)
- Right: subject (font-bold text-base), body preview (text-sm text-text-muted, 1 line), date (text-xs)
- Unread indicator: blue dot or bolder text
- Category badge (top-right)
- Pull-to-refresh, infinite scroll pagination

**Step 2: Restyle MessageDetailScreen**

Update classes to Stitch style. Keep markRead mutation logic.

**Step 3: Remove MessageCard**

```bash
git rm apps/mobile/src/components/MessageCard.tsx
```

**Step 4: Commit**

```bash
git add apps/mobile/src/screens/MessagesScreen.tsx apps/mobile/src/screens/MessageDetailScreen.tsx
git rm apps/mobile/src/components/MessageCard.tsx
git commit -m "feat: redesign MessagesScreen and MessageDetailScreen"
```

---

## Task 7: AttendanceScreen Redesign

**Files:**
- Modify: `apps/mobile/src/screens/AttendanceScreen.tsx` (full rewrite)

**Step 1: Rewrite AttendanceScreen**

Reference: `/tmp/stitch-screens/03-attendance-hub.html`

Structure:
- Header: "Attendance Hub" (text-3xl font-sans-extrabold) + subtitle + avatar. Attendance % badge.
- ChildSelector component for child switching
- Calendar section: month grid with color-coded days (green present, yellow late, red absent, blue today ring)
- Absence form in white rounded-3xl card:
  - Reason toggle row: 4 pill buttons (Sick, Appointment, Family, Other) — active shows white bg with icon colored
  - Date picker input (rounded-2xl)
  - Optional note textarea (rounded-2xl)
- CTA: Large mint "Report Absence" button (h-32, rounded-[40px]) with send icon + teacher name
- Recent absences list below
- Keep existing tRPC hooks: `user.listChildren`, `attendance.*`

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/AttendanceScreen.tsx
git commit -m "feat: redesign AttendanceScreen with Stitch style"
```

---

## Task 8: PaymentsScreen Redesign + PaymentSuccess + PaymentHistory

**Files:**
- Modify: `apps/mobile/src/screens/PaymentsScreen.tsx` (full rewrite)
- Create: `apps/mobile/src/screens/PaymentSuccessScreen.tsx`
- Create: `apps/mobile/src/screens/PaymentHistoryScreen.tsx`

**Step 1: Rewrite PaymentsScreen**

Reference: `/tmp/stitch-screens/08-payment-wallet.html`

Structure:
- Header: "Wallet" + subtitle + history icon button (navigates to PaymentHistory)
- WalletCard component (balance hero)
- "Due Now" section: urgent cards with red left border, icon, title, amount, "Pay Now" button
- "Upcoming" section: cards with image thumbnails, event name, price, "Pay" pill
- Completed items at 60% opacity
- Quick top-up section with preset amount buttons
- Keep existing `payments.listOutstandingPayments`, `payments.createCheckoutSession`

**Step 2: Create PaymentSuccessScreen**

Reference: `/tmp/stitch-screens/05-payment-success.html` (actually 09-teacher-chat.html is file 05)

Modal screen (presentation: "transparentModal" in navigation):
- bg-black/5 backdrop-blur-md overlay
- Centered white card (rounded-2xl, shadow-soft, p-8)
- Pulsing checkmark: w-24 h-24 container, w-16 h-16 bg-primary rounded-full with check icon
- "Payment Successful!" (text-2xl font-bold)
- Item name in primary color
- Receipt box: bg-background rounded-xl, amount + transaction ID
- "Back to Home" button (bg-primary rounded-full) + "View Receipt" text link
- Confetti decoration: absolute positioned colored circles/squares

**Step 3: Create PaymentHistoryScreen**

Stack screen showing past payments:
- Header with back button + "Payment History" title
- FlatList of completed payment items
- Each item: icon, title, amount (strikethrough styling removed here), date paid
- Data from `trpc.payments.listPayments`

**Step 4: Commit**

```bash
git add apps/mobile/src/screens/PaymentsScreen.tsx apps/mobile/src/screens/PaymentSuccessScreen.tsx apps/mobile/src/screens/PaymentHistoryScreen.tsx
git commit -m "feat: redesign PaymentsScreen, add PaymentSuccess and PaymentHistory"
```

---

## Task 9: CalendarScreen Restyle + SearchScreen Restyle

**Files:**
- Modify: `apps/mobile/src/screens/CalendarScreen.tsx` (restyle)
- Modify: `apps/mobile/src/screens/SearchScreen.tsx` (restyle)

**Step 1: Restyle CalendarScreen**

Convert to stack screen (no longer a tab). Update styling:
- Header with back button + "Calendar" title
- Month navigation with Stitch styling
- Event cards using TimelineCard component pattern
- Keep existing `trpc.calendar.listEvents` data

**Step 2: Restyle SearchScreen**

Update to Stitch visual style:
- Search input with rounded-2xl, bg-neutral-surface
- Result cards with Stitch card patterns
- Keep debounced search logic

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/CalendarScreen.tsx apps/mobile/src/screens/SearchScreen.tsx
git commit -m "feat: restyle Calendar and Search screens"
```

---

## Task 10: StudentProfileScreen

**Files:**
- Create: `apps/mobile/src/screens/StudentProfileScreen.tsx`

**Step 1: Create StudentProfileScreen**

Reference: `/tmp/stitch-screens/06-student-profile.html`

Structure:
- Header: back arrow + "Student Profile" + settings icon
- Hero: large avatar (w-32) with yellow glow border effect (absolute bg-primary blur), name (text-3xl font-sans-bold), student ID
- Info card: mint background (bg-teal-50), 2-col grid with divider: Grade (with school icon) + Teacher (with person icon)
- Achievements: horizontal ScrollView of AchievementBadge components
- Progress section: bg-gray-50 rounded-2xl card with ProgressBar for attendance and participation
- "Up Next" card: gradient from-primary/10, date box + event name + chevron
- Data from `trpc.dashboard.getSummary` filtered to specific child (via `childId` nav param)

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/StudentProfileScreen.tsx
git commit -m "feat: add StudentProfileScreen"
```

---

## Task 11: FormsScreen + FormDetailScreen

**Files:**
- Create: `apps/mobile/src/screens/FormsScreen.tsx`
- Create: `apps/mobile/src/screens/FormDetailScreen.tsx`
- Create: `apps/mobile/src/components/FormRenderer.tsx`

**Step 1: Create FormsScreen**

Webapp parity with `/dashboard/forms`:
- Header: "Forms & Consent" + subtitle
- Per-child sections (from `trpc.dashboard.getSummary` for children list)
- "Action Required" section: pending forms from `trpc.forms.getPendingForms`
  - Cards with icon, title, description, "Complete" button → navigate to FormDetail
- "Completed" section: from `trpc.forms.getCompletedForms`
  - Grayed cards with "Submitted" badge + date
- Empty state if no forms

**Step 2: Create FormRenderer**

Dynamic form field renderer matching webapp's FormRenderer:
- Reads form template fields from `trpc.forms.getTemplate`
- Renders field types: text input, textarea, checkbox, radio, date, select
- Manages form state with useState/useReducer
- Validates required fields

**Step 3: Create FormDetailScreen**

- Header with back button + form title
- Badge showing which child
- FormRenderer component with template data
- Multi-child apply checkbox (if multiple children from `dashboard.getSummary`)
- Submit button calling `trpc.forms.submitForm`
- Success state with green checkmark after submission

**Step 4: Commit**

```bash
git add apps/mobile/src/screens/FormsScreen.tsx apps/mobile/src/screens/FormDetailScreen.tsx apps/mobile/src/components/FormRenderer.tsx
git commit -m "feat: add Forms and FormDetail screens"
```

---

## Task 12: StaffHomeScreen

**Files:**
- Create: `apps/mobile/src/screens/StaffHomeScreen.tsx`

**Step 1: Create StaffHomeScreen**

Reference: `/tmp/stitch-screens/07-teacher-dashboard.html`

Structure:
- Header: gradient bg from primary/10. Date (text-sm uppercase) + "Good Morning, {name}!" (text-3xl font-sans-extrabold, name span in text-primary-dark). Avatar with gradient ring.
- Quick stats: horizontal ScrollView of StatCard components: unread msgs (blue), absent today (orange), events (purple)
- "Post Update" CTA: large bg-primary rounded-3xl Pressable. "Post Update" title + "Share news with parents instantly" subtitle + add icon in white/20 circle. Decorative bg circles. Navigates to ComposeMessage.
- "Recent Posts" section header + "View All" link
- Post cards: rounded-3xl, p-5, shadow-card. Category badge pill (Reminder=yellow, Gallery=green, Homework=blue), timestamp, title, preview text, seen-by avatar stack, comment count.
- Admin only: "Staff Management" entry card at bottom
- Data: staff-specific tRPC summary data (reuse `dashboard.getSummary` or staff equivalent)

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/StaffHomeScreen.tsx
git commit -m "feat: add StaffHomeScreen with Stitch design"
```

---

## Task 13: ComposeMessageScreen

**Files:**
- Create: `apps/mobile/src/screens/ComposeMessageScreen.tsx`

**Step 1: Create ComposeMessageScreen**

Reference: `/tmp/stitch-screens/04-create-update.html` + `/tmp/stitch-screens/02-update-preview.html`

Structure:
- Header: "Cancel" left button + "New Update" center title
- Recipient selector: card with class icon + class name + dropdown arrow
- Priority toggle: 2-col grid (Normal=mint bg with check_circle icon, High Priority=red bg with priority_high icon) using radio-style selection
- Input card: white rounded-2xl. Subject TextInput (text-lg font-semibold, border-b) + message TextInput multiline (h-48, text-base)
- Attachments: horizontal scroll of dashed-border Pressable buttons (Photo with add_a_photo icon, Document with note_add, Event with event)
- Info banner: bg-primary/5 rounded-xl with info icon + notification disclaimer text
- Sticky bottom CTA: "Post to Class" button (bg-primary rounded-lg, full width)
- Data: calls `trpc.messaging.send` on submit
- KeyboardAvoidingView wrapper

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/ComposeMessageScreen.tsx
git commit -m "feat: add ComposeMessageScreen"
```

---

## Task 14: StaffAttendanceScreen + StaffPaymentsScreen

**Files:**
- Create: `apps/mobile/src/screens/StaffAttendanceScreen.tsx`
- Create: `apps/mobile/src/screens/StaffPaymentsScreen.tsx`

**Step 1: Create StaffAttendanceScreen**

Staff view of attendance. Similar layout to parent AttendanceScreen but shows class-level attendance data rather than child-specific:
- Class attendance overview
- List of absent students today
- Stitch visual styling
- Uses staff attendance tRPC data

**Step 2: Create StaffPaymentsScreen**

Staff view of payments. View payment items + create new:
- List of payment items with status
- "Create New" FAB or button → navigate to payment creation form
- Uses `trpc.payments.listItems`

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/StaffAttendanceScreen.tsx apps/mobile/src/screens/StaffPaymentsScreen.tsx
git commit -m "feat: add staff Attendance and Payments screens"
```

---

## Task 15: StaffManagementScreen (admin only)

**Files:**
- Create: `apps/mobile/src/screens/StaffManagementScreen.tsx`

**Step 1: Create StaffManagementScreen**

Webapp parity with `/dashboard/staff`:
- Header: back button + "Staff Management" title
- Invite section: email TextInput + role picker (Teacher/Office/Admin segmented buttons) + "Send Invite" button
  - Calls `trpc.invitation.send`
- Current staff list: FlatList of staff members
  - Each: avatar with initials circle, name, email, role Badge (colored by type), delete Pressable (not for self)
  - Calls `trpc.staff.list`
- Pending invitations section (conditional, only if invitations exist):
  - Each: email, role badge, expiry date, "Copy Link" button (uses Clipboard API)
  - Calls `trpc.invitation.list`
- Remove staff confirmation: Modal with warning text + Cancel/Remove buttons
  - Calls `trpc.staff.remove`

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/StaffManagementScreen.tsx
git commit -m "feat: add StaffManagementScreen for admin"
```

---

## Task 16: LoginScreen Restyle

**Files:**
- Modify: `apps/mobile/src/screens/LoginScreen.tsx` (restyle)

**Step 1: Restyle LoginScreen**

Update to Stitch design system:
- Background: bg-background (#f8f6f5)
- Logo/brand area: "Abridge" text in font-sans-extrabold text-primary
- Email + password inputs with Stitch styling (rounded-2xl, bg-neutral-surface)
- "Sign In" button: bg-primary rounded-full, font-bold, shadow-glow
- Keep all auth logic (authClient.signIn.email, error handling, onLoginSuccess callback)

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/LoginScreen.tsx
git commit -m "feat: restyle LoginScreen to Stitch design"
```

---

## Task 17: Update Existing UI Components

**Files:**
- Modify: `apps/mobile/src/components/ui/button.tsx`
- Modify: `apps/mobile/src/components/ui/card.tsx`
- Modify: `apps/mobile/src/components/ui/badge.tsx`
- Modify: `apps/mobile/src/components/ui/input.tsx`
- Modify: `apps/mobile/src/components/ui/modal.tsx`
- Modify: `apps/mobile/src/components/ui/empty-state.tsx`
- Modify: `apps/mobile/src/components/ui/skeleton.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

**Step 1: Update Button**

Update CVA variants to use new border radius (rounded-xl default, rounded-full for some), new primary color, font-sans-bold.

**Step 2: Update Card**

Update to rounded-2xl, shadow-soft, bg-neutral-surface, border-gray-100.

**Step 3: Update Badge**

Update colors to match Stitch palette. Add new variants if needed.

**Step 4: Update Input**

Change to rounded-2xl, bg-neutral-surface / bg-background, font-sans-medium.

**Step 5: Update remaining components**

Modal, EmptyState, Skeleton — update colors and border radius to match Stitch.

**Step 6: Update index.ts barrel export**

Add new component exports if any new UI primitives were added.

**Step 7: Commit**

```bash
git add apps/mobile/src/components/ui/
git commit -m "feat: update UI components to Stitch design system"
```

---

## Task 18: Update Tests

**Files:**
- Modify: `apps/mobile/src/screens/__tests__/DashboardScreen.test.tsx` → rename/rewrite for ParentHomeScreen
- Modify: `apps/mobile/src/screens/__tests__/AttendanceScreen.test.tsx`
- Modify: `apps/mobile/src/screens/__tests__/PaymentsScreen.test.tsx`
- Modify: `apps/mobile/src/screens/__tests__/MessageDetailScreen.test.tsx`
- Modify: `apps/mobile/src/screens/__tests__/LoginScreen.test.tsx`
- Delete: `apps/mobile/src/components/__tests__/MessageCard.test.tsx`

**Step 1: Update test imports and assertions**

All tests need:
- Import updates (DashboardScreen → ParentHomeScreen, etc.)
- Updated text matchers (new titles, labels)
- Font mock updates (Plus Jakarta Sans instead of Poppins)
- New component mocks if needed

**Step 2: Run tests**

```bash
cd /Users/hitenpatel/dev/personal/abridge && npx pnpm test
```

Fix any failures.

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/__tests__/ apps/mobile/src/components/__tests__/
git commit -m "test: update mobile tests for Stitch redesign"
```

---

## Task 19: Final Cleanup and Lint

**Files:**
- Modify: `apps/mobile/src/navigation/AppNavigator.tsx` (delete — legacy, not used)
- Any remaining import cleanup

**Step 1: Remove legacy AppNavigator**

```bash
git rm apps/mobile/src/navigation/AppNavigator.tsx
```

**Step 2: Run lint**

```bash
cd /Users/hitenpatel/dev/personal/abridge && npx pnpm lint:fix
```

**Step 3: Run full test suite**

```bash
npx pnpm test
```

**Step 4: Build verification**

```bash
npx pnpm build
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: cleanup legacy files and fix lint"
```

---

## Execution Order Summary

| Task | Description | Dependencies |
|---|---|---|
| 1 | Design system (theme, fonts, colors) | None |
| 2 | FloatingTabBar component | Task 1 |
| 3 | Role-based navigation in App.tsx | Tasks 1, 2 |
| 4 | Shared components (Hero, Timeline, Stat, etc.) | Task 1 |
| 5 | ParentHomeScreen | Tasks 3, 4 |
| 6 | MessagesScreen redesign | Tasks 1, 3 |
| 7 | AttendanceScreen redesign | Tasks 1, 3, 4 |
| 8 | PaymentsScreen + PaymentSuccess + PaymentHistory | Tasks 1, 3, 4 |
| 9 | CalendarScreen + SearchScreen restyle | Tasks 1, 3 |
| 10 | StudentProfileScreen | Tasks 1, 3, 4 |
| 11 | FormsScreen + FormDetailScreen | Tasks 1, 3 |
| 12 | StaffHomeScreen | Tasks 1, 3, 4 |
| 13 | ComposeMessageScreen | Tasks 1, 3 |
| 14 | StaffAttendanceScreen + StaffPaymentsScreen | Tasks 1, 3 |
| 15 | StaffManagementScreen | Tasks 1, 3 |
| 16 | LoginScreen restyle | Task 1 |
| 17 | Update existing UI components | Task 1 |
| 18 | Update tests | Tasks 5-17 |
| 19 | Final cleanup and lint | Tasks 1-18 |

**Parallelizable groups:**
- Tasks 5-16 can be done in parallel (all depend only on Tasks 1-4)
- Task 17 can run parallel with Tasks 5-16
- Tasks 18-19 must run last
