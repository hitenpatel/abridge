## 1. Schema & Database

- [x] 1.1 Add 10 boolean fields to the School model in `packages/db/prisma/schema.prisma`: `messagingEnabled`, `paymentsEnabled`, `attendanceEnabled`, `calendarEnabled`, `formsEnabled`, `paymentDinnerMoneyEnabled`, `paymentTripsEnabled`, `paymentClubsEnabled`, `paymentUniformEnabled`, `paymentOtherEnabled` — all `Boolean @default(true)`
- [x] 1.2 Run `db:push` to apply the schema changes
- [x] 1.3 Run `db:generate` to regenerate the Prisma client
- [x] 1.4 Update seed script in `packages/db/prisma/seed.ts` to set all 10 toggle fields explicitly to `true` on seeded schools

## 2. API Middleware & Guards

- [x] 2.1 Create `assertFeatureEnabled` helper in `apps/api/src/lib/feature-guards.ts` that takes context and a feature name, throws `TRPCError({ code: 'FORBIDDEN' })` with descriptive message if the feature toggle is `false`
- [x] 2.2 Create `assertPaymentCategoryEnabled` helper in the same file that checks both `paymentsEnabled` and the specific category sub-toggle, mapping `PaymentCategory` enum values to their corresponding boolean field
- [x] 2.3 Add `schoolFeatureProcedure` middleware in `apps/api/src/trpc.ts` that extends `schoolStaffProcedure`, queries `prisma.school.findUnique` selecting only the 10 toggle fields, and adds `ctx.schoolFeatures`

## 3. API Router Guards

- [x] 3.1 Add `assertFeatureEnabled(ctx, 'messaging')` guard to all procedures in `apps/api/src/router/messaging.ts`
- [x] 3.2 Add `assertFeatureEnabled(ctx, 'payments')` guard to all procedures in `apps/api/src/router/payments.ts`
- [x] 3.3 Add `assertPaymentCategoryEnabled` guard to the payment item creation procedure in `payments.ts`
- [x] 3.4 Add `assertFeatureEnabled(ctx, 'attendance')` guard to all procedures in `apps/api/src/router/attendance.ts`
- [x] 3.5 Add `assertFeatureEnabled(ctx, 'calendar')` guard to all procedures in `apps/api/src/router/calendar.ts`
- [x] 3.6 Add `assertFeatureEnabled(ctx, 'forms')` guard to all procedures in `apps/api/src/router/forms.ts`

## 4. API Settings Endpoints

- [x] 4.1 Add `getFeatureToggles` procedure to `apps/api/src/router/settings.ts` using `schoolStaffProcedure` — returns all 10 toggle values for the school
- [x] 4.2 Add `updateFeatureToggles` procedure to `settings.ts` using `schoolAdminProcedure` — accepts partial object of toggle booleans, persists changes, returns updated toggles

## 5. Web — Feature Toggle Context & Navigation

- [x] 5.1 Create a `FeatureToggleContext` React context and provider that fetches toggles via `settings.getFeatureToggles` and exposes them to child components
- [x] 5.2 Add the `FeatureToggleProvider` to the dashboard layout in `apps/web/src/app/dashboard/layout.tsx`
- [x] 5.3 Filter dashboard navigation items based on feature toggle context — hide nav items for disabled features
- [x] 5.4 Create a `FeatureDisabled` component that displays an informational message when a user navigates directly to a disabled feature's page
- [x] 5.5 Add the `FeatureDisabled` guard to each feature page (messaging, payments, attendance, calendar, forms) that checks context and renders the disabled message if the feature is off

## 6. Web — Settings Page

- [x] 6.1 Add a "Features" card/section to the school settings page with toggle switches for Messaging, Payments, Attendance, Calendar, and Forms
- [x] 6.2 Add payment category sub-toggles (Dinner Money, Trips, Clubs, Uniform, Other) indented beneath the Payments toggle, visible only when Payments is enabled
- [x] 6.3 Wire the feature toggles UI to `settings.updateFeatureToggles` mutation with success/error feedback

## 7. Mobile

- [x] 7.1 Fetch feature toggles in the mobile app and store in app state
- [x] 7.2 Filter mobile tab/screen navigation to hide disabled features

## 8. Tests

- [x] 8.1 Write unit tests for `assertFeatureEnabled` and `assertPaymentCategoryEnabled` helpers
- [x] 8.2 Write API tests for `settings.getFeatureToggles` and `settings.updateFeatureToggles` (auth, partial updates, non-admin rejection)
- [x] 8.3 Write API tests for feature guards on each router (verify FORBIDDEN when disabled, normal operation when enabled)
- [x] 8.4 Write API tests for payment category sub-toggle enforcement on PaymentItem creation
