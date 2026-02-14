## Context

The mobile app uses `MaterialIcons` from `@expo/vector-icons` extensively across screens and components (FloatingTabBar, StaffHomeScreen, ParentHomeScreen, etc.). The icon font is imported but never loaded via the `useFonts` hook in `App.tsx`. Only Plus Jakarta Sans text fonts are loaded. Without the icon font registered, React Native renders "?" fallback glyphs.

## Goals / Non-Goals

**Goals:**
- Load MaterialIcons font at app startup so all icon glyphs render correctly
- Maintain the existing splash/loading screen behavior (show spinner until all fonts ready)

**Non-Goals:**
- Replacing MaterialIcons with a different icon library
- Adding new icons or changing existing icon usage
- Addressing lucide-react-native icons (these are SVG-based and unaffected)

## Decisions

**Load MaterialIcons via `useFonts` hook**

The `@expo/vector-icons` package exposes a `font` property on each icon family that returns the font asset map. Add `...MaterialIcons.font` to the existing `useFonts` call in `App.tsx`.

This approach was chosen over alternatives:
- **`Font.loadAsync` in a separate call**: Would require additional loading state management. Using the existing `useFonts` hook keeps all font loading in one place.
- **Expo plugin/config-based loading**: Overkill for a single icon font. The hook approach is explicit and matches the existing pattern.

## Risks / Trade-offs

- **Slightly longer splash screen**: Loading one additional font asset adds minimal time (~50-100ms). Acceptable since the app already waits for 5 text fonts.
- **Future icon fonts**: If additional icon families are added later, they'll need to be added to the same `useFonts` call. The pattern is now clear.
