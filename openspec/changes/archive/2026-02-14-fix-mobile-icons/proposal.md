## Why

Mobile app displays "?" characters instead of icons across all screens. The MaterialIcons font from `@expo/vector-icons` is not being loaded in the `useFonts` hook in `App.tsx`, so the icon glyphs are unavailable at render time.

## What Changes

- Add MaterialIcons font to the `useFonts` hook in `App.tsx` so icon glyphs load before the app renders
- Verify all icon usages across screens render correctly after the fix

## Capabilities

### New Capabilities

_None — this is a bug fix, not a new capability._

### Modified Capabilities

_None — no spec-level behavior changes, just a missing font loading configuration._

## Impact

- **Code**: `apps/mobile/App.tsx` (font loading config)
- **Screens affected**: All screens using `MaterialIcons` — FloatingTabBar, StaffHomeScreen, ParentHomeScreen, MessagesScreen, CalendarScreen, StaffAttendanceScreen, and others
- **Dependencies**: No new dependencies needed; `@expo/vector-icons` is already installed
