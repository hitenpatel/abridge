# Mobile E2E Tests with Maestro — Design

**Date:** 2026-03-04
**Status:** Approved

## Summary

Add comprehensive Maestro e2e tests for the mobile app covering all 21 existing screens, matching web e2e scenario coverage. Run on Android emulator in GitHub Actions (every push) and iOS simulator (manual trigger only).

## Decisions

- **Framework:** Maestro (YAML-based flows)
- **Scope:** Test existing 21 mobile screens only (no new screens)
- **Android CI:** Emulator on GitHub Actions ubuntu runner, every push
- **iOS CI:** Simulator on GitHub Actions macOS runner, manual trigger only (10x minute multiplier)
- **API backend:** PostgreSQL + API on localhost, same pattern as web e2e
- **APK build:** Local `expo prebuild` + Gradle on runner (no EAS Build needed)
- **Firebase Robo:** Remove from CI (replaced by scripted Maestro tests)

## CI Architecture

```
.github/workflows/ci.yml
├── e2e-web (every push) — unchanged
├── e2e-mobile-android (every push) — REPLACES current Firebase Robo job
│   ├── Start PostgreSQL + seed data
│   ├── Start API server on localhost:4000
│   ├── expo prebuild --platform android
│   ├── Gradle assembleDebug (EXPO_PUBLIC_API_URL=http://10.0.2.2:4000)
│   ├── Boot Android emulator (API 34)
│   ├── Install Maestro CLI
│   └── Run all .maestro/ flows
└── e2e-mobile-ios (workflow_dispatch only) — NEW
    ├── runs-on: macos-latest
    ├── Same API/DB setup
    ├── expo prebuild --platform ios + xcodebuild
    ├── Boot iOS simulator
    ├── Install Maestro CLI
    └── Run all .maestro/ flows
```

### Budget estimate (2,000 free GitHub Actions min/month)

- Android e2e: ~20 min × 30 pushes = 600 min
- iOS e2e: ~15 min real × 10x = 150 min × ~8 runs/month = 1,200 min
- Web e2e: ~7 min × 30 pushes = 210 min
- Total: ~2,010 min (tight, run iOS sparingly)

## Maestro Flow Inventory (21 flows)

### Auth flows
| Flow | Scenarios |
|------|-----------|
| `auth/login.yaml` | Valid login, error for invalid credentials |
| `auth/register.yaml` | Register new parent, redirect to home |
| `auth/logout.yaml` | Login then logout |

### Parent flows
| Flow | Scenarios |
|------|-----------|
| `parent/home.yaml` | Welcome message, action items, child section |
| `parent/navigation.yaml` | Navigate all parent tabs |
| `parent/messages.yaml` | View inbox, open message detail |
| `parent/attendance.yaml` | View attendance records, report absence |
| `parent/payments.yaml` | Outstanding payments list, history link |
| `parent/forms.yaml` | View forms list, open form detail |
| `parent/calendar.yaml` | Month view, navigation, events |
| `parent/search.yaml` | Global search, results display |
| `parent/settings.yaml` | Profile, notifications, theme toggle |

### Staff flows
| Flow | Scenarios |
|------|-----------|
| `staff/home.yaml` | Stats cards, recent posts |
| `staff/navigation.yaml` | Navigate all staff tabs |
| `staff/messages-compose.yaml` | Compose and send message |
| `staff/attendance.yaml` | Today's stats, per-child records |
| `staff/payments.yaml` | Payment items, create button |
| `staff/posts.yaml` | Post detail, emoji reactions |

### Admin flows
| Flow | Scenarios |
|------|-----------|
| `admin/staff-management.yaml` | View staff list, send invitation |

### Error handling
| Flow | Scenarios |
|------|-----------|
| `error-cases.yaml` | Invalid login, invalid registration fields |

### Helpers (not standalone tests)
| Flow | Purpose |
|------|---------|
| `_helpers/login-parent.yaml` | Reusable: clear state, login as parent |
| `_helpers/login-staff.yaml` | Reusable: clear state, login as staff |

## Test Data Strategy

- Run `db:seed` before tests (same as web e2e)
- Seed provides: school, parent user, staff user, children, messages, attendance records, payment items, form templates, events
- Seeded accounts: `parent@test.com` / `password123`, staff account from seed
- Maestro flows are sequential — no per-test seeding needed

## App Configuration

- Update `appId` in flows from `host.exp.Exponent` (Expo Go) to actual debug build package name
- Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` for Android (emulator localhost alias)
- Set `EXPO_PUBLIC_API_URL=http://localhost:4000` for iOS simulator
- Build debug APK: `npx expo prebuild --platform android && cd android && ./gradlew assembleDebug`
- Build iOS: `npx expo prebuild --platform ios && xcodebuild -workspace ios/*.xcworkspace -scheme <app> -sdk iphonesimulator -configuration Debug`

## Flow Structure

```
apps/mobile/.maestro/
├── _helpers/
│   ├── login-parent.yaml
│   └── login-staff.yaml
├── auth/
│   ├── login.yaml
│   ├── register.yaml
│   └── logout.yaml
├── parent/
│   ├── home.yaml
│   ├── navigation.yaml
│   ├── messages.yaml
│   ├── attendance.yaml
│   ├── payments.yaml
│   ├── forms.yaml
│   ├── calendar.yaml
│   ├── search.yaml
│   └── settings.yaml
├── staff/
│   ├── home.yaml
│   ├── navigation.yaml
│   ├── messages-compose.yaml
│   ├── attendance.yaml
│   ├── payments.yaml
│   └── posts.yaml
├── admin/
│   └── staff-management.yaml
└── error-cases.yaml
```
