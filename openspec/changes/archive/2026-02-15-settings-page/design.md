## Context

SchoolConnect has notification preference fields on the `User` model (`quietStart`, `quietEnd`, `phone`) and a `/dashboard/settings` route in the admin nav, but no settings page exists. Users cannot manage their profile or notification preferences through the UI. Admins have no way to configure school-level defaults.

The `User` model is missing explicit notification channel toggles (`notifyByPush`, `notifyBySms`, `notifyByEmail`) — these need to be added. The `School` model has no concept of default notification preferences for new members.

## Goals / Non-Goals

**Goals:**
- Expose personal profile editing (name, phone) and notification preferences (channel toggles, quiet hours) for all authenticated users
- Allow admins to configure school name and default notification preferences for new members
- Support both web dashboard and mobile app
- Apply school notification defaults when new users join via invitation

**Non-Goals:**
- Email change flow (requires re-verification, out of scope)
- Per-school notification overrides for existing users (defaults only apply to new users)
- School logo upload or branding settings
- Password change UI (handled by better-auth separately)
- Advanced quiet hours (per-day schedules)

## Decisions

**1. New `settingsRouter` instead of extending `userRouter`**

Consolidates all settings-related procedures in one router. The existing `user.updateNotificationPreferences` moves here. `user.updatePushToken` stays in the user router since it's called automatically by the mobile app, not by the user.

Alternative: Extend `userRouter` with more procedures. Rejected because mixing automatic system operations (push token) with user-facing settings makes the router harder to reason about.

**2. Per-section save buttons (not full-page form)**

Each card (Profile, Notifications, School Settings) has its own save button and calls its own mutation. This maps cleanly to separate tRPC procedures and avoids partial-save failures.

Alternative: Single save button for the whole page. Rejected because a failure in one section (e.g., school settings auth) would block saving another section (e.g., profile).

**3. Three new boolean fields on `School` model for notification defaults**

`defaultNotifyByPush`, `defaultNotifyBySms`, `defaultNotifyByEmail`. Applied during invitation acceptance for new users only. Simpler than a JSON config object and directly mirrors the User model fields.

Alternative: JSON `notificationDefaults` field. Rejected — no need for extensibility, three booleans are explicit and type-safe.

**4. Three new boolean fields on `User` model for notification channels**

`notifyByPush`, `notifyBySms`, `notifyByEmail`. The existing `quietStart`/`quietEnd` fields remain as-is (HH:mm strings, nullable).

Alternative: Reuse quiet hours as the only notification control. Rejected — users need channel-level toggles independent of quiet hours.

**5. `schoolAdminProcedure` for school settings (not a new middleware)**

Reuses the existing `schoolAdminProcedure` which requires `schoolId` input and verifies admin role. No new middleware needed.

## Risks / Trade-offs

**[Risk] Moving `updateNotificationPreferences` breaks existing mobile callers** → The mobile app currently calls `user.updateNotificationPreferences`. After moving to `settings.updateNotificationPreferences`, the mobile tRPC client needs updating. Both apps are in the same monorepo so this is a coordinated change.

**[Risk] Schema migration on production with existing data** → `db:push` adds columns with defaults (`true`/`false`), so existing rows get default values. No data migration needed. Rollback: remove columns (data loss is acceptable since these are new fields).

**[Trade-off] Quiet hours validation is client-side only** → We validate format (HH:mm regex) on the server but don't enforce "end after start" on the server since quiet hours can span midnight (e.g., 21:00–07:00). Client shows a hint but doesn't block save.
