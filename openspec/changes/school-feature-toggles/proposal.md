## Why

Schools have different operational needs — some don't use payments, others don't need attendance tracking or forms. Currently all features are always visible and accessible, cluttering the interface and exposing functionality that doesn't apply. Per-school feature toggles let admins tailor the platform to their school's actual workflow.

## What Changes

- Add 10 boolean fields to the School model: 5 master feature toggles (messaging, payments, attendance, calendar, forms) and 5 payment category sub-toggles (dinner money, trips, clubs, uniform, other)
- All toggles default to `true` — schools opt out of features they don't need
- API guards on every feature router procedure that check toggles before executing, returning FORBIDDEN if disabled
- Feature toggle context loaded in school-scoped middleware so guards are lightweight
- Settings UI extended with a "Features" section where admins manage toggles
- Web and mobile navigation hides disabled features
- Payment creation additionally checks the specific category sub-toggle

## Capabilities

### New Capabilities
- `school-feature-toggles`: Per-school boolean toggles controlling access to Messaging, Payments, Attendance, Calendar, and Forms features, with payment category sub-toggles. Covers data model, API guards, middleware context, and toggle management endpoints.

### Modified Capabilities
- `school-settings`: Admin settings page gains a "Features" section with toggle switches for each feature and payment category sub-toggles.

## Impact

- **Schema**: 10 new boolean columns on the `School` table (migration required)
- **API routers**: `messaging.ts`, `payments.ts`, `attendance.ts`, `calendar.ts`, `forms.ts` — each gains a feature guard at the top of every procedure
- **API middleware**: `schoolStaffProcedure` in `trpc.ts` extended to load toggle fields into context
- **API settings**: `settings.ts` gains `getFeatureToggles` and `updateFeatureToggles` procedures
- **Web**: Dashboard layout nav conditionally renders items; settings page adds feature toggle UI; disabled feature pages show informational message
- **Mobile**: Tab/screen navigation hides disabled features
- **Seed data**: Updated to set toggle values explicitly
