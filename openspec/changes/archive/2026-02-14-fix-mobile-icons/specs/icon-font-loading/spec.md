## ADDED Requirements

### Requirement: MaterialIcons font SHALL be loaded at app startup
The app SHALL load the MaterialIcons font from `@expo/vector-icons` via the `useFonts` hook before rendering any screens. The app SHALL display a loading indicator until all fonts (text and icon) are ready.

#### Scenario: Icons render correctly after app loads
- **WHEN** the app finishes loading fonts and renders a screen with MaterialIcons
- **THEN** all icon glyphs display correctly (no "?" fallback characters)

#### Scenario: App shows loading state while fonts load
- **WHEN** the app is loading fonts (including MaterialIcons)
- **THEN** a loading spinner is displayed until all fonts are ready
