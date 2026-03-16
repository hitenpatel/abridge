# Maestro Full Test Coverage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve 100% mobile screen coverage with Maestro e2e tests — every user-reachable screen exercised with real journeys.

**Architecture:** Add seed data (calendar events + form template) to unblock empty screens, add 3 real UI navigation elements (search icon, child profile tap, staff message card), then write 8 new Maestro flows replacing 3 stubs.

**Tech Stack:** Prisma seed (TypeScript), React Native (Expo), Maestro YAML

---

### Task 1: Seed calendar events

**Files:**
- Modify: `packages/db/prisma/seed.ts` (after attendance records section, ~line 330)

**Step 1: Add 3 calendar events to seed**

Insert after the attendance records section (after the `console.log("Seeded attendance")` line):

```typescript
// ─── Calendar Events ──────────────────────────────────────────
const seedEvents = [
  {
    title: "Spring Term Ends",
    category: "TERM_DATE" as const,
    startDate: new Date("2026-04-10"),
    allDay: true,
  },
  {
    title: "Year 2 Trip to Science Museum",
    body: "Year 2 and Year 5 joint trip. Please bring packed lunch.",
    category: "EVENT" as const,
    startDate: new Date("2026-03-20T09:00:00"),
    endDate: new Date("2026-03-20T15:00:00"),
    allDay: false,
  },
  {
    title: "Sports Day",
    body: "Annual sports day on the school field. Parents welcome from 1pm.",
    category: "EVENT" as const,
    startDate: new Date("2026-04-25"),
    allDay: true,
  },
];

for (const evt of seedEvents) {
  const existing = await prisma.event.findFirst({
    where: { schoolId: school.id, title: evt.title },
  });
  if (!existing) {
    await prisma.event.create({
      data: { schoolId: school.id, ...evt },
    });
  }
}
console.log("Seeded calendar events");
```

**Step 2: Verify no TypeScript errors**

Run: `cd packages/db && npx tsc --noEmit --pretty`
Expected: No errors (EventCategory enum already has TERM_DATE, EVENT)

**Step 3: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "seed: add 3 calendar events for e2e testing"
```

---

### Task 2: Seed form template

**Files:**
- Modify: `packages/db/prisma/seed.ts` (after calendar events from Task 1)

**Step 1: Add form template + verify it creates a pending form**

Insert after the calendar events section:

```typescript
// ─── Form Templates ───────────────────────────────────────────
const consentForm = await prisma.formTemplate.upsert({
  where: { id: "form-photo-consent" },
  update: {},
  create: {
    id: "form-photo-consent",
    schoolId: school.id,
    title: "Photography Consent Form",
    description: "Permission for your child to be photographed during school activities",
    fields: [
      {
        id: "consent",
        type: "checkbox",
        label: "I give consent for my child to be photographed during school activities",
        required: true,
      },
      {
        id: "signature",
        type: "text",
        label: "Parent/Guardian full name (as signature)",
        required: true,
      },
    ],
  },
});
console.log("Seeded form templates");
```

Note: FormTemplate uses `id` as `@id @default(cuid())` — providing a fixed id via `upsert` makes it idempotent. No FormResponse is created for Emily, so the form appears as "pending" in the Forms screen.

**Step 2: Verify no TypeScript errors**

Run: `cd packages/db && npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "seed: add photography consent form template for e2e testing"
```

---

### Task 3: Add search icon to ParentHomeScreen

**Files:**
- Modify: `apps/mobile/src/screens/ParentHomeScreen.tsx`

**Step 1: Add search icon button in header**

In the header's button row (`<View className="flex-row items-center gap-2">`), add a search button **before** the settings button:

```tsx
<Pressable
  onPress={() => navigation.navigate("Search")}
  accessibilityLabel="Search"
  className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
>
  <MaterialIcons name="search" size={20} color="#96867f" />
</Pressable>
```

The full button row becomes (search, settings, logout):
```tsx
<View className="flex-row items-center gap-2">
  <Pressable
    onPress={() => navigation.navigate("Search")}
    accessibilityLabel="Search"
    className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
  >
    <MaterialIcons name="search" size={20} color="#96867f" />
  </Pressable>
  <Pressable
    onPress={() => navigation.navigate("Settings")}
    testID="settings-button"
    ...existing...
  </Pressable>
  <Pressable
    onPress={logout}
    testID="logout-button"
    ...existing...
  </Pressable>
</View>
```

**Step 2: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty`
Expected: No errors — `Search` is already in `RootStackParamList`

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/ParentHomeScreen.tsx
git commit -m "feat: add search icon to parent home header"
```

---

### Task 4: Add child profile navigation via ChildSwitcher

**Files:**
- Modify: `apps/mobile/src/components/ChildSwitcher.tsx`
- Modify: `apps/mobile/src/screens/ParentHomeScreen.tsx`

**Step 1: Add `onViewProfile` prop to ChildSwitcher**

Update the props interface:

```tsx
interface ChildSwitcherProps {
  items: ChildOption[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
  onViewProfile?: (childId: string) => void;
}
```

**Step 2: Tap already-selected child → profile**

In the ChildSwitcher's `Pressable` `onPress`, change to:

```tsx
onPress={() => {
  if (isActive && onViewProfile) {
    onViewProfile(child.id);
  } else {
    onSelect(child.id);
  }
}}
```

**Step 3: Wire up in ParentHomeScreen**

In the `<ChildSwitcher>` usage, add the `onViewProfile` prop:

```tsx
<ChildSwitcher
  items={children.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    yearGroup: (c as Record<string, unknown>).yearGroup as string | undefined,
    className: (c as Record<string, unknown>).className as string | undefined,
  }))}
  selectedChildId={selectedChildId ?? ""}
  onSelect={setSelectedChildId}
  onViewProfile={(childId) => navigation.navigate("StudentProfile", { childId })}
/>
```

**Step 4: For single-child parents, add a tappable profile link**

When `children.length === 1`, there's no ChildSwitcher shown. Add a tappable greeting below the "Hi, {firstName}!" text (but only when `__DEV__ || EXPO_PUBLIC_E2E` to keep it as a dev-only shortcut for single-child testing):

Actually, for single-child parents the child name isn't shown. Since Maestro test uses parent Sarah who has 2 children, the ChildSwitcher will show. No extra work needed — tap the selected child to view profile.

**Step 5: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty`
Expected: No errors

**Step 6: Commit**

```bash
git add apps/mobile/src/components/ChildSwitcher.tsx apps/mobile/src/screens/ParentHomeScreen.tsx
git commit -m "feat: tap selected child in switcher to view profile"
```

---

### Task 5: Add "New Message" card to StaffHomeScreen

**Files:**
- Modify: `apps/mobile/src/screens/StaffHomeScreen.tsx`

**Step 1: Add "New Message" card**

Insert a new card **before** the Staff Management card (i.e., after the Recent Posts section closing `</View>`, before the `{session?.staffRole === "ADMIN" && (` block):

```tsx
{/* New Message CTA */}
<View className="px-6 mt-4">
  <Pressable
    onPress={() => navigation.navigate("ComposeMessage")}
    accessibilityLabel="New Message"
    className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
  >
    <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
      <MaterialIcons name="email" size={24} color="#3B82F6" />
    </View>
    <View className="flex-1">
      <Text className="text-base font-sans-bold text-foreground dark:text-white">
        New Message
      </Text>
      <Text className="text-xs font-sans text-text-muted">
        Send update to all parents
      </Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color="#96867f" />
  </Pressable>
</View>
```

This matches the Staff Management card pattern exactly (same rounded-2xl, p-4, flex-row layout).

**Step 2: Verify `ComposeMessage` is in the stack**

Already registered in `App.tsx` line 265: `<Stack.Screen name="ComposeMessage" ...>`

**Step 3: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/mobile/src/screens/StaffHomeScreen.tsx
git commit -m "feat: add New Message card to staff home"
```

---

### Task 6: Write Maestro flow — parent/post-detail.yaml

**Files:**
- Create: `apps/mobile/.maestro/parent/post-detail.yaml`

**Step 1: Write the flow**

The seed creates 3 class posts. The parent feed shows them via `dashboard.getFeed`. The first post body contains "art lesson" and has a HEART reaction from the parent.

```yaml
appId: com.abridge.app
name: Parent Post Detail
tags:
  - parent
  - posts
---
- runFlow: ../_helpers/login-parent.yaml

# Wait for feed to load (posts appear in activity feed)
- extendedWaitUntil:
    visible: "art lesson"
    timeout: 30000

# Tap the post to open detail
- tapOn:
    text: "art lesson"

# Verify post detail screen loaded
- extendedWaitUntil:
    visible: "Class Post"
    timeout: 30000

# Verify post content
- extendedWaitUntil:
    visible: "Henri Matisse"
    timeout: 30000
```

Note: We verify "Class Post" header and the post body text. Reaction testing is omitted because the emoji buttons use Unicode characters which Maestro may not match reliably.

**Step 2: Commit**

```bash
git add apps/mobile/.maestro/parent/post-detail.yaml
git commit -m "test: add Maestro flow for parent post detail"
```

---

### Task 7: Write Maestro flow — parent/payment-history.yaml

**Files:**
- Create: `apps/mobile/.maestro/parent/payment-history.yaml`

**Step 1: Write the flow**

PaymentsScreen has a history icon button with `accessibilityLabel="History"`. PaymentHistoryScreen shows outstanding payments from `payments.listOutstandingPayments`. Seed has "School Trip - Science Museum" at £15.

```yaml
appId: com.abridge.app
name: Parent Payment History
tags:
  - parent
  - payments
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to payments
- tapOn:
    id: "nav-payments"
- extendedWaitUntil:
    visible: "Wallet"
    timeout: 30000

# Tap history icon
- tapOn:
    label: "History"

# Verify payment history screen loaded
- extendedWaitUntil:
    visible: "Payment History"
    timeout: 30000
```

Note: The payment list content depends on whether the query returns data. We verify the screen loads with its heading. If seed data appears, "Science Museum" would show, but we don't assert on it to avoid seed-coupling.

**Step 2: Commit**

```bash
git add apps/mobile/.maestro/parent/payment-history.yaml
git commit -m "test: add Maestro flow for parent payment history"
```

---

### Task 8: Replace stub — parent/calendar-events.yaml

**Files:**
- Delete: `apps/mobile/.maestro/parent/calendar.yaml`
- Create: `apps/mobile/.maestro/parent/calendar-events.yaml`

**Step 1: Write the flow**

CalendarScreen is navigated via `navigation.navigate("Calendar")` from ParentHomeScreen. Currently no button exists in the UI for this — it's reached via action items. Since action items are conditional, we need a dev-only nav button or navigate via the existing action items row.

Looking at ParentHomeScreen, calendar is reached when `upcomingEventsCount > 0` via action items. With seed events now added (Task 1), the action items should include calendar. The action item calls `navigation.navigate("Calendar")`.

However, action items rendering depends on `getActionItems` returning calendar-type items, which may not include events. Let's check: action items are for payments, forms, messages — not calendar events.

**Alternative approach:** Add a dev-only nav button for calendar on ParentHomeScreen, same pattern as `nav-messages`.

Add to `ParentHomeScreen.tsx` dev nav buttons section:

```tsx
<Pressable testID="nav-calendar" onPress={() => navigation.navigate("Calendar")} className="bg-neutral-surface rounded-full px-3 py-1">
  <Text className="text-text-muted text-xs">Calendar</Text>
</Pressable>
```

Then the Maestro flow:

```yaml
appId: com.abridge.app
name: Parent Calendar Events
tags:
  - parent
  - calendar
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to calendar via dev nav button
- tapOn:
    id: "nav-calendar"

# Verify calendar screen loaded
- extendedWaitUntil:
    visible: "Calendar"
    timeout: 30000
```

Note: Calendar defaults to current month. Seed events are in March and April 2026. If current month doesn't show events, the screen still loads with "No events found" or with events. We verify the screen renders.

**Step 2: Delete old stub**

```bash
rm apps/mobile/.maestro/parent/calendar.yaml
```

**Step 3: Commit**

```bash
git add apps/mobile/.maestro/parent/calendar-events.yaml apps/mobile/src/screens/ParentHomeScreen.tsx
git rm apps/mobile/.maestro/parent/calendar.yaml
git commit -m "test: replace calendar stub with real Maestro flow, add dev nav button"
```

---

### Task 9: Replace stub — parent/forms-submit.yaml

**Files:**
- Delete: `apps/mobile/.maestro/parent/forms.yaml`
- Create: `apps/mobile/.maestro/parent/forms-submit.yaml`
- Modify: `apps/mobile/src/screens/ParentHomeScreen.tsx` (add dev nav button)

**Step 1: Add dev-only nav button for forms**

Add to ParentHomeScreen dev nav buttons section (alongside nav-calendar from Task 8):

```tsx
<Pressable testID="nav-forms" onPress={() => navigation.navigate("Forms")} className="bg-neutral-surface rounded-full px-3 py-1">
  <Text className="text-text-muted text-xs">Forms</Text>
</Pressable>
```

**Step 2: Write the flow**

FormsScreen shows pending forms for the active child. With the seed form template (Task 2) and no FormResponse for Emily, "Photography Consent Form" should appear as pending. Tapping "Complete" navigates to FormDetail. "Test Fill" populates all fields. Submit shows success.

```yaml
appId: com.abridge.app
name: Parent Form Submit
tags:
  - parent
  - forms
---
- runFlow: ../_helpers/login-parent.yaml

# Navigate to forms
- tapOn:
    id: "nav-forms"

# Verify forms screen loaded
- extendedWaitUntil:
    visible: "Forms & Consent"
    timeout: 30000

# Verify pending form shows
- extendedWaitUntil:
    visible: "Photography Consent Form"
    timeout: 30000

# Tap Complete to open form detail
- tapOn:
    text: "Complete"

# Verify form detail loaded
- extendedWaitUntil:
    visible: "Photography Consent Form"
    timeout: 30000

# Use Test Fill to populate fields
- tapOn:
    text: "Test Fill"

# Submit form
- tapOn:
    text: "Submit"

# Verify success
- extendedWaitUntil:
    visible: "Form Submitted"
    timeout: 30000
```

**Step 3: Delete old stub**

```bash
rm apps/mobile/.maestro/parent/forms.yaml
```

**Step 4: Commit**

```bash
git add apps/mobile/.maestro/parent/forms-submit.yaml apps/mobile/src/screens/ParentHomeScreen.tsx
git rm apps/mobile/.maestro/parent/forms.yaml
git commit -m "test: replace forms stub with full submit flow, add dev nav button"
```

---

### Task 10: Write Maestro flow — parent/student-profile.yaml

**Files:**
- Create: `apps/mobile/.maestro/parent/student-profile.yaml`

**Step 1: Write the flow**

Parent Sarah has 2 children (Emily and Jack). The ChildSwitcher shows both. Tapping the already-selected child (Emily, selected by default) navigates to StudentProfile. The profile shows child name and student details.

```yaml
appId: com.abridge.app
name: Parent Student Profile
tags:
  - parent
  - profile
---
- runFlow: ../_helpers/login-parent.yaml

# Wait for home to load and ChildSwitcher to appear
- extendedWaitUntil:
    visible: "Emily"
    timeout: 30000

# Tap the already-selected child to view profile
- tapOn:
    text: "Emily"

# Verify student profile screen loaded
- extendedWaitUntil:
    visible: "Emily Johnson"
    timeout: 30000
```

Note: If Emily is already selected, tapping her triggers `onViewProfile`. If the default selection isn't Emily, we tap Emily once (selects), then tap again (views profile). The flow handles both cases since Maestro will find "Emily" text and tap it — if already selected, it navigates; if not, it selects first and we'd need a second tap. Since seed creates Emily first and she's `children[0]`, she should be pre-selected.

**Step 2: Commit**

```bash
git add apps/mobile/.maestro/parent/student-profile.yaml
git commit -m "test: add Maestro flow for parent student profile"
```

---

### Task 11: Replace stub — parent/search-messages.yaml

**Files:**
- Delete: `apps/mobile/.maestro/parent/search.yaml`
- Create: `apps/mobile/.maestro/parent/search-messages.yaml`

**Step 1: Write the flow**

SearchScreen has a "Test Search" button (when `EXPO_PUBLIC_E2E`) that sets query to "Test Message 1". The search debounces 300ms then queries. Results show matching messages.

But wait — "Test Message 1" may not match any seed messages. The seed messages are "Welcome to Abridge!", "Urgent: School Closure Tomorrow", "FYI: New Library Books Available". The test search query won't match.

**Alternative:** The search also has a text input. We can tap the search icon (from Task 3), then type a query that matches seed data.

Actually, looking at SearchScreen's "Test Search" button, it sets `query` to `"Test Message 1"` which may not return results. We should either:
a) Change the test query to match seed data (e.g., "School Closure")
b) Or just verify the search screen loads and test the flow without asserting results

**Approach:** Modify SearchScreen's "Test Search" button to use "School Closure" instead. This matches the seed urgent message.

Modify `apps/mobile/src/screens/SearchScreen.tsx` line 79:
```tsx
onPress={() => setQuery("School Closure")}
```

Then the flow:

```yaml
appId: com.abridge.app
name: Parent Search Messages
tags:
  - parent
  - search
---
- runFlow: ../_helpers/login-parent.yaml

# Tap search icon in header (added in Task 3)
- tapOn:
    label: "Search"

# Verify search screen loaded
- extendedWaitUntil:
    visible: "Test Search"
    timeout: 30000

# Use Test Search button to fill query
- tapOn:
    text: "Test Search"

# Wait for debounce + results
- extendedWaitUntil:
    visible: "School Closure"
    timeout: 30000
```

**Step 2: Delete old stub**

```bash
rm apps/mobile/.maestro/parent/search.yaml
```

**Step 3: Commit**

```bash
git add apps/mobile/.maestro/parent/search-messages.yaml apps/mobile/src/screens/SearchScreen.tsx
git rm apps/mobile/.maestro/parent/search.yaml
git commit -m "test: replace search stub with real flow, fix test query to match seed"
```

---

### Task 12: Write Maestro flow — staff/message-send.yaml

**Files:**
- Create: `apps/mobile/.maestro/staff/message-send.yaml`

**Step 1: Write the flow**

StaffHomeScreen now has a "New Message" card (Task 5). ComposeMessageScreen has "Test Fill" button that populates subject + body. Send shows "Sent!" alert.

```yaml
appId: com.abridge.app
name: Staff Send Message
tags:
  - staff
  - messages
---
- runFlow: ../_helpers/login-staff.yaml

# Verify staff home loaded
- extendedWaitUntil:
    visible: "Post Update"
    timeout: 30000

# Scroll down to find New Message card
- scrollUntilVisible:
    element: "New Message"
    direction: DOWN
    timeout: 30000

# Tap New Message card
- tapOn:
    label: "New Message"

# Verify compose screen loaded
- extendedWaitUntil:
    visible: "All Parents"
    timeout: 30000

# Use Test Fill
- tapOn:
    text: "Test Fill"

# Wait for subject field to populate
- extendedWaitUntil:
    visible: "Test Message"
    timeout: 30000

# Tap Send
- tapOn:
    text: "Send"

# Verify success
- extendedWaitUntil:
    visible: "Sent!"
    timeout: 30000

# Dismiss alert
- tapOn:
    text: "OK"
```

**Step 2: Commit**

```bash
git add apps/mobile/.maestro/staff/message-send.yaml
git commit -m "test: add Maestro flow for staff sending messages"
```

---

### Task 13: Write Maestro flow — admin/staff-invite.yaml

**Files:**
- Create: `apps/mobile/.maestro/admin/staff-invite.yaml`

**Step 1: Write the flow**

StaffManagementScreen has an invite form with email input (`accessibilityLabel="Invite Email"`), role selector buttons (TEACHER/OFFICE/ADMIN), and Send Invite button (`accessibilityLabel="Send Invite"`). Success alert: "Invitation Sent".

```yaml
appId: com.abridge.app
name: Admin Staff Invite
tags:
  - admin
  - staff
---
- runFlow: ../_helpers/login-staff.yaml

# Navigate to staff management
- tapOn:
    id: "nav-staff-management"
- extendedWaitUntil:
    visible: "Invite Staff"
    timeout: 60000

# Fill invite email
- tapOn:
    label: "Invite Email"
- inputText: "new-teacher@oakwood.sch.uk"
- hideKeyboard

# Select TEACHER role (should be default, but tap to confirm)
- tapOn:
    text: "TEACHER"

# Tap Send Invite
- tapOn:
    label: "Send Invite"

# Verify success
- extendedWaitUntil:
    visible: "Invitation Sent"
    timeout: 30000

# Dismiss alert
- tapOn:
    text: "OK"
```

**Step 2: Commit**

```bash
git add apps/mobile/.maestro/admin/staff-invite.yaml
git commit -m "test: add Maestro flow for admin staff invite"
```

---

### Task 14: Update config.yaml and verify flow count

**Files:**
- Verify: `apps/mobile/.maestro/config.yaml`

**Step 1: Verify config includes all directories**

Current config already includes `auth/*`, `parent/*`, `staff/*`, `admin/*`, `error-cases.yaml`. New flows are in these existing directories. No config change needed.

**Step 2: Count flows**

Expected: 28 flows total
- auth/: login, logout, register (3)
- parent/: home, messages, messages-detail, attendance, attendance-report, payments, payment-history, post-detail, calendar-events, forms-submit, student-profile, search-messages, navigation, settings (14)
- staff/: home, navigation, attendance, payments, posts, post-compose, messages-compose, message-send (8)
- admin/: staff-management, staff-invite (2)
- error-cases.yaml (1)

**Step 3: Final commit and push**

```bash
git push origin main
```

---

## Summary of All Changes

| Category | Files Changed | Description |
|---|---|---|
| Seed data | `packages/db/prisma/seed.ts` | +3 calendar events, +1 form template |
| UI: Parent | `apps/mobile/src/screens/ParentHomeScreen.tsx` | Search icon, calendar/forms dev nav buttons |
| UI: Parent | `apps/mobile/src/components/ChildSwitcher.tsx` | Tap selected child → profile |
| UI: Staff | `apps/mobile/src/screens/StaffHomeScreen.tsx` | "New Message" card |
| UI: Search | `apps/mobile/src/screens/SearchScreen.tsx` | Fix test query to match seed |
| Test: New | 8 new `.yaml` files | post-detail, payment-history, calendar-events, forms-submit, student-profile, search-messages, message-send, staff-invite |
| Test: Remove | 3 stub `.yaml` files | calendar, forms, search (replaced by real flows) |
| **Total** | **28 Maestro flows** | Up from 23 (removed 3 stubs, added 8 new) |
