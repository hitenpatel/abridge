## 1. Analytics tRPC Router

- [x] 1.1 Create `apps/api/src/router/analytics.ts` with four procedures (`attendance`, `payments`, `forms`, `messages`), each using `schoolStaffProcedure` and accepting `schoolId`, `from`, `to` inputs
- [x] 1.2 Register the analytics router in `apps/api/src/router/index.ts`

## 2. Attendance Analytics

- [x] 2.1 Implement `analytics.attendance` — query `AttendanceRecord` for todayRate, periodRate, daily trend, belowThresholdCount, and byClass breakdown. Exclude `NOT_REQUIRED` marks from rate calculations.

## 3. Payment Analytics

- [x] 3.1 Implement `analytics.payments` — query `PaymentItem`, `PaymentItemChild`, `Payment` for outstandingTotal, collectedTotal, collectionRate, overdueCount, and byItem breakdown. Amounts in pence.

## 4. Forms Analytics

- [x] 4.1 Implement `analytics.forms` — query `FormTemplate`, `FormResponse` for pendingCount, completionRate, and byTemplate breakdown.

## 5. Message Analytics

- [x] 5.1 Implement `analytics.messages` — query `Message`, `MessageRead`, `MessageChild` for sentCount, avgReadRate, and byMessage breakdown. Calculate read rate from distinct parent users via ParentChild.

## 6. Dashboard Page

- [x] 6.1 Create `apps/web/src/app/dashboard/analytics/page.tsx` with date range selector (Today, This Week, This Month, This Term) and four summary cards in 2x2 grid
- [x] 6.2 Implement sparkline component — inline SVG polyline rendering from trend data array
- [x] 6.3 Implement expandable card detail tables (attendance by class, payments by item, forms by template, messages by message)
- [x] 6.4 Add skeleton loading states for each card (independent loading)

## 7. Navigation

- [x] 7.1 Add "Analytics" item to dashboard sidebar in `apps/web/src/app/dashboard/layout.tsx`, visible to staff roles only

## 8. Date Range Logic

- [x] 8.1 Implement "This Term" calculation — find most recent past `TERM_DATE` event from calendar, fall back to September 1st if none exists

## 9. Testing

- [x] 9.1 Write API tests for the four analytics procedures — happy path, empty data, auth rejection
