## Why

Staff have no visibility into trends or patterns across their school. Attendance rates, payment collection, form completion, and message engagement data all exist in the database but are only visible as individual records. Admins preparing for governors' meetings, teachers checking on their classes, and office staff tracking operational tasks all lack a unified analytics view.

## What Changes

- Add a new `/dashboard/analytics` page visible to all staff roles (ADMIN, TEACHER, OFFICE)
- Add a new `analytics` tRPC router with four query procedures (attendance, payments, forms, messages)
- Add "Analytics" to the dashboard sidebar navigation
- Provide date range filtering (Today, This Week, This Month, This Term)
- Show summary cards with headline metrics and sparkline trends
- Show expandable detail breakdowns (by class, by payment item, by form template, by message)

## Capabilities

### New Capabilities

- `staff-analytics`: Analytics queries and dashboard for school staff — covers the tRPC router, date range logic, aggregation queries across attendance/payments/forms/messages, and the web dashboard page with summary cards, sparklines, and detail tables.

### Modified Capabilities

None. This is purely additive — no existing behaviour changes.

## Impact

- **API**: New `analytics` router added to `apps/api/src/router/` and registered in router index
- **Web**: New page at `apps/web/src/app/dashboard/analytics/page.tsx`, sidebar navigation updated in `apps/web/src/app/dashboard/layout.tsx`
- **Database**: No schema changes — all queries use existing tables (`AttendanceRecord`, `Payment`, `PaymentItem`, `PaymentItemChild`, `FormTemplate`, `FormResponse`, `Message`, `MessageRead`, `MessageChild`, `Event`)
- **Dependencies**: No new dependencies — sparklines rendered as inline SVG
