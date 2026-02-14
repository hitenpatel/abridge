# Settings Page Design

Settings page for web and mobile — personal settings for all users, school-level settings for admins.

## Scope

- Web: `/dashboard/settings` (new page, route already in nav)
- Mobile: `SettingsScreen` (new screen, added to navigation)
- API: new `settingsRouter` consolidating settings-related procedures
- Schema: three new fields on `School` model for default notification prefs

## Page Structure

Single scrollable page with card sections. Per-section save buttons (Approach A).

| Section | Parent | Teacher/Office | Admin |
|---------|--------|----------------|-------|
| Profile | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes |
| School Settings | No | No | Yes |

## Cards

### Profile Card

- **Name**: text input, editable, required
- **Email**: text input, read-only (greyed out, "Contact admin to change" hint)
- **Phone**: text input, editable, optional
- Save button

### Notifications Card

- **Push notifications**: toggle
- **SMS notifications**: toggle
- **Email notifications**: toggle
- **Quiet hours**: toggle to enable/disable
  - Start time picker + end time picker (shown when enabled)
  - Note: "Urgent messages will still be delivered during quiet hours"
- Save button

### School Settings Card (admin only)

- **School name**: text input, required
- **Default notification preferences for new members** (section heading):
  - Push: toggle
  - SMS: toggle
  - Email: toggle
- Save button

## Schema Changes

Three new fields on `School`:

```prisma
model School {
  // existing...
  defaultNotifyByPush   Boolean @default(true)
  defaultNotifyBySms    Boolean @default(false)
  defaultNotifyByEmail  Boolean @default(true)
}
```

School defaults are applied when new users join (invitation acceptance / account creation). Existing users are not affected.

## API Layer — settingsRouter

| Procedure | Type | Auth | Purpose |
|-----------|------|------|---------|
| `getProfile` | query | protectedProcedure | Fetch name, email, phone |
| `updateProfile` | mutation | protectedProcedure | Update name, phone |
| `getNotificationPreferences` | query | protectedProcedure | Fetch toggles + quiet hours |
| `updateNotificationPreferences` | mutation | protectedProcedure | Update toggles + quiet hours |
| `getSchoolSettings` | query | schoolAdminProcedure | Fetch school name + default prefs |
| `updateSchoolSettings` | mutation | schoolAdminProcedure | Update school name + default prefs |

The existing `user.updateNotificationPreferences` procedure moves into this router. `user.updatePushToken` stays in the user router (automatic operation, not user-facing).

## UI Details

### Web

- `apps/web/src/app/dashboard/settings/page.tsx` ("use client")
- Three card components: ProfileCard, NotificationsCard, SchoolSettingsCard
- Loading skeleton while data fetches
- Save button shows spinner during save, then success toast ("Settings saved") or inline error
- Form validation: name required, phone format check, quiet end after quiet start

### Mobile

- `apps/mobile/src/screens/SettingsScreen.tsx`
- ScrollView with section cards using existing Stitch design system
- Native time pickers for quiet hours
- Toggle switches for notification prefs
- Per-section save buttons
- Role check to conditionally show School Settings

### Navigation

- Web: "Settings" link in sidebar nav for all roles
- Mobile: "Settings" accessible from profile/menu area

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Save fails (network) | Inline error: "Failed to save. Please try again." |
| Empty name | Field-level error before submission |
| Unauthorized school settings | Section not rendered + server rejects via schoolAdminProcedure |
| Quiet end before quiet start | Field-level error: "End time must be after start time" |

## Testing

### E2E — Web (Playwright)

- Parent views settings, updates name, verifies save
- Parent toggles notification prefs, enables quiet hours, verifies save
- Admin sees school settings section, updates school name, verifies save
- Non-admin does not see school settings section

### E2E — Mobile (Maestro)

- Same flows adapted for mobile navigation

### API

- Settings procedures return correct data
- updateSchoolSettings rejects non-admin callers
- Validation errors return proper error codes
