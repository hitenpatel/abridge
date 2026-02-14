# Staff Analytics Dashboard

## Overview

Read-only analytics dashboard for staff to view trends and patterns across attendance, payments, forms, and messages. Query-on-demand from existing tables — no schema changes.

## Personas

- **School Admin**: Whole-school overview (primary)
- **Class Teacher**: Filter by their classes
- **Office Staff**: Same as Admin

## Approach

Query-on-demand (Approach A). Compute stats directly from existing Prisma models on each request. No materialized tables, no external analytics service. Add Redis caching later if needed.

## Page Structure

New page at `/dashboard/analytics`, staff-only. Added to sidebar navigation.

### Layout

- Top: date range selector (Today / This Week / This Month / This Term)
- Four summary cards in 2x2 grid, each with headline metric + sparkline trend
- Clicking a card expands an inline breakdown table (accordion)

### Date Ranges

| Preset | from | to |
|--------|------|----|
| Today | today | today |
| This Week | Monday | today |
| This Month | 1st of month | today |
| This Term | nearest past TERM_DATE event | today |

## API Design

New `analytics` tRPC router. Four procedures, all using `schoolStaffProcedure`.

### analytics.attendance({ schoolId, from, to })

```typescript
{
  todayRate: number           // percentage
  periodRate: number          // avg over date range
  trend: { date: Date, rate: number }[]  // daily points for sparkline
  belowThresholdCount: number // children below 90%
  byClass: {
    className: string
    rate: number
    presentCount: number
    totalCount: number
  }[]
}
```

Source: `AttendanceRecord` table. Group by date for trend, group by `child.className` for breakdown.

### analytics.payments({ schoolId, from, to })

```typescript
{
  outstandingTotal: number    // pence
  collectedTotal: number      // pence
  collectionRate: number      // percentage
  overdueCount: number
  byItem: {
    itemTitle: string
    collectedCount: number
    totalCount: number
    amount: number
    collectionRate: number
  }[]
}
```

Source: `PaymentItem`, `PaymentItemChild`, `Payment` tables. Filter by `dueDate` within range.

### analytics.forms({ schoolId, from, to })

```typescript
{
  pendingCount: number
  completionRate: number      // percentage
  byTemplate: {
    templateTitle: string
    submittedCount: number
    totalCount: number
    completionRate: number
  }[]
}
```

Source: `FormTemplate`, `FormResponse` tables. Filter templates by `createdAt` within range.

### analytics.messages({ schoolId, from, to })

```typescript
{
  sentCount: number
  avgReadRate: number         // percentage
  byMessage: {
    subject: string
    sentAt: Date
    readCount: number
    recipientCount: number
    readRate: number
  }[]
}
```

Source: `Message`, `MessageRead`, `MessageChild` tables. Filter by `sentAt` within range.

## Frontend Components

### Summary Cards

Each card shows:
- Headline metric (large number)
- Sparkline trend (inline SVG polyline, no chart library)
- 1-2 secondary metrics below

### Detail Tables (accordion expand)

| Card | Columns |
|------|---------|
| Attendance | Class, Rate, Present, Total |
| Payments | Item, Collected, Total, Rate, Amount |
| Forms | Form, Submitted, Total, Rate |
| Messages | Subject, Sent, Read, Rate |

### Sparkline

Simple inline SVG. Plot `trend[]` as a polyline path. No external dependencies.

### Loading

Skeleton cards while loading. Each card loads independently (four parallel tRPC calls).

## Role-Based Filtering

- Admin/Office: whole-school data, no filter
- Teacher: whole-school by default, can filter by their classes

Uses existing `schoolStaffProcedure` middleware. No new permissions.

## Schema Changes

None. All queries use existing tables.

## Future Extensions

- Actionable insights (resend buttons, reminder triggers)
- Export to PDF/CSV
- Class teacher filtered views
- Comparative analytics (this term vs last term)
- Redis caching for expensive queries
