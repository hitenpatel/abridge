## 1. Schema Changes

- [ ] 1.1 Add `notifyByPush`, `notifyBySms`, `notifyByEmail` boolean fields to `User` model in Prisma schema
- [ ] 1.2 Add `defaultNotifyByPush`, `defaultNotifyBySms`, `defaultNotifyByEmail` boolean fields to `School` model in Prisma schema
- [ ] 1.3 Run `db:push` and `db:generate` to sync schema and regenerate Prisma client

## 2. API — Settings Router

- [ ] 2.1 Create `apps/api/src/router/settings.ts` with `getProfile` and `updateProfile` procedures
- [ ] 2.2 Add `getNotificationPreferences` and `updateNotificationPreferences` procedures to settings router
- [ ] 2.3 Add `getSchoolSettings` and `updateSchoolSettings` procedures (using `schoolAdminProcedure`)
- [ ] 2.4 Register `settingsRouter` in `apps/api/src/router/index.ts`
- [ ] 2.5 Remove `updateNotificationPreferences` from `apps/api/src/router/user.ts`
- [ ] 2.6 Verify build passes with no type errors

## 3. API — Invitation Defaults

- [ ] 3.1 Update `invitation.accept` procedure to apply school default notification preferences for new users

## 4. Web — Settings Page

- [ ] 4.1 Create `apps/web/src/app/dashboard/settings/page.tsx` with ProfileCard component
- [ ] 4.2 Add NotificationsCard component with channel toggles and quiet hours
- [ ] 4.3 Add SchoolSettingsCard component (admin-only, with school name and default notification toggles)
- [ ] 4.4 Add loading skeletons for all cards

## 5. Web — Navigation

- [ ] 5.1 Add Settings nav link to `parentNav` and `staffNav` arrays in dashboard layout
- [ ] 5.2 Remove duplicate Settings entry from `adminNav` (already in staffNav)

## 6. Mobile — Settings Screen

- [ ] 6.1 Create `apps/mobile/src/screens/SettingsScreen.tsx` with Profile, Notifications, and School Settings sections
- [ ] 6.2 Add Settings route to `AppNavigator.tsx` and navigation menu

## 7. Seed Data

- [ ] 7.1 Update seed script with `defaultNotifyByPush/Sms/Email` on School and `notifyByPush/Sms/Email` on Users
- [ ] 7.2 Verify seed runs without errors

## 8. E2E Tests

- [ ] 8.1 Write Playwright E2E test: parent views settings, updates profile
- [ ] 8.2 Write Playwright E2E test: parent updates notification preferences with quiet hours
- [ ] 8.3 Write Playwright E2E test: admin views and updates school settings
- [ ] 8.4 Write Playwright E2E test: non-admin cannot see school settings section

## 9. Verification

- [ ] 9.1 Run linter and fix any issues
- [ ] 9.2 Run full build
- [ ] 9.3 Run all tests (unit + E2E)
