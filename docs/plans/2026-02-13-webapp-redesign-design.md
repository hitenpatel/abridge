# Abridge Webapp Redesign — Design Document

**Date:** 2026-02-13
**Status:** Approved
**Approach:** Full UI component rewrite, keeping existing tRPC data layer

## Summary

Redesign the SchoolConnect webapp to match the Abridge Stitch designs. This includes rebranding from "SchoolConnect" to "Abridge", updating the entire visual design system, and rewriting all page UI components. The data fetching layer (tRPC, React Query) remains unchanged.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | All pages (Home, Attendance, Payments, Messages, Calendar, Forms, Staff) |
| Navigation | Left sidebar on desktop, hamburger slide-in on mobile |
| Typography | Poppins (single font family) |
| Branding | Rebrand to "Abridge" |
| Approach | Full component rewrite using Stitch HTML as reference |
| Icons | Material Symbols Rounded (replacing lucide-react) |

## Design System

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `#FF7D45` | `#FF7D45` | CTAs, active nav, send buttons |
| `primary-hover` | `#E56A35` | `#E56A35` | Hover states for primary |
| `secondary` | `#FFD54F` | `#FFD54F` | Progress bars, highlights, calendar |
| `accent` | `#4DB6AC` | `#4DB6AC` | Event badges, teal accents |
| `background` | `#F7F8FA` | `#121212` | Page background |
| `card` | `#FFFFFF` | `#1E1E1E` | Card surfaces |
| `text-primary` | `#2D3748` | `#E2E8F0` | Headings, primary text |
| `text-muted` | `#6B7280` | `#9CA3AF` | Secondary text, labels |
| `success` | `#4ADE80` | `#4ADE80` | Present, paid, online |
| `danger` | `#F87171` | `#F87171` | Absent, overdue |
| `warning` | `#FBBF24` | `#FBBF24` | Late, due soon |

### Typography

- **Font:** Poppins (Google Fonts), weights 300-700
- **Headings:** `font-bold` to `font-extrabold`, sizes `text-xl` to `text-3xl`
- **Body:** `font-medium`, `text-sm` to `text-base`
- **Labels:** `font-semibold`, `text-xs` to `text-sm`, uppercase tracking

### Border Radius

| Element | Radius |
|---------|--------|
| Default | `12px` |
| Cards | `20-24px` (rounded-2xl to rounded-3xl) |
| Buttons | `12px` (rounded-xl) |
| Inputs | `12px` (rounded-xl) |
| Avatars | `20px` (squircle via rounded-squircle) |
| Pills/badges | `9999px` (rounded-full) |

### Shadows

| Name | Value | Usage |
|------|-------|-------|
| `soft` | `0 4px 20px -2px rgba(0, 0, 0, 0.05)` | Cards, panels |
| `glow` | `0 0 15px rgba(255, 125, 69, 0.3)` | Primary button hover, hero card |

### Icons

Material Symbols Rounded (Google), with `FILL: 1, wght: 400, GRAD: 0, opsz: 24`.

## Layout

### Desktop

```
┌──────────┬──────────────────────────────────────────┐
│ w-64     │ Page Header + Content                    │
│ Sidebar  │                                          │
│ fixed    │ Main area: ml-64, p-6 to p-10            │
│ h-screen │ overflow-y-auto                          │
└──────────┴──────────────────────────────────────────┘
```

### Sidebar

- **Logo:** `w-10 h-10 rounded-xl bg-primary` with school icon + "Abridge" heading
- **Nav items:** Material Symbols icon + label, `px-4 py-3 rounded-xl`
  - Active: `bg-primary/10 text-primary font-semibold`
  - Inactive: `text-gray-500 hover:bg-gray-50 hover:text-slate-800`
  - Badge (Messages): Red circle with count
- **Footer:** User avatar (rounded-full) + name + role + expand icon
- **Nav items (Parent):** Home, Messages, Attendance, Payments, Calendar, Forms, Settings
- **Nav items (Staff):** Home, Messages, Attendance, Payments, Calendar, Forms, Settings, Staff (admin only)

### Mobile

- Hamburger button in top-left
- Slide-in sidebar from left (same content as desktop)
- Background overlay `bg-black/50`

## Page Designs

### Home Dashboard

**Reference:** Stitch screens 6 (sidebar version) and 10 (icon sidebar version)

**Layout:** `grid grid-cols-1 lg:grid-cols-3 gap-8`

**Left column (lg:col-span-2):**
1. **Hero card** — Gradient `from-primary to-orange-400`, rounded-3xl, shows child photo (rounded-full with green online dot), "Leo is at School" heading, check-in time, grade + teacher badges
2. **Quick actions** — 4-column grid of icon buttons: Lunch Menu (blue), Calendar (purple), Sick Note (green), Awards (yellow). Each is a card with colored circular icon + label.
3. **Today & Upcoming** — Section heading with "View All" link. List of event cards with colored left borders:
   - Yellow border: Reminders (Pizza Day)
   - Orange border: Actions (Report Card Ready, with CTA button)
   - Teal border: Meetings (Parent-Teacher Conf.)
   - Purple border: Activities (Violin Recital)

**Right column:**
1. **This Week's Progress** — Attendance (95%, yellow bar) + Participation (Excellent, dark bar)
2. **Achievements** — 2x2 grid of badge cards (Star Reader, Kindness, Math Whiz, Nature Scout)
3. **Up Next** — Yellow-tinted card with date + "Science Fair Project Due"
4. **Recent Payment** — Compact card showing last payment

### Attendance Hub

**Reference:** Stitch screens 7 (top nav version) and 11 (icon sidebar version)

**Layout:** `grid grid-cols-1 lg:grid-cols-12 gap-8`

**Header:** "Attendance Hub" title + "95% Present" green badge + Export Log button

**Left column (lg:col-span-7):**
- **Calendar grid:** 7-column CSS grid, cells `h-24 p-2 rounded-xl`
  - Present: Green dot bottom-right
  - Late: Yellow dot, yellow background tint, tooltip on hover
  - Absent: Orange/red dot, red background tint, tooltip on hover
  - Today: `ring-2 ring-primary` with "Today" label
  - Weekend: Gray background, muted

**Right column (lg:col-span-5):**
1. **Status banner** — Yellow-to-orange gradient card, "Leo is at School", check-in time
2. **Absence report form:**
   - Date picker input
   - Reason radio cards (2x2 grid): Sick/Ill, Appointment, Family/Trip, Other — each with icon and `peer-checked:border-primary`
   - Teacher note textarea
   - Attachments (Photo + Doc upload buttons)
   - Submit button: full-width, `bg-primary text-white rounded-xl shadow-lg`

### Payment Wallet

**Reference:** Stitch screens 8 (top nav version) and 12 (icon sidebar version)

**Layout:** `grid grid-cols-1 lg:grid-cols-12 gap-8`

**Left column (lg:col-span-7):**
1. **Header:** "Leo's School Expenses" title + Upcoming/History toggle
2. **Due items list:** Cards with icon (colored bg), title, subtitle, due date badge, amount, Pay/Details button
3. **Recently Paid:** Muted cards with strikethrough prices + "Paid" badge

**Right column (lg:col-span-5):**
1. **Balance card:** "Current Balance" heading, liquid-fill wallet animation showing `$142.50`, auto-refill toggle
2. **Quick Top-Up:** 3-column grid (`+$20`, `+$50`, `+$100`) + custom amount input with Add button
3. **Payment Methods:** Card display with Visa info + Edit link

### Messages / Chat

**Reference:** Stitch screens 9 (top nav version) and remaining chat variants

**Layout:** `flex h-[calc(100vh-sidebar-offset)]`

**Left panel (w-80 to w-96):**
1. Search input with search icon
2. Filter tabs: All Chats, Unread, Teachers, Parents (pill buttons)
3. Conversation list: Avatar (rounded-squircle) + name + last message preview + timestamp
   - Active conversation: `bg-orange-50 border-orange-100`
   - Unread: Primary-colored dot/badge

**Right panel (flex-1):**
1. **Quiet hours banner** (conditional): Dark slate bar with moon icon + message
2. **Contact header:** Avatar + name + role + reply time. Action buttons: info, call, more
3. **Message area:** Scrollable, date separators
   - Received: `bg-white rounded-2xl rounded-bl-sm` with sender avatar
   - Sent: `bg-primary text-white rounded-2xl rounded-br-sm`
   - Photos: Inline with hover zoom effect
   - Typing indicator: 3 bouncing dots
4. **Input area:** Attachment button + textarea (rounded-3xl) with emoji/mic buttons + orange send button

### Calendar (no Stitch design)

Apply new theme. Keep existing event list layout, restyle cards with:
- Rounded-2xl cards with soft shadows
- Date badges using secondary (yellow) color
- Event type icons with colored circular backgrounds

### Forms (no Stitch design)

Apply new theme. Keep existing form renderer, restyle with:
- Rounded-xl inputs
- Primary-colored submit buttons
- Card containers with soft shadows

### Staff Management (no Stitch design)

Apply new theme. Admin-only page keeps existing table/list layout, restyled with new colors and rounded corners.

## Files to Modify

### Global / Theme
- `apps/web/tailwind.config.ts` — New color palette, fonts, border-radius, shadows
- `apps/web/src/app/globals.css` — CSS variables for new design tokens
- `apps/web/src/app/layout.tsx` — Poppins font import, Abridge metadata
- `apps/web/src/app/dashboard/layout.tsx` — New sidebar + header design

### UI Components
- `apps/web/src/components/ui/button.tsx` — Updated variants with new colors/radius
- `apps/web/src/components/ui/card.tsx` — Larger radius, soft shadow
- `apps/web/src/components/ui/badge.tsx` — New color variants
- `apps/web/src/components/ui/input.tsx` — Rounded-xl, new focus ring
- All other UI components — Updated with new design tokens

### Pages
- `apps/web/src/app/dashboard/page.tsx` — Full rewrite to Home Dashboard
- `apps/web/src/app/dashboard/attendance/page.tsx` — Full rewrite to Attendance Hub
- `apps/web/src/app/dashboard/payments/page.tsx` — Full rewrite to Payment Wallet
- `apps/web/src/app/dashboard/messages/page.tsx` — Full rewrite to Chat Interface
- `apps/web/src/app/dashboard/calendar/page.tsx` — Restyle with new theme
- `apps/web/src/app/dashboard/forms/page.tsx` — Restyle with new theme
- `apps/web/src/app/dashboard/staff/page.tsx` — Restyle with new theme

### Feature Components
- All components in `apps/web/src/components/` — Restyle to match new design

## Stitch Design References

All design screenshots and HTML code are saved in:
- `stitch-designs/mobile/screenshots/` — 5 mobile screen PNGs
- `stitch-designs/desktop/screenshots/` — 11 desktop screen PNGs
- `stitch-designs/desktop/html/` — 11 HTML files with full Tailwind implementations

Key HTML references:
- `06-home-dashboard.html` — Home Dashboard layout, sidebar, cards
- `07-attendance-hub.html` — Calendar grid, absence form
- `08-payment-wallet.html` — Wallet balance, payment list, top-up
- `09-chat-interface-1.html` — Chat layout, message bubbles, conversation list

## Risk & Considerations

- **Material Symbols import:** Adds a new font dependency. Ensure it's loaded via Google Fonts link in layout.
- **Dark mode:** All Stitch HTML includes dark mode classes. Maintain dark mode support.
- **Data compatibility:** No backend changes needed. All tRPC queries/mutations stay the same.
- **Responsive:** Desktop-first design with mobile sidebar toggle pattern.
- **Accessibility:** Maintain existing keyboard navigation and ARIA patterns.
