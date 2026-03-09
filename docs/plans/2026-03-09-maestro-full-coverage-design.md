# Maestro Full Test Coverage — Design

## Goal

Achieve 100% screen coverage in mobile e2e tests. Every screen reachable by a real user should have at least one Maestro flow exercising its primary journey.

## Current State

- 23 Maestro flows covering 17/21 screens (81%)
- 3 stub flows (calendar, forms, search) that only verify home loads
- 4 screens completely untested: ComposeMessage, PaymentHistory, StudentProfile, PostDetail
- 3 screens unreachable from UI: Search, ComposeMessage, StudentProfile

## Changes

### 1. Seed Data Additions

Add to `packages/db/prisma/seed.ts`:

**Calendar events (3):**
- "Spring Term Ends" — TERM_DATE, allDay, 2026-04-10
- "Year 2 Trip to Science Museum" — EVENT, 2026-03-20
- "Sports Day" — EVENT, allDay, 2026-04-25

**Form template (1) + pending form assignment:**
- "Photography Consent Form" with fields:
  - `consent` (toggle/boolean): "I give consent for my child to be photographed"
  - `signature` (text): "Parent/Guardian signature"
- Assigned as pending for Emily Johnson (no FormResponse exists = pending)

### 2. UI Additions (Real Elements)

**ParentHomeScreen — search icon:**
- Add magnifying glass icon button in header (next to Settings)
- `navigation.navigate("Search")`
- testID: not needed, tap by accessibilityLabel "Search"

**ParentHomeScreen — child avatar tap:**
- Make child name/avatar in ChildSwitcher tappable
- `navigation.navigate("StudentProfile", { childId })`
- Long-press or dedicated info icon on the child switcher item

**StaffHomeScreen — "New Message" card:**
- Add card below "Post Update" CTA, similar style to "Staff Management" card
- Icon: email, purple theme
- Title: "New Message"
- Subtitle: "Send update to all parents"
- `navigation.navigate("ComposeMessage")`

**PaymentsScreen — "View History" link:**
- Add "History" text link in header or as a section link
- `navigation.navigate("PaymentHistory")`

### 3. New Maestro Flows (8)

| File | Name | Journey |
|---|---|---|
| `parent/post-detail.yaml` | Parent Post Detail | Feed → tap post → verify body + reactions |
| `parent/payment-history.yaml` | Parent Payment History | Payments → View History → verify list |
| `parent/calendar-events.yaml` | Parent Calendar Events | Tap calendar or month nav → verify seeded events |
| `parent/forms-submit.yaml` | Parent Form Submit | Forms → tap pending → fill fields → submit |
| `parent/student-profile.yaml` | Parent Student Profile | Tap child → verify name, year, attendance |
| `parent/search-messages.yaml` | Parent Search Messages | Tap search → type query → verify results |
| `staff/message-send.yaml` | Staff Send Message | New Message card → Test Fill → Send → verify alert |
| `admin/staff-invite.yaml` | Admin Staff Invite | Staff Mgmt → fill email/role → Send Invite → verify alert |

### 4. Stub Replacements

These existing stubs become real tests:
- `parent/calendar.yaml` → replaced by `parent/calendar-events.yaml`
- `parent/forms.yaml` → replaced by `parent/forms-submit.yaml`
- `parent/search.yaml` → replaced by `parent/search-messages.yaml`

### 5. Final Flow Count

- Current: 23 flows (20 real + 3 stubs)
- Remove: 3 stubs
- Add: 8 new flows
- **Final: 28 flows**

## Risks

| Risk | Mitigation |
|---|---|
| Calendar shows current month, events may be in different month | Seed events span multiple months; test navigates months if needed |
| Post tap flaky on iOS | Use text-based `tapOn` with `extendedWaitUntil`, not coordinate taps |
| Search debounce needs wait | `extendedWaitUntil` after `inputText` for results to appear |
| Staff invite email validation | Use realistic email: `test-invite@example.com` |
| Form submit unique constraint | Use `upsert` pattern or check for existing response in seed |

## Implementation Order

1. Seed data (events + form template)
2. ParentHomeScreen UI (search icon + child tap)
3. StaffHomeScreen UI (New Message card)
4. PaymentsScreen UI (View History link)
5. Write 8 Maestro flows + remove 3 stubs
6. Commit and push, monitor CI
