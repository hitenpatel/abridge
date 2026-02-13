# Mobile Theme Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the mobile app's visual design with the web app's Abridge theme (coral orange brand, Poppins font, light+dark mode) while feeling native and responsive.

**Architecture:** Shared design tokens in `packages/ui-config` consumed by both web and mobile Tailwind configs. NativeWind v4 replaces StyleSheet in the mobile app. A full component library eliminates style duplication across 8 screens.

**Tech Stack:** NativeWind v4, Tailwind CSS, Expo Font, expo-haptics, class-variance-authority, react-native-reanimated

---

### Task 1: Create Shared Design Tokens Package

**Files:**
- Create: `packages/ui-config/package.json`
- Create: `packages/ui-config/tsconfig.json`
- Create: `packages/ui-config/src/index.ts`
- Create: `packages/ui-config/src/colors.ts`
- Create: `packages/ui-config/src/tailwind-preset.ts`

**Step 1: Create package.json**

```json
{
  "name": "@schoolconnect/ui-config",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tailwind-preset": "./src/tailwind-preset.ts"
  },
  "devDependencies": {
    "@schoolconnect/tsconfig": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "@schoolconnect/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Step 3: Create colors.ts with all design tokens**

```typescript
export const colors = {
  light: {
    background: "#F7F8FA",
    foreground: "#2D3748",
    card: "#FFFFFF",
    "card-foreground": "#2D3748",
    primary: "#FF7D45",
    "primary-foreground": "#FFFFFF",
    secondary: "#FFD54F",
    "secondary-foreground": "#2D3748",
    muted: "#F1F2F5",
    "muted-foreground": "#6B7280",
    accent: "#4DB6AC",
    "accent-foreground": "#FFFFFF",
    destructive: "#F87171",
    "destructive-foreground": "#FFFFFF",
    border: "#E5E7EB",
    input: "#E5E7EB",
    ring: "#FF7D45",
    success: "#22C55E",
    "success-foreground": "#FFFFFF",
    warning: "#EAB308",
    "warning-foreground": "#2D3748",
    info: "#0EA5E9",
    "info-foreground": "#FFFFFF",
    // Attendance
    present: "#DCFCE7",
    "present-text": "#16A34A",
    late: "#FEF3C7",
    "late-text": "#D97706",
    absent: "#FEE2E2",
    "absent-text": "#DC2626",
  },
  dark: {
    background: "#121212",
    foreground: "#E5E7EB",
    card: "#1E1E1E",
    "card-foreground": "#E5E7EB",
    primary: "#FF7D45",
    "primary-foreground": "#FFFFFF",
    secondary: "#FFD54F",
    "secondary-foreground": "#FFFFFF",
    muted: "#262626",
    "muted-foreground": "#9CA3AF",
    accent: "#4DB6AC",
    "accent-foreground": "#FFFFFF",
    destructive: "#F87171",
    "destructive-foreground": "#E5E7EB",
    border: "#262626",
    input: "#262626",
    ring: "#FF7D45",
    success: "#22C55E",
    "success-foreground": "#FFFFFF",
    warning: "#EAB308",
    "warning-foreground": "#FFFFFF",
    info: "#0EA5E9",
    "info-foreground": "#FFFFFF",
    present: "#166534",
    "present-text": "#86EFAC",
    late: "#854D0E",
    "late-text": "#FDE68A",
    absent: "#991B1B",
    "absent-text": "#FCA5A5",
  },
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

export const fontFamily = {
  sans: ["Poppins", "sans-serif"],
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;
```

**Step 4: Create tailwind-preset.ts**

```typescript
import { colors, fontFamily } from "./colors";

export const abridgePreset = {
  theme: {
    extend: {
      colors: {
        border: colors.light.border,
        input: colors.light.input,
        ring: colors.light.ring,
        background: colors.light.background,
        foreground: colors.light.foreground,
        primary: {
          DEFAULT: colors.light.primary,
          foreground: colors.light["primary-foreground"],
        },
        secondary: {
          DEFAULT: colors.light.secondary,
          foreground: colors.light["secondary-foreground"],
        },
        destructive: {
          DEFAULT: colors.light.destructive,
          foreground: colors.light["destructive-foreground"],
        },
        muted: {
          DEFAULT: colors.light.muted,
          foreground: colors.light["muted-foreground"],
        },
        accent: {
          DEFAULT: colors.light.accent,
          foreground: colors.light["accent-foreground"],
        },
        card: {
          DEFAULT: colors.light.card,
          foreground: colors.light["card-foreground"],
        },
        success: {
          DEFAULT: colors.light.success,
          foreground: colors.light["success-foreground"],
        },
        warning: {
          DEFAULT: colors.light.warning,
          foreground: colors.light["warning-foreground"],
        },
        info: {
          DEFAULT: colors.light.info,
          foreground: colors.light["info-foreground"],
        },
      },
      fontFamily: {
        sans: fontFamily.sans,
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        glow: "0 0 15px rgba(255, 125, 69, 0.3)",
      },
    },
  },
} as const;
```

**Step 5: Create index.ts**

```typescript
export { colors, spacing, borderRadius, fontFamily, fontSize } from "./colors";
export { abridgePreset } from "./tailwind-preset";
```

**Step 6: Install dependencies**

Run: `npx pnpm install`
Expected: Workspace links resolve, no errors

**Step 7: Commit**

```bash
git add packages/ui-config/
git commit -m "feat: add shared ui-config package with design tokens"
```

---

### Task 2: Install and Configure NativeWind in Mobile App

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/babel.config.js`
- Create: `apps/mobile/tailwind.config.ts`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/nativewind-env.d.ts`
- Create: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/app.config.ts`

**Step 1: Install NativeWind and dependencies**

Run:
```bash
cd /Users/hitenpatel/dev/personal/abridge
npx pnpm --filter @schoolconnect/mobile add nativewind@^4 tailwindcss class-variance-authority
npx pnpm --filter @schoolconnect/mobile add -D @schoolconnect/ui-config@workspace:*
```

**Step 2: Create tailwind.config.ts**

```typescript
import { abridgePreset } from "@schoolconnect/ui-config/tailwind-preset";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [abridgePreset as unknown as Config],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**Step 3: Create global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Update babel.config.js**

```javascript
module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**Step 5: Create metro.config.js**

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, {
  input: "./global.css",
});
```

**Step 6: Create nativewind-env.d.ts**

```typescript
/// <reference types="nativewind/types" />
```

**Step 7: Update app.config.ts to rename to Abridge**

```typescript
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Abridge",
  slug: "abridge",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "abridge",
  platforms: ["ios", "android"],
  ios: {
    bundleIdentifier: "com.abridge.app",
    supportsTablet: true,
  },
  android: {
    package: "com.abridge.app",
    adaptiveIcon: {
      backgroundColor: "#FF7D45",
    },
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  },
});
```

**Step 8: Verify NativeWind compiles**

Run: `cd /Users/hitenpatel/dev/personal/abridge && npx pnpm --filter @schoolconnect/mobile dev`
Expected: Metro bundler starts without errors. Stop it after confirming.

**Step 9: Commit**

```bash
git add apps/mobile/
git commit -m "feat: configure NativeWind v4 with shared Abridge design tokens"
```

---

### Task 3: Add Theme Provider with Dark Mode Support

**Files:**
- Create: `apps/mobile/src/lib/theme-provider.tsx`
- Create: `apps/mobile/src/lib/use-theme.ts`
- Modify: `apps/mobile/App.tsx` (wrap with provider)
- Delete: `apps/mobile/src/lib/theme.ts` (after migration)

**Step 1: Create theme-provider.tsx**

```tsx
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

type ColorScheme = "light" | "dark" | "system";

interface ThemeContextValue {
  colorScheme: "light" | "dark";
  preference: ColorScheme;
  setPreference: (scheme: ColorScheme) => void;
  isDark: boolean;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  preference: "system",
  setPreference: () => {},
  isDark: false,
});

const THEME_KEY = "abridge_color_scheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ColorScheme>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback((scheme: ColorScheme) => {
    setPreferenceState(scheme);
    SecureStore.setItemAsync(THEME_KEY, scheme);
  }, []);

  const colorScheme =
    preference === "system" ? (systemScheme ?? "light") : preference;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ colorScheme, preference, setPreference, isDark: colorScheme === "dark" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
```

**Step 2: Create use-theme.ts**

```typescript
import { useContext } from "react";
import { ThemeContext } from "./theme-provider";

export function useTheme() {
  return useContext(ThemeContext);
}
```

**Step 3: Update App.tsx to use ThemeProvider**

Replace the entire `App.tsx` with the new version that:
- Imports `ThemeProvider` and wraps the app
- Loads Poppins fonts via `expo-font`
- Imports `./global.css` for NativeWind
- Uses NativeWind `className` instead of StyleSheet
- Sets `StatusBar` style based on theme
- Adds `colorScheme` class to root view for NativeWind dark mode

Key imports to add:
```tsx
import "./global.css";
import { useFonts } from "expo-font";
import { ThemeProvider } from "./src/lib/theme-provider";
import { useTheme } from "./src/lib/use-theme";
```

Remove: import of `theme` from `./src/lib/theme`, the `StyleSheet` block at the bottom.

**Step 4: Verify app loads with theme provider**

Run: `npx pnpm --filter @schoolconnect/mobile dev`
Expected: App loads, shows loading indicator while fonts load, then renders with new coral primary color.

**Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat: add ThemeProvider with dark mode and Poppins font loading"
```

---

### Task 4: Build Mobile Component Library — Typography & Button

**Files:**
- Create: `apps/mobile/src/components/ui/typography.tsx`
- Create: `apps/mobile/src/components/ui/button.tsx`
- Create: `apps/mobile/src/components/ui/index.ts`

**Step 1: Create typography.tsx**

Shared text components (`H1`, `H2`, `Body`, `Muted`, `Small`) that apply Poppins font family and proper sizing via NativeWind classes. Each accepts `className` for overrides.

```tsx
import { Text, type TextProps } from "react-native";

export function H1({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-2xl font-bold text-foreground font-sans ${className}`} {...props} />;
}

export function H2({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-lg font-semibold text-foreground font-sans ${className}`} {...props} />;
}

export function Body({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-sm text-foreground font-sans ${className}`} {...props} />;
}

export function Muted({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-sm text-muted-foreground font-sans ${className}`} {...props} />;
}

export function Small({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-xs text-muted-foreground font-sans ${className}`} {...props} />;
}
```

**Step 2: Create button.tsx**

Button component with variants (default, destructive, outline, secondary, ghost) and sizes (sm, default, lg) using CVA.

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, Text, type PressableProps } from "react-native";

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-xl",
  {
    variants: {
      variant: {
        default: "bg-primary active:opacity-90",
        destructive: "bg-destructive active:opacity-90",
        outline: "border border-border bg-transparent active:bg-accent",
        secondary: "bg-secondary active:opacity-80",
        ghost: "active:bg-accent",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const textVariants = cva("font-sans font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
    },
    size: {
      default: "text-sm",
      sm: "text-xs",
      lg: "text-base",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  className?: string;
  children: string;
}

export function Button({ variant, size, className = "", children, ...props }: ButtonProps) {
  return (
    <Pressable className={`${buttonVariants({ variant, size })} ${className}`} {...props}>
      <Text className={textVariants({ variant, size })}>{children}</Text>
    </Pressable>
  );
}
```

**Step 3: Create index.ts barrel export**

```typescript
export { H1, H2, Body, Muted, Small } from "./typography";
export { Button } from "./button";
```

**Step 4: Commit**

```bash
git add apps/mobile/src/components/ui/
git commit -m "feat: add Typography and Button components with CVA variants"
```

---

### Task 5: Build Component Library — Card, Badge, Input, Avatar

**Files:**
- Create: `apps/mobile/src/components/ui/card.tsx`
- Create: `apps/mobile/src/components/ui/badge.tsx`
- Create: `apps/mobile/src/components/ui/input.tsx`
- Create: `apps/mobile/src/components/ui/avatar.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

**Step 1: Create card.tsx**

Card with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` subcomponents. Uses `rounded-2xl bg-card shadow-soft border border-border`.

**Step 2: Create badge.tsx**

Pill-shaped badge with semantic variants (default, success, warning, destructive, info). Uses `rounded-full px-2.5 py-0.5 text-xs font-semibold`.

**Step 3: Create input.tsx**

Text input with `rounded-xl h-10 px-3 border border-input bg-background` and focus ring styling. Wraps React Native `TextInput`.

**Step 4: Create avatar.tsx**

Circular avatar with image support and fallback initials. Uses `rounded-full h-10 w-10 bg-muted items-center justify-center`.

**Step 5: Update index.ts with new exports**

**Step 6: Commit**

```bash
git add apps/mobile/src/components/ui/
git commit -m "feat: add Card, Badge, Input, and Avatar components"
```

---

### Task 6: Build Component Library — ListItem, Separator, Alert, Skeleton, EmptyState, Modal

**Files:**
- Create: `apps/mobile/src/components/ui/list-item.tsx`
- Create: `apps/mobile/src/components/ui/separator.tsx`
- Create: `apps/mobile/src/components/ui/alert.tsx`
- Create: `apps/mobile/src/components/ui/skeleton.tsx`
- Create: `apps/mobile/src/components/ui/empty-state.tsx`
- Create: `apps/mobile/src/components/ui/modal.tsx`
- Modify: `apps/mobile/src/components/ui/index.ts`

**Step 1: Create list-item.tsx**

Pressable row with icon slot, title/subtitle text, trailing chevron icon, and press feedback (opacity animation).

**Step 2: Create separator.tsx**

Simple horizontal/vertical divider: `h-px bg-border` or `w-px bg-border`.

**Step 3: Create alert.tsx**

Alert box with semantic variants matching the web (success, warning, destructive, info). Semi-transparent backgrounds.

**Step 4: Create skeleton.tsx**

Animated loading placeholder using `Animated` API with pulsing opacity on a `bg-muted rounded-lg` view.

**Step 5: Create empty-state.tsx**

Centered layout with icon, title, description, and optional action button.

**Step 6: Create modal.tsx**

Bottom sheet modal using React Native `Modal` with slide-up animation, backdrop overlay, and rounded top corners.

**Step 7: Update index.ts**

**Step 8: Commit**

```bash
git add apps/mobile/src/components/ui/
git commit -m "feat: add ListItem, Separator, Alert, Skeleton, EmptyState, and Modal components"
```

---

### Task 7: Install expo-haptics and Add Native-Feel Utilities

**Files:**
- Create: `apps/mobile/src/lib/haptics.ts`

**Step 1: Install expo-haptics**

Run: `npx pnpm --filter @schoolconnect/mobile add expo-haptics`

**Step 2: Create haptics.ts utility**

```typescript
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export function hapticLight() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function hapticMedium() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export function hapticSuccess() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export function hapticError() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}
```

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/haptics.ts
git commit -m "feat: add haptic feedback utilities"
```

---

### Task 8: Restyle LoginScreen

**Files:**
- Modify: `apps/mobile/src/screens/LoginScreen.tsx`

**Step 1: Read the current LoginScreen**

Read: `apps/mobile/src/screens/LoginScreen.tsx`

**Step 2: Rewrite LoginScreen with NativeWind**

Replace all StyleSheet usage with NativeWind className props. Use the new UI components (Button, Input, H1, Body). Apply coral brand header area, card-based form, and dark mode support via `dark:` classes.

Key layout: Full screen with coral gradient top section (brand area with app name), white card centered with email/password inputs, primary Button for login.

**Step 3: Verify login screen renders**

Run the app, navigate to login screen. Verify coral branding, Poppins font, and correct layout.

**Step 4: Commit**

```bash
git add apps/mobile/src/screens/LoginScreen.tsx
git commit -m "feat: restyle LoginScreen with Abridge theme"
```

---

### Task 9: Restyle Navigation (Tab Bar & Headers)

**Files:**
- Modify: `apps/mobile/App.tsx` (TabNavigator and Stack screenOptions)

**Step 1: Update TabNavigator styling**

Replace the indigo header/tab colors with:
- Header background: white (light) / card color (dark)
- Header text: foreground color
- Active tab: `#FF7D45` (coral primary)
- Inactive tab: `#6B7280` (muted-foreground)
- Tab bar background: white (light) / card (dark)
- Remove the old theme import

**Step 2: Update HeaderRight component**

Restyle logout and search icons to use foreground color instead of white.

**Step 3: Update Stack navigator header styling to match**

**Step 4: Add haptic feedback on tab press**

In Tab.Navigator `screenOptions`, add `tabBarButton` wrapper that fires `hapticLight()` on press.

**Step 5: Commit**

```bash
git add apps/mobile/App.tsx
git commit -m "feat: restyle navigation with coral accent and dark mode support"
```

---

### Task 10: Restyle DashboardScreen

**Files:**
- Modify: `apps/mobile/src/screens/DashboardScreen.tsx`

**Step 1: Read the current DashboardScreen**

Read: `apps/mobile/src/screens/DashboardScreen.tsx`

**Step 2: Rewrite with NativeWind and component library**

- Use `Card` for stats grid items and child cards
- Use `H1`, `H2`, `Body`, `Muted` for text hierarchy
- Use `Badge` for event categories
- Use `Skeleton` for loading states
- Pull-to-refresh with coral spinner color (`#FF7D45`)
- All backgrounds use `bg-background dark:bg-background`

**Step 3: Verify renders correctly in light and dark mode**

**Step 4: Commit**

```bash
git add apps/mobile/src/screens/DashboardScreen.tsx
git commit -m "feat: restyle DashboardScreen with card-based layout"
```

---

### Task 11: Restyle MessagesScreen and MessageCard

**Files:**
- Modify: `apps/mobile/src/screens/MessagesScreen.tsx`
- Modify: `apps/mobile/src/components/MessageCard.tsx`

**Step 1: Rewrite MessageCard with NativeWind**

Replace StyleSheet with NativeWind classes. Use `Card` as base, `Badge` for categories, coral unread indicator, `Muted` for timestamps. Dark mode via `dark:` prefix.

**Step 2: Rewrite MessagesScreen**

FlatList with NativeWind-styled container, `EmptyState` for no messages, `Skeleton` for loading.

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/MessagesScreen.tsx apps/mobile/src/components/MessageCard.tsx
git commit -m "feat: restyle MessagesScreen and MessageCard"
```

---

### Task 12: Restyle MessageDetailScreen

**Files:**
- Modify: `apps/mobile/src/screens/MessageDetailScreen.tsx`

**Step 1: Rewrite with NativeWind and component library**

Clean card layout with `H1` title, `Badge` for category, `Body` for message content, `Muted` for metadata. Coral accent bar at top.

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/MessageDetailScreen.tsx
git commit -m "feat: restyle MessageDetailScreen"
```

---

### Task 13: Restyle CalendarScreen

**Files:**
- Modify: `apps/mobile/src/screens/CalendarScreen.tsx`

**Step 1: Rewrite with NativeWind**

Month navigation buttons with coral active day highlight. Event cards using `Card` component with category `Badge`. Dark mode support throughout.

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/CalendarScreen.tsx
git commit -m "feat: restyle CalendarScreen with coral highlights"
```

---

### Task 14: Restyle AttendanceScreen

**Files:**
- Modify: `apps/mobile/src/screens/AttendanceScreen.tsx`

**Step 1: Rewrite with NativeWind**

Child selector chips with coral active state. Attendance status badges using semantic colors (present/green, late/amber, absent/red). Report absence modal using `Modal` component. Dark mode support.

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/AttendanceScreen.tsx
git commit -m "feat: restyle AttendanceScreen"
```

---

### Task 15: Restyle PaymentsScreen

**Files:**
- Modify: `apps/mobile/src/screens/PaymentsScreen.tsx`

**Step 1: Rewrite with NativeWind**

Payment cards with `Card` component. Amount display with coral accent. Status badges. Primary CTA button for "Pay Now". Dark mode support.

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/PaymentsScreen.tsx
git commit -m "feat: restyle PaymentsScreen"
```

---

### Task 16: Restyle SearchScreen

**Files:**
- Modify: `apps/mobile/src/screens/SearchScreen.tsx`

**Step 1: Rewrite with NativeWind**

`Input` component for search bar with rounded-xl styling. Result cards with icon-based categorization. `EmptyState` for no results. Dark mode support.

**Step 2: Commit**

```bash
git add apps/mobile/src/screens/SearchScreen.tsx
git commit -m "feat: restyle SearchScreen"
```

---

### Task 17: Delete Legacy Theme File and Clean Up

**Files:**
- Delete: `apps/mobile/src/lib/theme.ts`
- Modify: Any remaining imports of old theme

**Step 1: Search for remaining `theme.ts` imports**

Run: `grep -r "from.*lib/theme" apps/mobile/src/`
Expected: No remaining imports (all screens should have been migrated).

**Step 2: Delete theme.ts**

**Step 3: Final lint check**

Run: `npx pnpm lint`
Expected: No errors related to mobile app.

**Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "chore: remove legacy theme.ts and clean up imports"
```

---

### Task 18: Full Integration Test

**Step 1: Start the mobile app**

Run: `npx pnpm --filter @schoolconnect/mobile dev`
Expected: Metro bundles successfully.

**Step 2: Test each screen in light mode**

Walk through all 8 screens (Login, Dashboard, Messages, MessageDetail, Calendar, Attendance, Payments, Search). Verify:
- Coral branding throughout
- Poppins font rendering
- Cards with rounded-2xl and soft shadows
- Badges with correct semantic colors
- Tab bar with coral active indicator

**Step 3: Test dark mode**

Toggle device color scheme to dark. Verify:
- Backgrounds switch to dark values
- Text switches to light values
- Cards and borders update
- Primary coral color stays consistent

**Step 4: Test native-feel**

- Pull-to-refresh shows coral spinner
- Button presses trigger haptic feedback
- Tab switches trigger haptic feedback
- Keyboard avoidance works on login/forms
- Safe areas respected on notched devices

**Step 5: Run existing tests**

Run: `npx pnpm --filter @schoolconnect/mobile test`
Expected: All tests pass (may need updates if they reference old theme colors).

**Step 6: Final commit if any fixes needed**

```bash
git commit -m "fix: integration test fixes for mobile theme"
```
