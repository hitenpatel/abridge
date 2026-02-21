# PRD: Comprehensive E2E Test Coverage

**Date:** 2026-02-21
**Status:** Draft
**Scope:** Web (Playwright) + Mobile (Maestro) — all roles

---

## Overview

SchoolConnect has 25 existing E2E journey specs. This PRD identifies **all gaps** and defines acceptance criteria with exact selectors for every scenario needed to achieve full coverage across Parent, Staff, and Admin roles on both web and mobile platforms.

### Selector Conventions

| Platform | Format | Example |
|----------|--------|---------|
| Web | `[data-testid='X']` | `[data-testid='email-input']` |
| Web (complex) | CSS selector | `[data-testid=class-post-card]:first-of-type` |
| Web (navigation) | URL path | `/dashboard/messages` |
| Mobile | Plain text (accessibility label) | `"Inbox"` |
| Mobile (emoji) | Unicode | `"\u2764\uFE0F"` |

### Existing Test IDs (Web)

| Page | Test IDs |
|------|----------|
| Login | `email-input`, `password-input`, `login-button` |
| Dashboard layout | `{name}-link` (dynamic), `user-menu-trigger`, `logout-button` |
| Dashboard page | `dashboard-view` |
| Messages | `search-input`, `messages-list`, `message-row`, `message-detail` |
| Payments | `payments-list`, `payment-item-{n}`, `pay-button` |
| Attendance | `attendance-view` |
| Compose post | `compose-post-form`, `post-body-input`, `submit-post-button` |
| Forms | `form-item` |
| Post detail | `post-detail` |
| Settings | `settings-view` |
| Feed components | `activity-feed`, `class-post-card`, `reaction-{emoji}` |

### Existing Accessibility Labels (Mobile)

| Screen | Labels |
|--------|--------|
| Tab bar | `"Home"`, `"Inbox"`, `"Attendance"`, `"Payments"`, `"Forms"`, `"Calendar"` |
| Parent home | `"Settings"`, `"Log Out"` |
| Staff home | `"Settings"`, `"Log Out"` |

### Legend

- **EXISTS** = journey spec already written
- **NEW** = needs to be created
- **NEW-TESTID** = new `data-testid` / `accessibilityLabel` must be added to source code
- **NEW-FIXTURE** = new seed fixture needed in `factories.ts`

---

## 1. Authentication & Onboarding

### Existing Journeys
- `login-parent` (A-1) — smoke
- `login-staff` (A-2) — smoke
- `logout` (A-3) — smoke
- `switch-role` (A-4) — regression, mobile only

### New Journeys

#### A-5: Register new parent account
- **Tags:** `smoke`, `auth`, `unauthenticated`, `parent`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `clean-db` (no existing user for email); State: `unauthenticated`
- **NEW-TESTID required:**
  - Web: `register-name-input`, `register-email-input`, `register-password-input`, `register-button` on `/register` page
  - Mobile: `accessibilityLabel="Name"`, `"Email"`, `"Password"`, `"Create Account"` on RegisterScreen
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: register
      selectors:
        web: "/register"
        mobile: "Create Account"  # link on login screen
    - action: fill
      target: name-input
      selectors:
        web: "[data-testid='register-name-input']"
        mobile: "Name"
      value: "Test Parent"
    - action: fill
      target: email-input
      selectors:
        web: "[data-testid='register-email-input']"
        mobile: "Email"
      value: "newparent@test.com"
    - action: fill
      target: password-input
      selectors:
        web: "[data-testid='register-password-input']"
        mobile: "Password"
      value: "testpass123"
    - action: tap
      target: register-button
      selectors:
        web: "[data-testid='register-button']"
        mobile: "Create Account"
  ```
- **mobileTestButton:** `"Test Fill"` (if Expo Go)
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Home"
  ```
- **Verify:** User + Account records created with `providerId: "credential"`

---

#### A-6: Register via staff invitation link
- **Tags:** `auth`, `unauthenticated`, `staff`, `regression`
- **Platforms:** Web only
- **Preconditions:** Seed: `pending-invitation` (NEW-FIXTURE — school + invitation with valid token); State: `unauthenticated`
- **NEW-TESTID required:**
  - Web: `invitation-school-name`, `register-name-input`, `register-password-input`, `register-button` on `/register?token=X`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: register-with-token
      selectors:
        web: "/register?token=test-invitation-token"
        mobile: null  # web only
    - action: wait
      target: invitation-details
      selectors:
        web: "[data-testid='invitation-school-name']"
        mobile: null
    - action: fill
      target: name-input
      selectors:
        web: "[data-testid='register-name-input']"
        mobile: null
      value: "New Staff"
    - action: fill
      target: password-input
      selectors:
        web: "[data-testid='register-password-input']"
        mobile: null
      value: "testpass123"
    - action: tap
      target: register-button
      selectors:
        web: "[data-testid='register-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Home"
  ```
- **Verify:** StaffMember created with correct role, Invitation.acceptedAt set

---

#### A-7: Login with invalid credentials
- **Tags:** `auth`, `unauthenticated`, `error`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school`; State: `unauthenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: login
      selectors:
        web: "/"
        mobile: "/"
    - action: fill
      target: email-input
      selectors:
        web: "[data-testid='email-input']"
        mobile: "Email"
      value: "parent@test.com"
    - action: fill
      target: password-input
      selectors:
        web: "[data-testid='password-input']"
        mobile: "Password"
      value: "wrongpassword"
    - action: tap
      target: login-button
      selectors:
        web: "[data-testid='login-button']"
        mobile: "Sign In"
  ```
- **NEW-TESTID required:**
  - Web: `login-error` on error message element
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Invalid email or password"
      mobileText: "Invalid email or password"
    - type: not-visible
      text: "Home"
  ```

---

#### A-8: Login with unregistered email
- **Tags:** `auth`, `unauthenticated`, `error`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `clean-db`; State: `unauthenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: login
      selectors:
        web: "/"
        mobile: "/"
    - action: fill
      target: email-input
      selectors:
        web: "[data-testid='email-input']"
        mobile: "Email"
      value: "nobody@test.com"
    - action: fill
      target: password-input
      selectors:
        web: "[data-testid='password-input']"
        mobile: "Password"
      value: "anypassword"
    - action: tap
      target: login-button
      selectors:
        web: "[data-testid='login-button']"
        mobile: "Sign In"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Invalid email or password"  # generic, no info leak
    - type: not-visible
      text: "Home"
  ```

---

#### A-9: Register with already-used email
- **Tags:** `auth`, `unauthenticated`, `error`
- **Platforms:** Web
- **Preconditions:** Seed: `parent-with-school`; State: `unauthenticated`
- **NEW-TESTID required:**
  - Web: `register-error` on error message element
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: register
      selectors:
        web: "/register"
        mobile: null
    - action: fill
      target: name-input
      selectors:
        web: "[data-testid='register-name-input']"
        mobile: null
      value: "Duplicate User"
    - action: fill
      target: email-input
      selectors:
        web: "[data-testid='register-email-input']"
        mobile: null
      value: "parent@test.com"
    - action: fill
      target: password-input
      selectors:
        web: "[data-testid='register-password-input']"
        mobile: null
      value: "testpass123"
    - action: tap
      target: register-button
      selectors:
        web: "[data-testid='register-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "already"
  ```

---

#### A-10: Accept expired invitation token
- **Tags:** `auth`, `unauthenticated`, `error`
- **Platforms:** Web
- **Preconditions:** Seed: `expired-invitation` (NEW-FIXTURE — invitation with `expiresAt` in past); State: `unauthenticated`
- **NEW-TESTID required:**
  - Web: `invitation-error` on error message element
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: register-with-expired-token
      selectors:
        web: "/register?token=expired-token"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "expired"
    - type: not-visible
      text: "Create Account"
  ```

---

## 2. Parent Journeys — Dashboard & Feed

### Existing Journeys
- `parent-home` (P-D1) — smoke
- `view-feed-posts` (P-D2) — smoke
- `view-post-detail` (P-D3) — regression
- `react-to-post` (P-D4) — regression

### New Journeys

#### P-D5: Switch between children on dashboard
- **Tags:** `parent`, `authenticated`, `dashboard`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-multiple-children` (NEW-FIXTURE — parent with 2 children in different classes, each with distinct posts); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `child-switcher`, `child-option-{childId}` on child selector component
  - Mobile: `accessibilityLabel="Switch Child"` on child switcher, child name text tappable
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: feed
      selectors:
        web: "[data-testid='activity-feed']"
        mobile: "activity"
    - action: tap
      target: child-switcher
      selectors:
        web: "[data-testid='child-switcher']"
        mobile: "Switch Child"
    - action: tap
      target: second-child
      selectors:
        web: "[data-testid='child-option-2']"
        mobile: "Child Two"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Child Two"
    - type: not-visible
      text: "Child One post"
  ```

---

#### P-D7: Remove a reaction from a post
- **Tags:** `parent`, `authenticated`, `posts`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-reacted-post` (NEW-FIXTURE — parent has existing HEART reaction on a post); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: feed
      selectors:
        web: "[data-testid='activity-feed']"
        mobile: "activity"
    - action: tap
      target: heart-reaction
      selectors:
        web: "[data-testid=class-post-card]:first-of-type [data-testid=reaction-HEART]"
        mobile: "\u2764\uFE0F"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "0"  # reaction count decremented
  ```

---

#### P-D8: Action items row shows pending items
- **Tags:** `parent`, `authenticated`, `dashboard`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-action-items` (NEW-FIXTURE — child with 1 pending form, 1 outstanding payment, 1 unread urgent message); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `action-items-row`, `action-item-payments`, `action-item-forms`, `action-item-messages`
  - Mobile: `accessibilityLabel="Action Items"`, `"Payments Due"`, `"Forms Pending"`, `"Unread Messages"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: action-items
      selectors:
        web: "[data-testid='action-items-row']"
        mobile: "Action Items"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "payment"
      mobileText: "Payments Due"
    - type: visible
      text: "form"
      mobileText: "Forms Pending"
  ```

---

#### P-D9: Tap action item navigates to correct section
- **Tags:** `parent`, `authenticated`, `dashboard`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-action-items`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: action-items
      selectors:
        web: "[data-testid='action-items-row']"
        mobile: "Action Items"
    - action: tap
      target: payment-action
      selectors:
        web: "[data-testid='action-item-payments']"
        mobile: "Payments Due"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Payments"
  ```

---

#### P-D10: Feed infinite scroll / pagination
- **Tags:** `parent`, `authenticated`, `dashboard`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-many-posts` (NEW-FIXTURE — child with 15+ class posts); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: feed
      selectors:
        web: "[data-testid='activity-feed']"
        mobile: "activity"
    - action: scroll
      target: feed-bottom
      selectors:
        web: "[data-testid='activity-feed']"
        mobile: "Post 15"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Post 15"
  ```

---

#### P-D11: Dashboard with no children linked
- **Tags:** `parent`, `authenticated`, `dashboard`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-no-children` (NEW-FIXTURE — user account only, no ParentChild records); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `empty-dashboard` on empty state component
  - Mobile: `accessibilityLabel="No Children"` on empty state
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No children"
      mobileText: "No children"
  ```

---

#### P-D12: Dashboard with empty feed
- **Tags:** `parent`, `authenticated`, `dashboard`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school` (child exists but no posts/messages/events); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: dashboard-view
      selectors:
        web: "[data-testid='dashboard-view']"
        mobile: "Home"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No activity yet"
      mobileText: "No activity yet"
  ```

---

## 3. Parent Journeys — Messages

### Existing Journeys
- `view-messages` (P-M1) — smoke
- `search-messages` (P-M2) — regression
- `view-message-detail` (P-M3) — regression

### New Journeys

#### P-M4: Message marked as read on open
- **Tags:** `parent`, `authenticated`, `messaging`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-messages`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `unread-badge` on unread indicator dot/badge
  - Mobile: N/A (visual indicator, use text count)
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
    - action: wait
      target: messages-list
      selectors:
        web: "[data-testid='messages-list']"
        mobile: "Test Message 1"
    - action: tap
      target: first-message
      selectors:
        web: "[data-testid='message-row']:first-of-type"
        mobile: "Test Message 1"
    - action: wait
      target: message-detail
      selectors:
        web: "[data-testid='message-detail']"
        mobile: "This is test message"
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: not-visible
      target: unread-on-first
      text: "unread"  # unread indicator gone for opened message
  ```

---

#### P-M6: Filter messages by category
- **Tags:** `parent`, `authenticated`, `messaging`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-categorized-messages` (NEW-FIXTURE — messages across URGENT, STANDARD, FYI categories); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `filter-urgent`, `filter-standard`, `filter-fyi` on filter tabs/buttons
  - Mobile: `accessibilityLabel="Urgent"`, `"Standard"`, `"FYI"` on filter buttons
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
    - action: wait
      target: messages-list
      selectors:
        web: "[data-testid='messages-list']"
        mobile: "Messages"
    - action: tap
      target: urgent-filter
      selectors:
        web: "[data-testid='filter-urgent']"
        mobile: "Urgent"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Urgent Message"
    - type: not-visible
      text: "FYI Message"
  ```

---

#### P-M8: Empty inbox state
- **Tags:** `parent`, `authenticated`, `messaging`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school` (no messages); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `empty-messages` on empty state component
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No messages"
      mobileText: "No messages"
  ```

---

#### P-M9: Search with no results
- **Tags:** `parent`, `authenticated`, `messaging`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-messages`; State: `authenticated`
- **mobileTestButton:** `"Test Search"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
    - action: fill
      target: search-input
      selectors:
        web: "[data-testid='search-input']"
        mobile: "Search"
      value: "xyznonexistent"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No messages found"
      mobileText: "No results"
  ```

---

#### P-M10: Message pagination
- **Tags:** `parent`, `authenticated`, `messaging`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-many-messages` (NEW-FIXTURE — 20+ messages); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
    - action: wait
      target: messages-list
      selectors:
        web: "[data-testid='messages-list']"
        mobile: "Test Message 1"
    - action: scroll
      target: messages-bottom
      selectors:
        web: "[data-testid='messages-list']"
        mobile: "Test Message 20"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Test Message 20"
  ```

---

## 4. Parent Journeys — Payments

### Existing Journeys
- `view-payments` (P-P1) — smoke
- `make-payment` (P-P2) — mobile only

### New Journeys

#### P-P3: Initiate payment on web
- **Tags:** `parent`, `authenticated`, `payments`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `parent-with-payments`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments"
        mobile: null
    - action: wait
      target: payments-list
      selectors:
        web: "[data-testid='payments-list']"
        mobile: null
    - action: tap
      target: payment-item
      selectors:
        web: "[data-testid='payment-item-1']"
        mobile: null
    - action: tap
      target: pay-button
      selectors:
        web: "[data-testid='pay-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Payment"
  ```

---

#### P-P5: View payment history
- **Tags:** `parent`, `authenticated`, `payments`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-payment-history` (NEW-FIXTURE — completed payments with receiptNumber); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `payment-history-list`, `payment-history-item`, `history-button` on payments page
  - Mobile: `accessibilityLabel="History"`, `"Payment History"` on history screen
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments"
        mobile: "Payments"
    - action: tap
      target: history-button
      selectors:
        web: "[data-testid='history-button']"
        mobile: "History"
    - action: wait
      target: history-list
      selectors:
        web: "[data-testid='payment-history-list']"
        mobile: "Payment History"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "£10.00"
  ```

---

#### P-P6: View payment receipt
- **Tags:** `parent`, `authenticated`, `payments`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-payment-history`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `receipt-view`, `receipt-number` on receipt component
  - Mobile: `accessibilityLabel="Receipt"` on receipt screen
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments/history"
        mobile: "Payments"
    - action: tap
      target: history-button
      selectors:
        web: null  # already on history page
        mobile: "History"
    - action: tap
      target: completed-payment
      selectors:
        web: "[data-testid='payment-history-item']:first-of-type"
        mobile: "School Expenses"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Receipt"
    - type: visible
      text: "£10.00"
  ```

---

#### P-P7: Cart checkout (multiple items)
- **Tags:** `parent`, `authenticated`, `payments`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-payments` (3 items); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `select-all-button` or `cart-checkout-button` on payments page
  - Mobile: `accessibilityLabel="Pay All"` on bulk pay button
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments"
        mobile: "Payments"
    - action: wait
      target: payments-list
      selectors:
        web: "[data-testid='payments-list']"
        mobile: "School Expenses"
    - action: tap
      target: pay-all
      selectors:
        web: "[data-testid='cart-checkout-button']"
        mobile: "Pay All"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "£60.00"  # 1000+2000+3000 pence = £60
  ```

---

#### P-P8: No outstanding payments (empty state)
- **Tags:** `parent`, `authenticated`, `payments`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school` (no payment items); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments"
        mobile: "Payments"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No payments"
      mobileText: "No payments"
  ```

---

#### P-P11: Payment amounts displayed in pounds (not pence)
- **Tags:** `parent`, `authenticated`, `payments`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-payments` (items at 1000, 2000, 3000 pence); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments"
        mobile: "Payments"
    - action: wait
      target: payments-list
      selectors:
        web: "[data-testid='payments-list']"
        mobile: "School Expenses"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "£10.00"
    - type: not-visible
      text: "1000"
  ```

---

## 5. Parent Journeys — Attendance

### Existing Journeys
- `view-attendance` (P-A1) — smoke

### New Journeys

#### P-A2: Report absence (single day)
- **Tags:** `parent`, `authenticated`, `attendance`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school` (attendance enabled); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `report-absence-button`, `absence-date-input`, `absence-reason-input`, `absence-submit`
  - Mobile: `accessibilityLabel="Report Absence"`, `"Date"`, `"Reason"`, `"Submit"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: attendance
      selectors:
        web: "/dashboard/attendance"
        mobile: "Attendance"
    - action: wait
      target: attendance-view
      selectors:
        web: "[data-testid='attendance-view']"
        mobile: "Attendance"
    - action: tap
      target: report-absence
      selectors:
        web: "[data-testid='report-absence-button']"
        mobile: "Report Absence"
    - action: fill
      target: reason
      selectors:
        web: "[data-testid='absence-reason-input']"
        mobile: "Reason"
      value: "Doctor appointment"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='absence-submit']"
        mobile: "Submit"
  ```
- **mobileTestButton:** `"Test Fill"`
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Absence reported"
      mobileText: "Absence reported"
  ```
- **Verify:** AttendanceRecord created with `ABSENT_AUTHORISED` for AM + PM sessions

---

#### P-A4: Switch children on attendance view
- **Tags:** `parent`, `authenticated`, `attendance`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-multiple-children` (NEW-FIXTURE); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `attendance-child-selector` on child dropdown
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: attendance
      selectors:
        web: "/dashboard/attendance"
        mobile: "Attendance"
    - action: wait
      target: attendance-view
      selectors:
        web: "[data-testid='attendance-view']"
        mobile: "Attendance"
    - action: tap
      target: child-selector
      selectors:
        web: "[data-testid='attendance-child-selector']"
        mobile: "Switch Child"
    - action: tap
      target: second-child
      selectors:
        web: "[data-testid='child-option-2']"
        mobile: "Child Two"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Child Two"
  ```

---

#### P-A6: Attendance when feature disabled
- **Tags:** `parent`, `authenticated`, `attendance`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-disabled-attendance` (NEW-FIXTURE — school with `attendanceEnabled: false`); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: attendance
      selectors:
        web: "/dashboard/attendance"
        mobile: "Attendance"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "not available"
      mobileText: "not available"
  ```

---

#### P-A8: Report absence with reason categories (Mobile)
- **Tags:** `parent`, `authenticated`, `attendance`, `regression`
- **Platforms:** Mobile only
- **Preconditions:** Seed: `parent-with-school`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: attendance
      selectors:
        web: null
        mobile: "Attendance"
    - action: tap
      target: report-absence
      selectors:
        web: null
        mobile: "Report Absence"
    - action: tap
      target: sick-reason
      selectors:
        web: null
        mobile: "Sick"
    - action: tap
      target: submit
      selectors:
        web: null
        mobile: "Submit"
  ```
- **mobileTestButton:** `"Test Fill"`
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Absence reported"
  ```

---

## 6. Parent Journeys — Forms

### Existing Journeys
- `submit-form` (P-F1) — mobile only

### New Journeys

#### P-F2: View pending forms by child
- **Tags:** `parent`, `authenticated`, `forms`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-pending-forms` (NEW-FIXTURE — active FormTemplate + child, no FormResponse); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `forms-list`, `pending-forms-section`, `completed-forms-section`
  - Mobile: `accessibilityLabel="Pending Forms"`, `"Completed Forms"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: forms
      selectors:
        web: "/dashboard/forms"
        mobile: "Forms"
    - action: wait
      target: forms-list
      selectors:
        web: "[data-testid='forms-list']"
        mobile: "Forms"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Permission Form"
    - type: visible
      text: "Action Required"
      mobileText: "Action Required"
  ```

---

#### P-F3: Submit form on web
- **Tags:** `parent`, `authenticated`, `forms`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `parent-with-pending-forms`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `form-field-{fieldId}` on each dynamic form field, `form-submit-button`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: forms
      selectors:
        web: "/dashboard/forms"
        mobile: null
    - action: tap
      target: form-item
      selectors:
        web: "[data-testid='form-item']"
        mobile: null
    - action: fill
      target: first-field
      selectors:
        web: "[data-testid='form-field-1']"
        mobile: null
      value: "Yes"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='form-submit-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "submitted"
  ```
- **Verify:** FormResponse record created with correct `templateId`, `childId`, `parentId`

---

#### P-F4: Submit form with signature
- **Tags:** `parent`, `authenticated`, `forms`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-signature-form` (NEW-FIXTURE — FormTemplate with signature-required field); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `signature-canvas`, `signature-clear-button`
  - Mobile: `accessibilityLabel="Sign Here"`, `"Clear Signature"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: forms
      selectors:
        web: "/dashboard/forms"
        mobile: "Forms"
    - action: tap
      target: form-item
      selectors:
        web: "[data-testid='form-item']"
        mobile: "Consent Form"
    - action: fill
      target: first-field
      selectors:
        web: "[data-testid='form-field-1']"
        mobile: "Field"
      value: "Yes"
    - action: tap
      target: signature-area
      selectors:
        web: "[data-testid='signature-canvas']"
        mobile: "Sign Here"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='form-submit-button']"
        mobile: "Submit"
  ```
- **mobileTestButton:** `"Test Fill"`
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "submitted"
  ```
- **Verify:** FormResponse.signature contains Base64 string

---

#### P-F8: No pending forms (empty state)
- **Tags:** `parent`, `authenticated`, `forms`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school` (no FormTemplates); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: forms
      selectors:
        web: "/dashboard/forms"
        mobile: "Forms"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No forms"
      mobileText: "No forms"
  ```

---

## 7. Parent Journeys — Calendar

### Existing Journeys
None.

### New Journeys

#### P-C1: View calendar events
- **Tags:** `smoke`, `parent`, `authenticated`, `calendar`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-calendar-events` (NEW-FIXTURE — school with TERM_DATE, EVENT, CLUB events); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `calendar-view`, `calendar-event` on calendar page and event items
  - Mobile: `accessibilityLabel="Calendar"` (already exists on tab)
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: calendar
      selectors:
        web: "/dashboard/calendar"
        mobile: "Calendar"
    - action: wait
      target: calendar-view
      selectors:
        web: "[data-testid='calendar-view']"
        mobile: "Calendar"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Sports Day"
    - type: visible
      text: "Half Term"
  ```

---

#### P-C2: Filter events by category
- **Tags:** `parent`, `authenticated`, `calendar`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-calendar-events`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `calendar-filter-club`, `calendar-filter-event`, etc.
  - Mobile: `accessibilityLabel="Clubs"`, `"Events"`, etc.
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: calendar
      selectors:
        web: "/dashboard/calendar"
        mobile: "Calendar"
    - action: tap
      target: club-filter
      selectors:
        web: "[data-testid='calendar-filter-club']"
        mobile: "Clubs"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Chess Club"
    - type: not-visible
      text: "Sports Day"
  ```

---

#### P-C4: Calendar with no events
- **Tags:** `parent`, `authenticated`, `calendar`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school` (no events); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: calendar
      selectors:
        web: "/dashboard/calendar"
        mobile: "Calendar"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "No events"
      mobileText: "No events"
  ```

---

## 8. Parent Journeys — Settings

### Existing Journeys
- `view-parent-settings` (P-S1) — navigation only

### New Journeys

#### P-S2: Update profile name
- **Tags:** `parent`, `authenticated`, `settings`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `profile-name-input`, `profile-save-button`, `profile-success` on settings page
  - Mobile: `accessibilityLabel="Name"`, `"Save Profile"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: "Settings"
    - action: wait
      target: settings-view
      selectors:
        web: "[data-testid='settings-view']"
        mobile: "Profile"
    - action: fill
      target: name-input
      selectors:
        web: "[data-testid='profile-name-input']"
        mobile: "Name"
      value: "Updated Name"
    - action: tap
      target: save
      selectors:
        web: "[data-testid='profile-save-button']"
        mobile: "Save Profile"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Updated Name"
  ```

---

#### P-S4: Toggle notification channels
- **Tags:** `parent`, `authenticated`, `settings`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `toggle-push`, `toggle-sms`, `toggle-email`, `notifications-save-button`
  - Mobile: `accessibilityLabel="Push Notifications"`, `"SMS"`, `"Email"`, `"Save Notifications"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: "Settings"
    - action: tap
      target: sms-toggle
      selectors:
        web: "[data-testid='toggle-sms']"
        mobile: "SMS"
    - action: tap
      target: save
      selectors:
        web: "[data-testid='notifications-save-button']"
        mobile: "Save Notifications"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "saved"
      mobileText: "Saved"
  ```

---

#### P-S5: Set quiet hours
- **Tags:** `parent`, `authenticated`, `settings`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-school`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `quiet-start-input`, `quiet-end-input`
  - Mobile: `accessibilityLabel="Quiet Start"`, `"Quiet End"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: "Settings"
    - action: fill
      target: quiet-start
      selectors:
        web: "[data-testid='quiet-start-input']"
        mobile: "Quiet Start"
      value: "22:00"
    - action: fill
      target: quiet-end
      selectors:
        web: "[data-testid='quiet-end-input']"
        mobile: "Quiet End"
      value: "07:00"
    - action: tap
      target: save
      selectors:
        web: "[data-testid='notifications-save-button']"
        mobile: "Save Notifications"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "saved"
  ```

---

## 9. Staff Journeys — Dashboard

### Existing Journeys
- `staff-home` (S-D1) — smoke

### New Journeys

#### S-D2: Staff dashboard shows quick stats
- **Tags:** `staff`, `authenticated`, `dashboard`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-messages` (provides messages for stats); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `staff-stats-messages`, `staff-stats-attendance`, `staff-stats-events`
  - Mobile: N/A (text-based rendering)
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: dashboard-view
      selectors:
        web: "[data-testid='dashboard-view']"
        mobile: "Home"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Messages"
    - type: visible
      text: "Attendance"
  ```

---

#### S-D3: Staff view recent posts on dashboard
- **Tags:** `staff`, `authenticated`, `dashboard`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-posts`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: dashboard-view
      selectors:
        web: "[data-testid='dashboard-view']"
        mobile: "Home"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Staff post 1"
  ```

---

## 10. Staff Journeys — Compose Messages

### Existing Journeys
- `compose-message` — mobile only (skips web)

### New Journeys

#### S-M1: Compose message on web
- **Tags:** `staff`, `authenticated`, `messaging`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `message-subject-input`, `message-body-input`, `message-category-select`, `message-send-button`, `message-recipients-select` on `/dashboard/messages/new`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: compose-message
      selectors:
        web: "/dashboard/messages/new"
        mobile: null
    - action: fill
      target: subject
      selectors:
        web: "[data-testid='message-subject-input']"
        mobile: null
      value: "School Trip Reminder"
    - action: fill
      target: body
      selectors:
        web: "[data-testid='message-body-input']"
        mobile: null
      value: "Please remember to bring packed lunch for the trip tomorrow."
    - action: tap
      target: send-button
      selectors:
        web: "[data-testid='message-send-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Message sent"
  ```

---

#### S-M2: View sent messages (staff)
- **Tags:** `staff`, `authenticated`, `messaging`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-messages`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `sent-messages-list`, `sent-message-row` on staff messages view
  - Mobile: `accessibilityLabel="Sent"` on tab/filter
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Inbox"
    - action: wait
      target: messages-list
      selectors:
        web: "[data-testid='messages-list']"
        mobile: "Test Message 1"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Test Message 1"
  ```

---

#### S-M3: View staff messages on web (currently mobile-only)
- **Tags:** `staff`, `authenticated`, `messaging`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-messages`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: null
    - action: wait
      target: messages-list
      selectors:
        web: "[data-testid='messages-list']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Test Message 1"
  ```
- **Note:** Removes `skipPlatforms: [web]` from existing `view-staff-messages`

---

## 11. Staff Journeys — Compose Posts

### Existing Journeys
- `compose-post` — mobile only (skips web)
- `view-staff-posts` — mobile only

### New Journeys

#### S-P1: Compose post on web
- **Tags:** `staff`, `authenticated`, `posts`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-posts`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: compose
      selectors:
        web: "/dashboard/compose"
        mobile: null
    - action: wait
      target: compose-form
      selectors:
        web: "[data-testid='compose-post-form']"
        mobile: null
    - action: fill
      target: post-body
      selectors:
        web: "[data-testid='post-body-input']"
        mobile: null
      value: "Today we painted pictures in art class!"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='submit-post-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "posted"
  ```

---

#### S-P2: View staff posts on web (currently mobile-only)
- **Tags:** `staff`, `authenticated`, `posts`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-posts`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: null
    - action: wait
      target: dashboard-view
      selectors:
        web: "[data-testid='dashboard-view']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Staff post 1"
  ```
- **Note:** Removes `skipPlatforms: [web]` from existing `view-staff-posts`

---

#### S-P3: Delete own post
- **Tags:** `staff`, `authenticated`, `posts`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-posts`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `post-delete-button`, `confirm-delete-button` on post detail/list
  - Mobile: `accessibilityLabel="Delete Post"`, `"Confirm Delete"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
    - action: wait
      target: post
      selectors:
        web: "[data-testid='class-post-card']:first-of-type"
        mobile: "Staff post 1"
    - action: tap
      target: delete
      selectors:
        web: "[data-testid='class-post-card']:first-of-type [data-testid='post-delete-button']"
        mobile: "Delete Post"
    - action: tap
      target: confirm
      selectors:
        web: "[data-testid='confirm-delete-button']"
        mobile: "Confirm Delete"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: not-visible
      text: "Staff post 1"
  ```

---

## 12. Staff Journeys — Payment Management

### Existing Journeys
- `view-staff-payments` — both platforms

### New Journeys

#### S-PM1: Create payment item
- **Tags:** `staff`, `authenticated`, `payments`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-school`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `create-payment-button`, `payment-title-input`, `payment-amount-input`, `payment-category-select`, `payment-create-submit` on `/dashboard/payments/new`
  - Mobile: `accessibilityLabel="Create Payment"`, `"Title"`, `"Amount"`, `"Category"`, `"Create"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: payments
      selectors:
        web: "/dashboard/payments"
        mobile: "Payments"
    - action: tap
      target: create-button
      selectors:
        web: "[data-testid='create-payment-button']"
        mobile: "Create Payment"
    - action: fill
      target: title
      selectors:
        web: "[data-testid='payment-title-input']"
        mobile: "Title"
      value: "Science Museum Trip"
    - action: fill
      target: amount
      selectors:
        web: "[data-testid='payment-amount-input']"
        mobile: "Amount"
      value: "15.00"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='payment-create-submit']"
        mobile: "Create"
  ```
- **mobileTestButton:** `"Test Fill"`
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Science Museum Trip"
  ```
- **Verify:** PaymentItem created with amount 1500 (pence), PaymentItemChild records for target children

---

## 13. Staff Journeys — Attendance Management

### Existing Journeys
- `view-staff-attendance` — mobile only
- `mark-attendance` — **DISABLED** (skipPlatforms: [web, mobile])

### New Journeys

#### S-A1: View staff attendance on web (currently mobile-only)
- **Tags:** `staff`, `authenticated`, `attendance`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: attendance
      selectors:
        web: "/dashboard/attendance"
        mobile: null
    - action: wait
      target: attendance-view
      selectors:
        web: "[data-testid='attendance-view']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Attendance"
  ```
- **Note:** Removes `skipPlatforms: [web]` from existing `view-staff-attendance`

---

#### S-A2: Mark attendance (when feature is ready)
- **Tags:** `staff`, `authenticated`, `attendance`, `regression`
- **Platforms:** Web + Mobile
- **Status:** BLOCKED — feature not yet implemented. Currently disabled on both platforms.
- **Preconditions:** Seed: `staff-with-children` (NEW-FIXTURE — school with children enrolled); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `attendance-child-row`, `mark-present`, `mark-absent`, `attendance-save`
  - Mobile: `accessibilityLabel="Present"`, `"Absent"`, `"Save Attendance"`
- **Steps:** (to implement when feature is ready)
  ```yaml
  steps:
    - action: navigate
      target: attendance
      selectors:
        web: "/dashboard/attendance"
        mobile: "Attendance"
    - action: tap
      target: mark-present-child1
      selectors:
        web: "[data-testid='attendance-child-row']:first-of-type [data-testid='mark-present']"
        mobile: "Present"
    - action: tap
      target: save
      selectors:
        web: "[data-testid='attendance-save']"
        mobile: "Save Attendance"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Attendance saved"
  ```

---

## 14. Staff Journeys — Settings

### Existing Journeys
- `view-staff-settings` — navigation only

### New Journeys

#### S-S1: Update staff profile
- **Tags:** `staff`, `authenticated`, `settings`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-school`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: "Settings"
    - action: wait
      target: settings-view
      selectors:
        web: "[data-testid='settings-view']"
        mobile: "Profile"
    - action: fill
      target: name-input
      selectors:
        web: "[data-testid='profile-name-input']"
        mobile: "Name"
      value: "Updated Staff Name"
    - action: tap
      target: save
      selectors:
        web: "[data-testid='profile-save-button']"
        mobile: "Save Profile"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Updated Staff Name"
  ```

---

## 15. Admin Journeys — Staff Management

### Existing Journeys
None.

### New Journeys

#### AD-1: View staff list
- **Tags:** `admin`, `authenticated`, `staff-management`, `smoke`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `admin-with-multiple-staff` (NEW-FIXTURE — school with admin + 2 additional staff members); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `staff-list`, `staff-member-row`, `staff-role-badge` on `/dashboard/staff`
  - Mobile: `accessibilityLabel="Staff"`, `"Staff Member"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: staff-management
      selectors:
        web: "/dashboard/staff"
        mobile: "Staff"
    - action: wait
      target: staff-list
      selectors:
        web: "[data-testid='staff-list']"
        mobile: "Staff"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Admin"
    - type: visible
      text: "Teacher"
  ```

---

#### AD-2: Send staff invitation
- **Tags:** `admin`, `authenticated`, `staff-management`, `regression`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `staff-with-school` (admin role); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `invite-email-input`, `invite-role-select`, `invite-send-button`, `pending-invitations-list` on `/dashboard/staff`
  - Mobile: `accessibilityLabel="Invite Staff"`, `"Invite Email"`, `"Send Invite"`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: staff-management
      selectors:
        web: "/dashboard/staff"
        mobile: "Staff"
    - action: fill
      target: email
      selectors:
        web: "[data-testid='invite-email-input']"
        mobile: "Invite Email"
      value: "newteacher@school.com"
    - action: tap
      target: send
      selectors:
        web: "[data-testid='invite-send-button']"
        mobile: "Send Invite"
  ```
- **mobileTestButton:** `"Test Fill"`
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "newteacher@school.com"
  ```
- **Verify:** Invitation record created with 7-day expiry, correct role

---

#### AD-3: Remove staff member
- **Tags:** `admin`, `authenticated`, `staff-management`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `admin-with-multiple-staff`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `staff-remove-button`, `confirm-remove-button` on staff row
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: staff-management
      selectors:
        web: "/dashboard/staff"
        mobile: null
    - action: wait
      target: staff-list
      selectors:
        web: "[data-testid='staff-list']"
        mobile: null
    - action: tap
      target: remove-button
      selectors:
        web: "[data-testid='staff-member-row']:last-of-type [data-testid='staff-remove-button']"
        mobile: null
    - action: tap
      target: confirm
      selectors:
        web: "[data-testid='confirm-remove-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "removed"
  ```

---

#### AD-4: Update staff role
- **Tags:** `admin`, `authenticated`, `staff-management`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `admin-with-multiple-staff`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `staff-role-select`, `role-save-button` on staff row
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: staff-management
      selectors:
        web: "/dashboard/staff"
        mobile: null
    - action: wait
      target: staff-list
      selectors:
        web: "[data-testid='staff-list']"
        mobile: null
    - action: tap
      target: role-select
      selectors:
        web: "[data-testid='staff-member-row']:last-of-type [data-testid='staff-role-select']"
        mobile: null
    - action: tap
      target: office-role
      selectors:
        web: "[data-testid='role-option-OFFICE']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Office"
  ```

---

#### AD-5: Admin cannot remove themselves
- **Tags:** `admin`, `authenticated`, `staff-management`, `error`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: staff-management
      selectors:
        web: "/dashboard/staff"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: not-visible
      target: self-remove
      text: "Remove"  # own row should not have remove button
  ```

---

## 16. Admin Journeys — Analytics Dashboard

### Existing Journeys
None.

### New Journeys

#### AD-AN1: View analytics dashboard
- **Tags:** `admin`, `authenticated`, `analytics`, `smoke`
- **Platforms:** Web
- **Preconditions:** Seed: `admin-with-analytics-data` (NEW-FIXTURE — school with attendance records, payments, forms, messages); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `analytics-view`, `analytics-attendance-card`, `analytics-payments-card`, `analytics-forms-card`, `analytics-messages-card`, `analytics-date-range` on `/dashboard/analytics`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: analytics
      selectors:
        web: "/dashboard/analytics"
        mobile: null
    - action: wait
      target: analytics-view
      selectors:
        web: "[data-testid='analytics-view']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Attendance"
    - type: visible
      text: "Payments"
    - type: visible
      text: "Forms"
    - type: visible
      text: "Messages"
  ```

---

#### AD-AN2: Change analytics date range
- **Tags:** `admin`, `authenticated`, `analytics`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `admin-with-analytics-data`; State: `authenticated`
- **NEW-TESTID required:**
  - Web: `date-range-today`, `date-range-week`, `date-range-month`, `date-range-term`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: analytics
      selectors:
        web: "/dashboard/analytics"
        mobile: null
    - action: wait
      target: analytics-view
      selectors:
        web: "[data-testid='analytics-view']"
        mobile: null
    - action: tap
      target: term-range
      selectors:
        web: "[data-testid='date-range-term']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Term"
  ```

---

## 17. Admin Journeys — School Settings & Feature Toggles

### Existing Journeys
None.

### New Journeys

#### AD-S1: Update school name
- **Tags:** `admin`, `authenticated`, `settings`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin role); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `school-name-input`, `school-settings-save` on settings page (admin section)
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: null
    - action: scroll
      target: school-settings
      selectors:
        web: "[data-testid='school-name-input']"
        mobile: null
    - action: fill
      target: school-name
      selectors:
        web: "[data-testid='school-name-input']"
        mobile: null
      value: "Oakwood Academy"
    - action: tap
      target: save
      selectors:
        web: "[data-testid='school-settings-save']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Oakwood Academy"
  ```

---

#### AD-S2: Toggle features on/off
- **Tags:** `admin`, `authenticated`, `settings`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin, all features enabled); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `toggle-messaging`, `toggle-payments`, `toggle-attendance`, `toggle-calendar`, `toggle-forms`, `feature-toggles-save`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: null
    - action: scroll
      target: feature-toggles
      selectors:
        web: "[data-testid='toggle-messaging']"
        mobile: null
    - action: tap
      target: messaging-toggle
      selectors:
        web: "[data-testid='toggle-messaging']"
        mobile: null
    - action: tap
      target: save
      selectors:
        web: "[data-testid='feature-toggles-save']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "saved"
  ```
- **Verify:** School.messagingEnabled set to false

---

#### AD-S3: Disabled feature hides navigation for parents
- **Tags:** `admin`, `authenticated`, `settings`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: `parent-with-disabled-features` (NEW-FIXTURE — school with `messagingEnabled: false`); State: `authenticated` as parent
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: not-visible
      text: "Messages"
      mobileText: "Inbox"
  ```

---

#### AD-S4: Toggle payment categories
- **Tags:** `admin`, `authenticated`, `settings`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `toggle-payment-dinner-money`, `toggle-payment-trips`, `toggle-payment-clubs`, `toggle-payment-uniform`, `toggle-payment-other`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: null
    - action: scroll
      target: payment-categories
      selectors:
        web: "[data-testid='toggle-payment-dinner-money']"
        mobile: null
    - action: tap
      target: dinner-money-toggle
      selectors:
        web: "[data-testid='toggle-payment-dinner-money']"
        mobile: null
    - action: tap
      target: save
      selectors:
        web: "[data-testid='feature-toggles-save']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "saved"
  ```

---

## 18. Admin Journeys — Stripe Onboarding

### Existing Journeys
None.

### New Journeys

#### AD-ST1: View Stripe connection status
- **Tags:** `admin`, `authenticated`, `stripe`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin, no Stripe account); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `stripe-status`, `stripe-connect-button` on settings or payments page
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: null
    - action: scroll
      target: stripe-section
      selectors:
        web: "[data-testid='stripe-status']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Not connected"
  ```

---

#### AD-ST2: Initiate Stripe onboarding
- **Tags:** `admin`, `authenticated`, `stripe`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin); State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: null
    - action: scroll
      target: stripe-section
      selectors:
        web: "[data-testid='stripe-connect-button']"
        mobile: null
    - action: tap
      target: connect
      selectors:
        web: "[data-testid='stripe-connect-button']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Stripe"  # redirected to Stripe or link generated
  ```
- **Note:** Full Stripe onboarding flow is external; E2E can verify the link is generated

---

## 19. Admin Journeys — Calendar Management

### Existing Journeys
None.

### New Journeys

#### AD-C1: Create calendar event
- **Tags:** `admin`, `authenticated`, `calendar`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin, calendar enabled); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `create-event-button`, `event-title-input`, `event-start-date`, `event-category-select`, `event-create-submit` on calendar page
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: calendar
      selectors:
        web: "/dashboard/calendar"
        mobile: null
    - action: tap
      target: create-event
      selectors:
        web: "[data-testid='create-event-button']"
        mobile: null
    - action: fill
      target: title
      selectors:
        web: "[data-testid='event-title-input']"
        mobile: null
      value: "Sports Day"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='event-create-submit']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Sports Day"
  ```

---

#### AD-C2: Delete calendar event
- **Tags:** `admin`, `authenticated`, `calendar`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `parent-with-calendar-events`; State: `authenticated` as staff admin
- **NEW-TESTID required:**
  - Web: `event-delete-button`, `confirm-delete-event`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: calendar
      selectors:
        web: "/dashboard/calendar"
        mobile: null
    - action: tap
      target: delete
      selectors:
        web: "[data-testid='calendar-event']:first-of-type [data-testid='event-delete-button']"
        mobile: null
    - action: tap
      target: confirm
      selectors:
        web: "[data-testid='confirm-delete-event']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "deleted"
  ```

---

## 20. Admin Journeys — Forms Management

### Existing Journeys
None (only parent form submission exists).

### New Journeys

#### AD-F1: Create form template
- **Tags:** `admin`, `authenticated`, `forms`, `regression`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-school` (admin, forms enabled); State: `authenticated`
- **NEW-TESTID required:**
  - Web: `create-form-button`, `form-title-input`, `add-field-button`, `field-type-select`, `field-label-input`, `form-create-submit`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: forms
      selectors:
        web: "/dashboard/forms"
        mobile: null
    - action: tap
      target: create
      selectors:
        web: "[data-testid='create-form-button']"
        mobile: null
    - action: fill
      target: title
      selectors:
        web: "[data-testid='form-title-input']"
        mobile: null
      value: "Trip Consent"
    - action: tap
      target: add-field
      selectors:
        web: "[data-testid='add-field-button']"
        mobile: null
    - action: fill
      target: field-label
      selectors:
        web: "[data-testid='field-label-input']"
        mobile: null
      value: "Do you consent?"
    - action: tap
      target: submit
      selectors:
        web: "[data-testid='form-create-submit']"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Trip Consent"
  ```

---

## 21. Cross-Cutting Concerns

### Feature-Gated Access

#### CC-1: Staff cannot access disabled feature endpoint
- **Tags:** `error`, `authenticated`, `edge`
- **Platforms:** Web
- **Preconditions:** Seed: `staff-with-disabled-features` (NEW-FIXTURE — school with messagingEnabled=false); State: `authenticated` as staff
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "not available"
  ```

---

### Non-Admin Access Control

#### CC-2: Non-admin staff cannot access staff management
- **Tags:** `error`, `authenticated`, `edge`
- **Platforms:** Web
- **Preconditions:** Seed: `teacher-staff` (NEW-FIXTURE — staff with TEACHER role, not ADMIN); State: `authenticated`
- **NEW-TESTID required:**
  - Web: verify `staff-link` is hidden or `/dashboard/staff` redirects
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: not-visible
      text: "Staff"
  ```

---

#### CC-3: Non-admin staff cannot access analytics
- **Tags:** `error`, `authenticated`, `edge`
- **Platforms:** Web
- **Preconditions:** Seed: `teacher-staff`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: analytics
      selectors:
        web: "/dashboard/analytics"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "not authorized"
  ```

---

### Parent Access Boundaries

#### CC-4: Parent cannot access staff routes
- **Tags:** `error`, `authenticated`, `edge`
- **Platforms:** Web
- **Preconditions:** Seed: `parent-with-school`; State: `authenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: compose
      selectors:
        web: "/dashboard/compose"
        mobile: null
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: not-visible
      text: "compose-post-form"
  ```

---

### Unauthenticated Access

#### CC-5: Unauthenticated user redirected from dashboard
- **Tags:** `auth`, `unauthenticated`, `edge`
- **Platforms:** Web + Mobile
- **Preconditions:** Seed: none; State: `unauthenticated`
- **Steps:**
  ```yaml
  steps:
    - action: navigate
      target: dashboard
      selectors:
        web: "/dashboard"
        mobile: "Home"
  ```
- **Assertions:**
  ```yaml
  assertions:
    - type: visible
      text: "Sign In"
  ```

---

## Appendix A: New Fixtures Required

| Fixture Name | Description |
|---|---|
| `clean-db` | Empty database, no users |
| `pending-invitation` | School + valid invitation token (7-day expiry) |
| `expired-invitation` | School + invitation with `expiresAt` in the past |
| `parent-with-multiple-children` | Parent with 2 children in different classes, distinct posts per class |
| `parent-with-reacted-post` | Parent + child + post + existing HEART reaction by parent |
| `parent-with-action-items` | Parent + child + 1 pending form + 1 outstanding payment + 1 unread urgent message |
| `parent-with-many-posts` | Parent + child + 15+ class posts (for pagination) |
| `parent-no-children` | User with parent credentials but no ParentChild links |
| `parent-with-categorized-messages` | Parent + messages across URGENT, STANDARD, FYI categories |
| `parent-with-many-messages` | Parent + 20+ messages (for pagination) |
| `parent-with-payment-history` | Parent + completed Payment records with receiptNumber |
| `parent-with-pending-forms` | Parent + child + active FormTemplate, no FormResponse |
| `parent-with-signature-form` | Parent + child + FormTemplate requiring signature field |
| `parent-with-calendar-events` | Parent + school with TERM_DATE, EVENT, CLUB events |
| `parent-with-disabled-attendance` | Parent + school with `attendanceEnabled: false` |
| `parent-with-disabled-features` | Parent + school with `messagingEnabled: false` |
| `admin-with-multiple-staff` | Admin + 2 additional staff (TEACHER, OFFICE roles) |
| `admin-with-analytics-data` | School with attendance records, payments, forms, messages |
| `staff-with-disabled-features` | Staff + school with `messagingEnabled: false` |
| `teacher-staff` | Staff with TEACHER role (not ADMIN) |
| `staff-with-children` | Staff + school with enrolled children (for attendance marking) |

---

## Appendix B: New Test IDs Required

### Web (`data-testid`)

**Registration page** (`/register`):
`register-name-input`, `register-email-input`, `register-password-input`, `register-button`, `register-error`, `invitation-school-name`, `invitation-error`

**Login page** (`/login`):
`login-error`

**Dashboard** (`/dashboard`):
`child-switcher`, `child-option-{n}`, `action-items-row`, `action-item-payments`, `action-item-forms`, `action-item-messages`, `empty-dashboard`

**Messages** (`/dashboard/messages`):
`unread-badge`, `filter-urgent`, `filter-standard`, `filter-fyi`, `empty-messages`, `sent-messages-list`, `sent-message-row`

**Messages Compose** (`/dashboard/messages/new`):
`message-subject-input`, `message-body-input`, `message-category-select`, `message-recipients-select`, `message-send-button`

**Payments** (`/dashboard/payments`):
`cart-checkout-button`, `history-button`, `create-payment-button`

**Payments New** (`/dashboard/payments/new`):
`payment-title-input`, `payment-amount-input`, `payment-category-select`, `payment-create-submit`

**Payment History** (`/dashboard/payments/history`):
`payment-history-list`, `payment-history-item`, `receipt-view`, `receipt-number`

**Attendance** (`/dashboard/attendance`):
`report-absence-button`, `absence-date-input`, `absence-reason-input`, `absence-submit`, `attendance-child-selector`, `attendance-child-row`, `mark-present`, `mark-absent`, `attendance-save`

**Forms** (`/dashboard/forms`):
`forms-list`, `pending-forms-section`, `completed-forms-section`, `create-form-button`, `form-title-input`, `add-field-button`, `field-type-select`, `field-label-input`, `form-create-submit`

**Forms Detail** (`/dashboard/forms/[formId]`):
`form-field-{fieldId}`, `form-submit-button`, `signature-canvas`, `signature-clear-button`

**Calendar** (`/dashboard/calendar`):
`calendar-view`, `calendar-event`, `calendar-filter-club`, `calendar-filter-event`, `create-event-button`, `event-title-input`, `event-start-date`, `event-category-select`, `event-create-submit`, `event-delete-button`, `confirm-delete-event`

**Posts**:
`post-delete-button`, `confirm-delete-button`

**Settings** (`/dashboard/settings`):
`profile-name-input`, `profile-save-button`, `profile-success`, `toggle-push`, `toggle-sms`, `toggle-email`, `notifications-save-button`, `quiet-start-input`, `quiet-end-input`, `school-name-input`, `school-settings-save`, `toggle-messaging`, `toggle-payments`, `toggle-attendance`, `toggle-calendar`, `toggle-forms`, `feature-toggles-save`, `toggle-payment-dinner-money`, `toggle-payment-trips`, `toggle-payment-clubs`, `toggle-payment-uniform`, `toggle-payment-other`, `stripe-status`, `stripe-connect-button`

**Staff Management** (`/dashboard/staff`):
`staff-list`, `staff-member-row`, `staff-role-badge`, `staff-remove-button`, `confirm-remove-button`, `staff-role-select`, `role-option-{ROLE}`, `invite-email-input`, `invite-role-select`, `invite-send-button`, `pending-invitations-list`

**Analytics** (`/dashboard/analytics`):
`analytics-view`, `analytics-attendance-card`, `analytics-payments-card`, `analytics-forms-card`, `analytics-messages-card`, `analytics-date-range`, `date-range-today`, `date-range-week`, `date-range-month`, `date-range-term`

**Total new web test IDs: ~100**

### Mobile (`accessibilityLabel`)

**Auth**: `"Create Account"`, `"Name"` (register)
**Dashboard**: `"Switch Child"`, `"Action Items"`, `"Payments Due"`, `"Forms Pending"`, `"Unread Messages"`, `"No Children"`
**Messages**: `"Urgent"`, `"Standard"`, `"FYI"`, `"Sent"`
**Payments**: `"Pay All"`, `"History"`, `"Payment History"`, `"Create Payment"`, `"Title"`, `"Amount"`, `"Category"`, `"Create"`, `"Receipt"`
**Attendance**: `"Report Absence"`, `"Date"`, `"Reason"`, `"Submit"`, `"Present"`, `"Absent"`, `"Save Attendance"`, `"Sick"`, `"Appointment"`, `"Family"`, `"Other"`
**Forms**: `"Pending Forms"`, `"Completed Forms"`, `"Sign Here"`, `"Clear Signature"`, `"Submit"`
**Calendar**: (tab already exists)
**Settings**: `"Name"`, `"Save Profile"`, `"Push Notifications"`, `"SMS"`, `"Email"`, `"Save Notifications"`, `"Quiet Start"`, `"Quiet End"`
**Staff**: `"Staff"`, `"Staff Member"`, `"Invite Staff"`, `"Invite Email"`, `"Send Invite"`, `"Delete Post"`, `"Confirm Delete"`

**Total new mobile labels: ~50**

---

## Appendix C: Summary Statistics

| Metric | Count |
|---|---|
| **Existing journey specs** | 25 |
| **New journey specs proposed** | 52 |
| **Total after implementation** | 77 |
| **New fixtures required** | 21 |
| **New web test IDs required** | ~100 |
| **New mobile accessibility labels** | ~50 |
| **Journeys removing skipPlatforms (web)** | 4 (view-staff-messages, view-staff-attendance, view-staff-posts, make-payment → evaluate) |

### Coverage by Role (after implementation)

| Role | Existing | New | Total |
|------|----------|-----|-------|
| Parent | 14 | 28 | 42 |
| Staff | 10 | 9 | 19 |
| Admin | 0 | 13 | 13 |
| Cross-cutting | 1 | 5 | 6 |

### Coverage by Tag

| Tag | Count |
|-----|-------|
| smoke | 10 |
| regression | 48 |
| error | 8 |
| edge | 11 |
