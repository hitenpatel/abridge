## Why

Users have no way to manage their personal preferences or account details. Notification settings (push, SMS, email, quiet hours) exist in the database but are inaccessible through the UI. Admins cannot configure school-level defaults. The `/dashboard/settings` route is in the navigation but renders nothing.

## What Changes

- Add settings page to web dashboard with three card sections: Profile, Notifications, School Settings (admin only)
- Add settings screen to mobile app with the same sections
- Add `settingsRouter` to the API consolidating profile and notification preference management
- Move `user.updateNotificationPreferences` into the new settings router
- Add default notification preference fields to the `School` model (`defaultNotifyByPush`, `defaultNotifyBySms`, `defaultNotifyByEmail`)
- Apply school notification defaults when new users join via invitation acceptance
- Add "Settings" navigation link for all roles (web sidebar + mobile menu)

## Capabilities

### New Capabilities
- `user-settings`: Personal profile management (name, phone) and notification preferences (channel toggles, quiet hours) for all authenticated users across web and mobile
- `school-settings`: School-level configuration (school name, default notification preferences for new members) accessible only to admin staff

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- **Schema**: Three new boolean fields on `School` model
- **API**: New `settingsRouter` (6 procedures). Existing `user.updateNotificationPreferences` moved — callers updated
- **Web**: New page at `apps/web/src/app/dashboard/settings/page.tsx`. Navigation updated for all roles
- **Mobile**: New `SettingsScreen`. Navigation updated to include settings access
- **Invitation flow**: Updated to apply school default notification preferences to new users
