# Abridge Webapp Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the entire SchoolConnect webapp to match Abridge Stitch designs — new brand, colors, typography, layout, and page UI.

**Architecture:** Full UI rewrite approach. Update global theme (Tailwind config, CSS vars, fonts), then rewrite each page component using the Stitch HTML files as pixel-perfect reference. Keep all existing tRPC data fetching and business logic unchanged. Material Symbols Rounded replaces lucide-react for icons.

**Tech Stack:** Next.js 16, TailwindCSS, tRPC, Poppins font, Material Symbols Rounded icons

**Design Reference Files:**
- `stitch-designs/desktop/html/06-home-dashboard.html` — Home Dashboard
- `stitch-designs/desktop/html/07-attendance-hub.html` — Attendance Hub
- `stitch-designs/desktop/html/08-payment-wallet.html` — Payment Wallet
- `stitch-designs/desktop/html/09-chat-interface-1.html` — Chat Interface
- `stitch-designs/desktop/screenshots/*.png` — All 11 desktop screenshots
- `stitch-designs/mobile/screenshots/*.png` — All 5 mobile screenshots

---

## Task 1: Update Global Theme — Tailwind Config & CSS Variables

**Files:**
- Modify: `apps/web/tailwind.config.ts` (lines 1-69)
- Modify: `apps/web/src/app/globals.css` (lines 1-113)

**Step 1: Update `tailwind.config.ts`**

Replace the entire theme config with Abridge design tokens. Key changes:
- Font family: `sans` → `var(--font-poppins)`, remove `heading` (Poppins for both)
- Border radius: `lg` → `12px`, `xl` → `20px`, `2xl` → `24px`, `3xl` → `32px`
- Add custom shadows: `soft` and `glow`
- Colors remain HSL CSS variable based but with new values

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        glow: "0 0 15px rgba(255, 125, 69, 0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Step 2: Update `globals.css`**

Replace CSS variables with Abridge color palette. Key color changes:
- Primary: Indigo `239 84% 67%` → Coral Orange `17 100% 63%` (#FF7D45)
- Secondary: Slate `210 40% 96%` → Sunshine Yellow `45 100% 65%` (#FFD54F)
- Accent: Slate `210 40% 96%` → Soft Teal `174 36% 49%` (#4DB6AC)
- Background: `210 20% 98%` → `220 14% 97%` (#F7F8FA)
- Ring: match primary

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background: #F7F8FA */
    --background: 220 14% 97%;
    /* Foreground: Slate 800 #2D3748 */
    --foreground: 220 26% 23%;

    /* Card: White */
    --card: 0 0% 100%;
    --card-foreground: 220 26% 23%;

    /* Popover: White */
    --popover: 0 0% 100%;
    --popover-foreground: 220 26% 23%;

    /* Primary: Coral Orange #FF7D45 */
    --primary: 17 100% 63%;
    --primary-foreground: 0 0% 100%;

    /* Secondary: Sunshine Yellow #FFD54F */
    --secondary: 45 100% 65%;
    --secondary-foreground: 220 26% 23%;

    /* Muted: Gray 100 */
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;

    /* Accent: Soft Teal #4DB6AC */
    --accent: 174 36% 49%;
    --accent-foreground: 0 0% 100%;

    /* Destructive: Red 400 #F87171 */
    --destructive: 0 94% 71%;
    --destructive-foreground: 0 0% 100%;

    /* Border: Gray 200 */
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 17 100% 63%;

    /* Semantic colors */
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 45 96% 56%;
    --warning-foreground: 220 26% 23%;
    --info: 199 89% 48%;
    --info-foreground: 0 0% 100%;

    --radius: 0.75rem;
  }

  .dark {
    /* Background: #121212 */
    --background: 0 0% 7%;
    --foreground: 214 32% 91%;

    /* Card: #1E1E1E */
    --card: 0 0% 12%;
    --card-foreground: 214 32% 91%;

    --popover: 0 0% 12%;
    --popover-foreground: 214 32% 91%;

    /* Primary: Coral Orange (same in dark) */
    --primary: 17 100% 63%;
    --primary-foreground: 0 0% 100%;

    /* Secondary: Sunshine Yellow */
    --secondary: 45 100% 65%;
    --secondary-foreground: 0 0% 100%;

    --muted: 0 0% 15%;
    --muted-foreground: 218 11% 65%;

    --accent: 174 36% 49%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 63% 31%;
    --destructive-foreground: 214 32% 91%;

    --border: 0 0% 15%;
    --input: 0 0% 15%;
    --ring: 17 100% 63%;

    /* Semantic colors */
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 45 96% 56%;
    --warning-foreground: 0 0% 100%;
    --info: 199 89% 48%;
    --info-foreground: 0 0% 100%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

**Step 3: Verify build**

Run: `cd /Users/hitenpatel/dev/personal/abridge && npx pnpm build --filter @schoolconnect/web`
Expected: Build succeeds (colors changed but no structural breaks)

**Step 4: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/app/globals.css
git commit -m "feat: update theme to Abridge design system (coral orange, yellow, teal)"
```

---

## Task 2: Update Root Layout — Font & Branding

**Files:**
- Modify: `apps/web/src/app/layout.tsx` (lines 1-55)

**Step 1: Replace fonts and metadata**

Replace Inter + Plus Jakarta Sans with Poppins. Update metadata from SchoolConnect to Abridge.

```typescript
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FF7D45",
};

export const metadata: Metadata = {
  title: "Abridge",
  description: "School-parent communication platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Abridge",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          poppins.variable,
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Step 2: Add Material Symbols CSS utility**

Add to `globals.css` (append after existing content):

```css
/* Material Symbols */
.material-symbols-rounded {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
.dark ::-webkit-scrollbar-thumb {
  background: #4a5568;
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/app/globals.css
git commit -m "feat: rebrand to Abridge with Poppins font and Material Symbols"
```

---

## Task 3: Redesign Dashboard Layout — Sidebar & Shell

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx` (lines 1-255)

**Step 1: Rewrite the dashboard layout**

This is the largest single file change. Replace the entire layout with the Abridge sidebar design. Keep the existing auth/session logic, role-based nav, sign-out handler. Replace the visual shell.

Reference: `stitch-designs/desktop/html/06-home-dashboard.html` (lines 72-116 for sidebar, 117-376 for main layout)

Key changes:
- Replace lucide-react icons with Material Symbols Rounded `<span className="material-symbols-rounded">icon_name</span>`
- Sidebar: `w-64 h-screen bg-card border-r shadow-soft fixed left-0 top-0`, padding `p-6`
- Logo: `w-10 h-10 rounded-xl bg-primary shadow-glow` with `school` icon + "Abridge" text
- Nav items: `px-4 py-3 rounded-xl` with `gap-4` between icon and text
- Active: `bg-primary/10 text-primary font-semibold`
- Inactive: `text-gray-500 hover:bg-gray-50 hover:text-slate-800`
- Messages badge: `ml-auto w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full`
- Footer: User avatar (rounded-full, `w-10 h-10`) + name + "Parent Account" + expand_more icon
- Main: `ml-0 lg:ml-64 p-6 lg:p-10 overflow-y-auto h-screen`
- Remove top header (SearchBar) — pages handle their own headers
- Mobile: Same slide-in pattern but with new styling

Nav icon mapping (Material Symbols names):
- Home → `home`
- Messages → `chat_bubble` (with red badge)
- Attendance → `assignment_turned_in`
- Payments → `payments`
- Calendar → `calendar_month`
- Forms → `description`
- Settings → `settings`
- Staff Management → `shield_person`

Keep existing: `trpc.auth.getSession.useQuery()`, `authClient.signOut()`, role-based nav logic, mobile menu state.

Remove: `SearchBar` component import (search will be page-specific later), `lucide-react` imports.

**Step 2: Verify build**

Run: `cd /Users/hitenpatel/dev/personal/abridge && npx pnpm build --filter @schoolconnect/web`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: redesign dashboard sidebar to Abridge style with Material Symbols"
```

---

## Task 4: Redesign Home Dashboard Page

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx` (lines 1-128)
- Modify: `apps/web/src/components/dashboard/summary-cards.tsx`
- Modify: `apps/web/src/components/dashboard/today-overview.tsx`
- Modify: `apps/web/src/components/dashboard/this-week.tsx`

**Step 1: Rewrite `page.tsx`**

Reference: `stitch-designs/desktop/html/06-home-dashboard.html` (full file)

Replace the entire page with Abridge Home Dashboard design. Keep existing data fetching:
- `authClient.useSession()` for auth
- `trpc.dashboard.getSummary.useQuery()` for summary data
- Auth redirect logic

New layout structure:
```
<header> — Date + "Hi, Sarah! 👋" + Quick Update button + notification bell
<div grid cols-1 lg:cols-3 gap-8>
  <div lg:col-span-2>
    Hero card (child status, gradient bg)
    Quick actions grid (4 cols)
    Today & Upcoming section (event cards with colored borders)
  </div>
  <div>
    This Week's Progress (attendance bar + participation bar)
    Achievements grid (2x2)
    Up Next card
    Recent Payment card
  </div>
</div>
```

Map existing data to new UI:
- `summaryData.children[0]` → Hero card (child name, attendance status)
- `summaryData.metrics` → Summary info in progress bars
- `summaryData.upcomingEvents` → Today & Upcoming cards
- `summaryData.todayAttendance` → Attendance percentage in progress
- `summaryData.attendancePercentage` → Progress bar width

**Step 2: Update dashboard components**

Rewrite `summary-cards.tsx`, `today-overview.tsx`, `this-week.tsx` to match new design, or inline their content directly in the page if simpler.

**Step 3: Verify build**

Run: `cd /Users/hitenpatel/dev/personal/abridge && npx pnpm build --filter @schoolconnect/web`

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx apps/web/src/components/dashboard/
git commit -m "feat: redesign home dashboard with Abridge hero card and event timeline"
```

---

## Task 5: Redesign Attendance Hub Page

**Files:**
- Modify: `apps/web/src/app/dashboard/attendance/page.tsx` (lines 1-118)
- Modify: `apps/web/src/components/attendance/attendance-list.tsx`
- Modify: `apps/web/src/components/attendance/absence-report-form.tsx`

**Step 1: Rewrite `attendance/page.tsx`**

Reference: `stitch-designs/desktop/html/07-attendance-hub.html` (full file)

New layout:
```
<header> — "Attendance Hub" + "95% Present" badge + Export Log button
<div grid cols-1 lg:cols-12 gap-8>
  <div lg:col-span-7>
    Calendar component (7-col CSS grid with colored attendance dots)
    Legend: Present (green), Late (yellow), Absent (orange)
  </div>
  <div lg:col-span-5>
    Status banner ("Leo is at School")
    Absence report form (radio cards, textarea, submit)
  </div>
</div>
```

Keep existing data fetching:
- `trpc.user.listChildren.useQuery()` for children
- Child selector (tabs/select) — keep but restyle
- `AttendanceList` component data — transform into calendar grid

**Step 2: Rewrite `attendance-list.tsx`**

Transform from list view to calendar grid view. The calendar should show a month view with 7-column grid. Each day cell shows a colored dot based on attendance status.

**Step 3: Rewrite `absence-report-form.tsx`**

Restyle to match Stitch design:
- Reason selection: 2x2 grid of radio card buttons with icons (Sick, Appointment, Family/Trip, Other)
- Each card: `peer-checked:border-primary peer-checked:bg-primary/5`
- Full-width submit button: `bg-primary text-white rounded-xl shadow-lg shadow-primary/30`

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/attendance/ apps/web/src/components/attendance/
git commit -m "feat: redesign attendance hub with calendar grid and absence form"
```

---

## Task 6: Redesign Payment Wallet Page

**Files:**
- Modify: `apps/web/src/app/dashboard/payments/page.tsx` (lines 1-60)
- Modify: `apps/web/src/components/payments/outstanding-payments.tsx`
- Modify: `apps/web/src/components/payments/payment-item-list.tsx`

**Step 1: Rewrite `payments/page.tsx`**

Reference: `stitch-designs/desktop/html/08-payment-wallet.html` (full file)

New layout:
```
<div grid cols-1 lg:cols-12 gap-8>
  <div lg:col-span-7>
    Header: "Leo's School Expenses" + Upcoming/History toggle
    Due Soon section (payment cards with icons, amounts, Pay buttons)
    Recently Paid section (muted cards with strikethrough)
  </div>
  <div lg:col-span-5>
    Balance card with liquid-fill animation ($142.50)
    Quick Top-Up section (+$20, +$50, +$100 buttons + custom amount)
    Payment Methods card
  </div>
</div>
```

Keep existing data fetching:
- `trpc.auth.getSession.useQuery()` for session
- `trpc.stripe.getStripeStatus.useQuery()` for Stripe status
- `OutstandingPayments` and `PaymentItemList` components

**Step 2: Restyle payment components**

Update `outstanding-payments.tsx` to show payment items as cards with Material Symbols icons, colored backgrounds, due date badges, and Pay/Details buttons per the Stitch design.

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/payments/ apps/web/src/components/payments/
git commit -m "feat: redesign payment wallet with balance display and expense cards"
```

---

## Task 7: Redesign Messages / Chat Page

**Files:**
- Modify: `apps/web/src/app/dashboard/messages/page.tsx` (lines 1-195)
- Modify: `apps/web/src/components/messaging/message-list.tsx`
- Modify: `apps/web/src/components/messaging/composer.tsx`

**Step 1: Rewrite `messages/page.tsx`**

Reference: `stitch-designs/desktop/html/09-chat-interface-1.html` (full file)

This is the most complex page — two-panel chat layout.

New layout:
```
<main flex h-[calc(100vh-64px)]>
  <aside w-80 lg:w-96 border-r>
    Search input
    Filter tabs (All Chats, Unread, Teachers, Parents)
    Conversation list (avatar + name + preview + timestamp)
  </aside>
  <section flex-1 flex-col>
    Quiet hours banner (conditional)
    Contact header (avatar + name + role + action buttons)
    Message area (scrollable, date separators, message bubbles)
    Input area (attachment + textarea + emoji + mic + send)
  </section>
</main>
```

For the parent view, transform the current table-based message list into a chat interface:
- Left panel: List of message threads from `trpc.messaging.listReceived.useQuery()`
- Right panel: Selected message detail shown as chat-style bubbles

For staff view: Keep compose functionality but restyle.

**Step 2: Restyle message components**

- Message bubbles: Received = `bg-white rounded-2xl rounded-bl-sm`, Sent = `bg-primary text-white rounded-2xl rounded-br-sm`
- Contact avatars: `rounded-[20px]` (squircle)
- Active conversation: `bg-orange-50 border-orange-100`

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/messages/ apps/web/src/components/messaging/
git commit -m "feat: redesign messages page as two-panel chat interface"
```

---

## Task 8: Restyle Calendar, Forms, Staff Pages

**Files:**
- Modify: `apps/web/src/app/dashboard/calendar/page.tsx` (lines 1-16)
- Modify: `apps/web/src/components/calendar/event-list.tsx`
- Modify: `apps/web/src/app/dashboard/forms/page.tsx` (lines 1-162)
- Modify: `apps/web/src/app/dashboard/staff/page.tsx`

**Step 1: Restyle Calendar page**

No Stitch design exists — apply new theme:
- Title: `text-3xl font-bold` → replace SchoolConnect with Abridge style
- Event cards: `rounded-2xl shadow-soft` with colored left borders
- Date badges: `bg-secondary text-secondary-foreground` (yellow)
- Use Material Symbols icons for event types

**Step 2: Restyle Forms page**

Update the existing forms page:
- Replace lucide-react icons with Material Symbols
- Card styling: `rounded-2xl shadow-soft`
- Action Required badge: `bg-warning/10 text-warning`
- Submit buttons: `bg-primary rounded-xl`
- Completed badge: `bg-success`

**Step 3: Restyle Staff page**

Update table/management views:
- Replace icon imports with Material Symbols
- Card and table borders: `rounded-2xl`
- Primary button styling

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/calendar/ apps/web/src/app/dashboard/forms/ apps/web/src/app/dashboard/staff/ apps/web/src/components/calendar/
git commit -m "feat: restyle calendar, forms, and staff pages with Abridge theme"
```

---

## Task 9: Update UI Components Library

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/card.tsx`
- Modify: `apps/web/src/components/ui/badge.tsx`
- Modify: `apps/web/src/components/ui/input.tsx`

**Step 1: Update button.tsx**

Update default border-radius to `rounded-xl` (from `rounded-md`). Primary variant already uses CSS var colors so it auto-updates. Ensure hover states use the new glow shadow.

**Step 2: Update card.tsx**

Change default border-radius to `rounded-2xl` (from `rounded-lg`). Add `shadow-soft` as default shadow.

**Step 3: Update badge.tsx**

Ensure success/warning/info variants use the new coral/yellow/teal palette.

**Step 4: Update input.tsx**

Default border-radius to `rounded-xl`. Focus ring to primary color (already via CSS var).

**Step 5: Commit**

```bash
git add apps/web/src/components/ui/
git commit -m "feat: update UI component library with Abridge border-radius and shadows"
```

---

## Task 10: Final Cleanup & Verification

**Files:**
- Various files across `apps/web/src/`

**Step 1: Remove unused lucide-react imports**

Search all files for remaining `lucide-react` imports and replace with Material Symbols spans where needed. Some utility components may still use lucide — replace on a case-by-case basis.

Run: `grep -r "lucide-react" apps/web/src/ --include="*.tsx" --include="*.ts" -l`

**Step 2: Update any remaining "SchoolConnect" text references**

Run: `grep -r "SchoolConnect" apps/web/src/ --include="*.tsx" --include="*.ts" -l`

Replace all occurrences with "Abridge".

**Step 3: Lint and build**

Run: `cd /Users/hitenpatel/dev/personal/abridge && npx pnpm lint:fix && npx pnpm build --filter @schoolconnect/web`

Fix any lint errors or build failures.

**Step 4: Visual verification**

Start dev server and visually check each page:
Run: `cd /Users/hitenpatel/dev/personal/abridge && npx pnpm dev`

Check:
- [ ] Home Dashboard — hero card, quick actions, events, progress bars
- [ ] Attendance Hub — calendar grid, absence form
- [ ] Payment Wallet — balance display, due items, top-up
- [ ] Messages — two-panel chat layout
- [ ] Calendar — restyled event list
- [ ] Forms — restyled form cards
- [ ] Staff — restyled management page
- [ ] Sidebar navigation — all items, active state, mobile menu
- [ ] Dark mode toggle — all pages

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: cleanup remaining SchoolConnect references and fix lint"
```

---

## Execution Order & Dependencies

```
Task 1 (Theme)
  └── Task 2 (Root Layout + Font)
       └── Task 3 (Dashboard Layout / Sidebar)
            ├── Task 4 (Home Dashboard)
            ├── Task 5 (Attendance Hub)
            ├── Task 6 (Payment Wallet)
            ├── Task 7 (Messages Chat)
            ├── Task 8 (Calendar, Forms, Staff)
            └── Task 9 (UI Components)
                 └── Task 10 (Cleanup & Verify)
```

Tasks 4-9 can be parallelized after Task 3 is complete.
