# Mobile App Stitch Redesign

## Context

Redesign the Expo React Native mobile app to match the visual design system from the Stitch project (projects/2207422495650866887). The redesign covers all 16 screens (parent + staff), maintains feature parity with the webapp, and adopts the Stitch design system exactly.

Approach: Full rewrite of screen components. Keep existing tRPC hooks and data-fetching patterns; rewrite the UI layer to match Stitch.

## Design System

### Font
- **Plus Jakarta Sans** (replace Poppins)
- Weights: 400, 500, 600, 700, 800
- Package: `@expo-google-fonts/plus-jakarta-sans`

### Colors

| Token | Light | Dark |
|---|---|---|
| primary | `#f56e3d` | `#f56e3d` |
| primary-light | `#fff0eb` | `rgba(245,110,61,0.2)` |
| primary-dark | `#d65021` | `#d65021` |
| background | `#f8f6f5` | `#221510` |
| surface | `#ffffff` | `#33221b` |
| neutral-surface | `#fffbf9` | `#33221b` |
| text-main | `#5c4d47` | `#ffffff` |
| text-muted | `#96867f` | `#9CA3AF` |
| border | `#E5E7EB` | `rgba(255,255,255,0.05)` |
| accent-yellow | `#ffca28` | `#ffca28` |
| accent-yellow-light | `#fff8e1` | `rgba(255,202,40,0.2)` |
| success | `#22C55E` | `#22C55E` |
| destructive | `#F87171` | `#F87171` |

### Border Radius
- DEFAULT: `1rem` (16px)
- lg: `1.5rem` (24px)
- xl: `2rem` (32px)
- 2xl: `2.5rem` (40px)
- full: `9999px`

### Shadows
- soft: `0 8px 24px -6px rgba(245,110,61,0.08), 0 4px 8px -4px rgba(0,0,0,0.04)`
- glow: `0 0 20px -5px rgba(245,110,61,0.4)`
- card: `0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)`

### Icons
- Switch from `lucide-react-native` to Material Icons via `@expo/vector-icons` `MaterialIcons` / `MaterialCommunityIcons`
- Icon style: Round variant where available

## Navigation Architecture

### Role Detection
User role determined from session data (staff membership). Parents and staff see different tab bars and home screens.

### Parent Tabs (floating pill nav, 4 tabs)
| Tab | Icon | Screen |
|---|---|---|
| Home | home | ParentHomeScreen |
| Messages | chat_bubble_outline | MessagesScreen |
| Attendance | calendar_today | AttendanceScreen |
| Payments | account_balance_wallet | PaymentsScreen |

### Staff Tabs (floating pill nav, 4 tabs)
| Tab | Icon | Screen |
|---|---|---|
| Home | home | StaffHomeScreen |
| Messages | chat_bubble | StaffMessagesScreen |
| Attendance | co_present | StaffAttendanceScreen |
| Payments | account_balance_wallet | StaffPaymentsScreen |

### Stack Screens (both roles)
- MessageDetail
- ComposeMessage (staff only)
- PaymentSuccess (modal)
- PaymentHistory
- CalendarScreen
- FormsScreen
- FormDetailScreen
- StudentProfileScreen
- SearchScreen
- StaffManagementScreen (admin only)

### Floating Pill Nav Component
- Position: absolute, bottom-6, left-6, right-6
- Height: h-16, rounded-full
- Background: white with backdrop-blur-xl
- Shadow: `0 8px 30px rgb(0,0,0,0.12)`
- Border: `border border-white/20` (light), `border-white/5` (dark)
- Active tab: icon + label in `bg-primary/10` pill, text primary color
- Inactive tab: icon only, `text-neutral-400`, w-12 h-12 touch target
- Notification dot: red circle on Chat/Messages tab when unread

## Screen Designs

### Parent Screens

#### 1. ParentHomeScreen
- **Header:** Sticky with backdrop blur. Date (sm uppercase tracking-wider) + "Hi, {name}!" (2xl bold). Avatar (w-12 rounded-full) with green online dot.
- **Hero widget:** Full-width bg-primary rounded-2xl. Child avatar + "{Child} is at School" + check-in time. Decorative blurred circles. shadow-glow.
- **Quick actions:** 2x2 grid. Cards with colored circular icon backgrounds: Calendar (blue), Forms (purple), Sick Note (orange), Awards (teal). Each navigates to respective screen.
- **Today & Upcoming:** Timeline cards with colored left-4 borders. Yellow=reminder, primary=alert, teal=event, purple=activity. Each: circular icon, title, subtitle, time/badge.
- **Progress section:** Attendance % and Participation bars (from dashboard.getSummary).
- **Achievements:** 4 horizontal-scroll badge cards (Star Reader, Kindness, Math Whiz, Nature Scout).
- **Data:** `trpc.dashboard.getSummary`

#### 2. MessagesScreen (parent - receive only)
- Message list from `trpc.messaging.listReceived` with infinite scroll
- Each item: school avatar, subject (bold), body preview (1 line), date, category badge, unread blue dot
- Styled as Stitch-style cards with rounded-2xl, shadow-soft
- Pull-to-refresh
- Tap navigates to MessageDetail

#### 3. AttendanceScreen
- **Header:** "Attendance Hub" (3xl extrabold) + subtitle + avatar. Attendance % badge.
- **Child selector:** Horizontal scroll avatars. Selected: gradient ring (primary to orange-300) + check badge. Unselected: grayscale 60% opacity.
- **Calendar:** Month view with color-coded days. Green=present, yellow=late, red=absent. Today: blue ring.
- **Absence form:** White rounded-3xl card. Reason toggles (4 options: Sick, Appointment, Family, Other). Date picker. Optional note. Submit button.
- **History:** Recent absences list with icon, date, reason, excused badge.
- **Data:** `trpc.user.listChildren`, `trpc.attendance.*`

#### 4. PaymentsScreen
- **Header:** "Wallet" + subtitle. History icon button (navigates to PaymentHistory).
- **Balance card:** Gradient coral (135deg #f56e3d to #ff8a65), rounded-[2rem]. Balance amount, yellow progress bar, "Top Up Wallet" button.
- **Toggle tabs:** Upcoming | History
- **Due items:** Cards with red left border for urgent. Icon, title, description, amount, "Pay Now" button. Calls `payments.createCheckoutSession` -> `Linking.openURL`.
- **Upcoming items:** Cards with image thumbnails, event name, price, "Pay" pill button.
- **Completed:** Faded cards with strikethrough amount.
- **Quick top-up:** Preset amounts ($20/$50/$100) + custom input.
- **Data:** `trpc.payments.listItems`, `trpc.payments.listPayments`, `trpc.payments.createCheckoutSession`

#### 5. MessageDetailScreen
- School info header with avatar, name, class
- Category badge + timestamp
- Full message body
- Auto-marks as read on mount
- **Data:** passed via navigation params + `trpc.messaging.markRead`

#### 6. PaymentSuccessScreen (modal)
- Backdrop blur overlay (bg-black/5 + backdrop-blur-md)
- Centered white card (rounded-2xl, shadow-soft, p-8)
- Pulsing primary checkmark icon (w-16 h-16 bg-primary rounded-full)
- Confetti decoration elements
- "Payment Successful!" title + item name + receipt info (amount + transaction ID)
- "Back to Home" primary button + "View Receipt" text link

#### 7. CalendarScreen (stack from Home)
- Month navigation (prev/next)
- Event list display
- Stitch visual styling on cards
- **Data:** `trpc.calendar.listEvents`

#### 8. FormsScreen (webapp parity)
- Per-child sections
- Pending forms: action-required cards with icon, title, description, "Complete" CTA
- Completed forms: grayed cards with "Submitted" badge + date
- **Data:** `trpc.forms.getPendingForms`, `trpc.forms.getCompletedForms`

#### 9. FormDetailScreen (webapp parity)
- Dynamic form renderer from template
- Multi-child apply checkbox if multiple children
- Submit button
- Success state after submission
- **Data:** `trpc.forms.getTemplate`, `trpc.forms.submitForm`

#### 10. StudentProfileScreen
- **Header:** Back arrow, "Student Profile", settings icon
- **Hero:** Large avatar (w-32) with yellow glow border, name (3xl bold), student ID
- **Info card:** Mint background 2-col grid: Grade + Teacher with teal icons
- **Achievements:** Horizontal scroll badge cards (w-20, rounded-[1.5rem]) with material icons
- **Progress:** Attendance + Participation bars with percentages
- **Next activity:** Gradient card with date, event name, chevron
- **Data:** `trpc.dashboard.getSummary`

#### 11. SearchScreen
- Debounced search (300ms, 3+ chars) across messages/events/payments
- Result cards styled with Stitch patterns
- **Data:** `trpc.search.query`

### Staff Screens

#### 12. StaffHomeScreen
- **Header:** Gradient primary/10 top section. Date (sm uppercase) + "Good Morning, {name}!" (3xl extrabold, name in primary-dark). Avatar with gradient ring.
- **Quick stats:** Horizontal scroll cards: unread msgs (blue icon), absent today (orange), events (purple). Each: icon circle + count + label.
- **Post Update CTA:** Large primary-bg rounded-3xl button. "Post Update" + description + add icon. Decorative background circles. Navigates to ComposeMessage.
- **Recent posts:** Cards with category badge pills (Reminder=yellow, Gallery=green, Homework=blue), title, preview text, seen-by avatar stack, comment count.
- **Admin entry:** Staff Management link (admin role only).
- **Data:** Staff-specific tRPC data

#### 13. ComposeMessageScreen (staff only)
- **Header:** "Cancel" left, "New Update" center
- **Recipient selector:** Class/group picker card with dropdown icon
- **Priority toggle:** 2-col grid (Normal=mint, High=red)
- **Input card:** White rounded-2xl. Subject input + message textarea.
- **Attachments:** Horizontal scroll dashed-border upload buttons (Photo, Document, Event)
- **Info banner:** Notification disclaimer
- **Sticky CTA:** "Post to Class" / "Preview & Send" button
- **Data:** `trpc.messaging.send`

#### 14. StaffAttendanceScreen
- Class attendance view (staff perspective)
- Same visual patterns as parent attendance
- **Data:** Staff attendance tRPC procedures

#### 15. StaffPaymentsScreen
- Payment items management + create new
- List view with staff-specific actions
- **Data:** `trpc.payments.listItems` + creation

#### 16. StaffManagementScreen (admin only)
- **Invite card:** Email input + role selector (Teacher/Office/Admin) + send button
- **Current staff list:** Avatar with initials, name, email, role badge, delete button
- **Pending invitations:** Email, role, expiry, "Copy Link" button
- **Remove confirmation:** Dialog with warning
- **Data:** `trpc.staff.list`, `trpc.staff.remove`, `trpc.invitation.list`, `trpc.invitation.send`

## Shared Components

### New
- `FloatingTabBar` - pill-shaped bottom nav
- `HeroCard` - primary-bg status widget
- `TimelineCard` - left-border colored feed card
- `StatCard` - quick stat with icon circle
- `GradientAvatar` - avatar with gradient ring border
- `ChildSelector` - horizontal avatar picker
- `ProgressBar` - styled progress indicator
- `AchievementBadge` - rounded icon badge card
- `WalletCard` - gradient balance card
- `FormRenderer` - dynamic form field renderer

### Updated
- All existing UI components (Button, Card, Badge, Input, etc.) - update to new border radius, colors, font
- Typography components - update font family to Plus Jakarta Sans

### Removed
- Legacy `MessageCard` component (replaced by TimelineCard/message list items)

## Data Layer

No new tRPC procedures are needed. All screens use existing procedures:
- `dashboard.getSummary`
- `messaging.listReceived`, `messaging.send`, `messaging.markRead`
- `user.listChildren`
- `attendance.*`
- `payments.listItems`, `payments.listPayments`, `payments.createCheckoutSession`
- `calendar.listEvents`
- `forms.getPendingForms`, `forms.getCompletedForms`, `forms.getTemplate`, `forms.submitForm`
- `staff.list`, `staff.remove`
- `invitation.list`, `invitation.send`
- `search.query`

## Files Changed

### Config files
- `tailwind.config.js` - new color palette, border radius, shadows, font family
- `package.json` - swap font package, add material icons if needed

### New files
- `src/components/FloatingTabBar.tsx`
- `src/components/HeroCard.tsx`
- `src/components/TimelineCard.tsx`
- `src/components/StatCard.tsx`
- `src/components/GradientAvatar.tsx`
- `src/components/ChildSelector.tsx`
- `src/components/ProgressBar.tsx`
- `src/components/AchievementBadge.tsx`
- `src/components/WalletCard.tsx`
- `src/components/FormRenderer.tsx`
- `src/screens/ParentHomeScreen.tsx`
- `src/screens/StaffHomeScreen.tsx`
- `src/screens/ComposeMessageScreen.tsx`
- `src/screens/PaymentSuccessScreen.tsx`
- `src/screens/PaymentHistoryScreen.tsx`
- `src/screens/StudentProfileScreen.tsx`
- `src/screens/FormsScreen.tsx`
- `src/screens/FormDetailScreen.tsx`
- `src/screens/StaffAttendanceScreen.tsx`
- `src/screens/StaffPaymentsScreen.tsx`
- `src/screens/StaffManagementScreen.tsx`

### Rewritten files
- `App.tsx` - role-based navigation, floating tab bar, new screen registry
- `src/screens/MessagesScreen.tsx` - Stitch card styling
- `src/screens/MessageDetailScreen.tsx` - Stitch styling
- `src/screens/AttendanceScreen.tsx` - full Stitch redesign
- `src/screens/PaymentsScreen.tsx` - full Stitch wallet redesign
- `src/screens/CalendarScreen.tsx` - Stitch styling
- `src/screens/SearchScreen.tsx` - Stitch styling
- `src/screens/LoginScreen.tsx` - Stitch styling
- `src/screens/DashboardScreen.tsx` - removed (replaced by ParentHomeScreen)
- `src/components/ui/*` - updated theme tokens
- `src/lib/theme-provider.tsx` - updated color values

### Test files
- All existing tests updated for new component structure
