# School Feature Toggles Design

## Problem

Schools have different needs. Some don't use payments, others don't need forms or attendance tracking. Currently all features are always visible and accessible for every school. We need per-school feature toggles so admins can enable/disable features.

## Requirements

- 5 main toggleable features: Messaging, Payments, Attendance, Calendar, Forms
- Always-on features: Auth, Staff Management, Dashboard, Analytics
- School Admins control their own toggles
- Data preserved when a feature is disabled (just hidden, not deleted)
- All features default to ON for new schools
- Payment sub-toggles per category: Dinner Money, Trips, Clubs, Uniform, Other

## Approach: Boolean columns on School model

Chosen over a join table (overkill for 5+5 booleans) and a JSON field (loses type safety). Boolean columns are simple, type-safe, queryable, and match existing patterns on the School model.

## Data Model

10 new boolean fields on the `School` model:

```prisma
// Master feature toggles
messagingEnabled          Boolean @default(true)
paymentsEnabled           Boolean @default(true)
attendanceEnabled         Boolean @default(true)
calendarEnabled           Boolean @default(true)
formsEnabled              Boolean @default(true)

// Payment category sub-toggles (only apply when paymentsEnabled is true)
paymentDinnerMoneyEnabled Boolean @default(true)
paymentTripsEnabled       Boolean @default(true)
paymentClubsEnabled       Boolean @default(true)
paymentUniformEnabled     Boolean @default(true)
paymentOtherEnabled       Boolean @default(true)
```

Existing schools receive `true` for all via migration defaults. Seed data sets them explicitly.

## API Layer

### Middleware

Extend `schoolStaffProcedure` to select the 10 toggle fields and attach to `ctx.schoolFeatures`.

### Feature guard

Helper function `assertFeatureEnabled(ctx, feature)` that throws `TRPCError` with `FORBIDDEN` code if the feature toggle is `false`.

For payments, a second helper `assertPaymentCategoryEnabled(ctx, category)` checks both the master `paymentsEnabled` AND the specific category toggle.

### Guards placement

Each feature router's procedures call the guard at the top:
- `messaging.ts` procedures: `assertFeatureEnabled(ctx, 'messaging')`
- `payments.ts` procedures: `assertFeatureEnabled(ctx, 'payments')` + category check on create
- `attendance.ts` procedures: `assertFeatureEnabled(ctx, 'attendance')`
- `calendar.ts` procedures: `assertFeatureEnabled(ctx, 'calendar')`
- `forms.ts` procedures: `assertFeatureEnabled(ctx, 'forms')`

### Settings router

Two new procedures in `settings.ts`:
- `getFeatureToggles` (schoolStaffProcedure): Returns all 10 toggle values
- `updateFeatureToggles` (schoolAdminProcedure): Accepts partial update of any toggle

## Web Layer

### Navigation

In `dashboard/layout.tsx`, fetch feature toggles and conditionally render nav items. Direct URL access to disabled features shows "Feature not enabled" message.

### Settings page

Add a "Features" section to school settings. Shows master toggles with descriptions. Payments section shows sub-toggles (indented) when master is on.

## Mobile Layer

Hide tabs/screens for disabled features. Deep links to disabled features show an informational message.

## Error Handling

- API: `FORBIDDEN` TRPCError with descriptive message per feature
- Web: Inline "feature not enabled" message on disabled pages
- Mobile: Feature screens hidden; deep links show disabled message
