# Mobile Theme Redesign Design

**Date:** 2026-02-13
**Status:** Approved

## Goal

Align the mobile app (Expo/React Native) with the web app's updated Abridge design system. The result should feel native, responsive, and visually consistent with the web across both light and dark modes.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Styling library | NativeWind v4 | Shared Tailwind class naming with web, `dark:` prefix support |
| Token sharing | Shared `packages/ui-config` package | Single source of truth across web and mobile |
| Dark mode | Light + dark, system-adaptive | Full parity with web; stored preference via SecureStore |
| Component scope | Full design system | Reusable primitives to eliminate style duplication |

## Architecture

### 1. Shared Design Tokens (`packages/ui-config`)

New monorepo package consumed by both `apps/web` and `apps/mobile`:

```
packages/ui-config/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── radius.ts
│   ├── shadows.ts
│   └── tailwind-preset.ts
```

**Color tokens (light / dark):**

| Token | Light | Dark |
|-------|-------|------|
| primary | #FF7D45 | #FF7D45 |
| secondary | #FFD54F | #FFD54F |
| accent | #4DB6AC | #4DB6AC |
| background | #F7F8FA | #121212 |
| foreground | #2D3748 | #E5E7EB |
| card | #FFFFFF | #1E1E1E |
| muted | #F1F2F5 | #262626 |
| muted-foreground | #6B7280 | #9CA3AF |
| border | #E5E7EB | #262626 |
| destructive | #F87171 | #F87171 |
| success | #22C55E | #22C55E |
| warning | #EAB308 | #EAB308 |
| info | #0EA5E9 | #0EA5E9 |

**Additional tokens:** spacing (xs/s/m/l/xl), border-radius (sm/md/lg/xl/2xl/full), typography (Poppins 300-700), shadow presets.

### 2. NativeWind Setup

- `apps/mobile/tailwind.config.ts` extends `packages/ui-config` preset
- `apps/mobile/global.css` as NativeWind entry point
- `darkMode: 'class'` with `useColorScheme()` detection
- `ThemeProvider` context wrapping the app, preference persisted in SecureStore
- Poppins loaded via `expo-font`

### 3. Mobile Component Library (`apps/mobile/src/components/ui/`)

| Component | Description |
|-----------|-------------|
| Button | Variants: default, destructive, outline, secondary, ghost. Sizes: sm, default, lg. CVA-based. |
| Card | CardHeader, CardTitle, CardDescription, CardContent, CardFooter. rounded-2xl shadow-soft. |
| Badge | Semantic color variants (success, warning, destructive, info). Pill-shaped. |
| Input | rounded-xl, focus ring, disabled state. |
| Avatar | Circular with fallback initials. |
| Separator | Horizontal/vertical divider. |
| Alert | Semantic variants with icon positioning. |
| Typography | H1, H2, Body, Muted, Small — Poppins with proper weight mapping. |
| TabBar | Custom bottom tab bar with coral active indicator. |
| ListItem | Pressable row with icon, chevron, press feedback. |
| Modal | Bottom sheet with slide-up animation and backdrop. |
| Skeleton | Animated loading placeholder. |
| EmptyState | Icon + message + optional CTA. |

### 4. Screen Restyling

All 8 screens restyled with the component library:

| Screen | Key Changes |
|--------|-------------|
| LoginScreen | Coral brand header, Poppins typography, soft card, primary button with glow |
| DashboardScreen | Card-based stats, coral accents, child cards with avatar |
| MessagesScreen | rounded-2xl message cards, coral unread indicator, semantic category badges |
| MessageDetailScreen | Clean card layout, Poppins headings, coral accent bar |
| CalendarScreen | Coral active day, web-matching event cards, category badges |
| PaymentsScreen | Coral amount highlight, status badges, primary "Pay Now" CTA |
| AttendanceScreen | Coral child selector chips, status badges, updated report modal |
| SearchScreen | rounded-xl input, icon-based result cards |

**Navigation:** Coral active tab, muted inactive, Poppins header titles, dark mode adaptive.

### 5. Native-Feel Enhancements

| Enhancement | Implementation |
|-------------|---------------|
| Haptic feedback | expo-haptics on button presses and tab switches |
| Press states | Pressable with opacity/scale animation |
| Pull-to-refresh | RefreshControl with coral spinner |
| Safe areas | react-native-safe-area-context insets |
| Platform shadows | iOS shadow properties + Android elevation via NativeWind |
| Keyboard avoidance | KeyboardAvoidingView on form screens |
| Smooth scrolling | Native scroll physics |

## Migration Notes

- Remove all `StyleSheet.create()` blocks from screens
- Delete `src/lib/theme.ts` (replaced by shared tokens)
- Web's `globals.css` will be updated to import from the shared preset
- `expo-font` added for Poppins loading
- `expo-haptics` added for native feedback
- `nativewind` + `tailwindcss` added as dependencies
