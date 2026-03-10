# Wellbeing Check-in — Mobile (Parent) Design

**Goal:** Add a parent-facing wellbeing check-in screen to the mobile app, accessible from a card on ParentHomeScreen.

**Scope:** Parent only. Staff wellbeing views (class overview, alerts) deferred to a later pass.

---

## Entry Point

A card on ParentHomeScreen, below the ChildSwitcher, above the ActivityFeed:

- **No check-in today:** "How is {childName} feeling today?" with a right chevron
- **Already checked in:** Shows today's mood emoji + label (e.g. "Emily is feeling Great today") — tapping opens the screen to view history or update
- **Feature-gated:** Only renders when `schoolSettings.wellbeingEnabled === true` (fetched via `settings.getSchoolSettings`)

## Screen: WellbeingScreen

Stack screen (not a tab). Route param: `childId`.

**Layout (top to bottom):**

1. **Header:** "Wellbeing" with back button
2. **Mood picker:** 5 large emoji buttons in a horizontal row
   - GREAT (😄) / GOOD (🙂) / OK (😐) / LOW (😟) / STRUGGLING (😢)
   - Labels beneath each emoji
   - Selected mood gets primary highlight, others are muted
3. **Optional note:** TextInput, max 200 chars, placeholder "Add a note (optional)"
4. **Submit button:** "Save Check-in" — disabled until a mood is selected. If already checked in today, button says "Update Check-in" (upsert behaviour)
5. **History section:** "Recent Check-ins" heading, scrollable list of last 30 days. Each row: date, mood emoji, colour-coded mood badge, note if present

## Data Flow

- `wellbeing.getCheckIns` — history (last 30 days for selected child)
- `wellbeing.submitCheckIn` — save/update today's mood
- `dashboard.getSummary` or `settings.getSchoolSettings` — feature toggle check

## Colour Palette (matching web)

| Mood | Background | Text |
|---|---|---|
| GREAT | green-100 | green-800 |
| GOOD | emerald-100 | emerald-800 |
| OK | yellow-100 | yellow-800 |
| LOW | orange-100 | orange-800 |
| STRUGGLING | red-100 | red-800 |

## Navigation

- Add `Wellbeing` to `RootStackParamList` with `{ childId: string }` param
- ParentHomeScreen card navigates to `Wellbeing` with selected child's ID

## Testing

- **Maestro flow:** `parent/wellbeing-checkin.yaml` — navigate via home card, select mood, submit, verify success
- Seed data already has 5 days of check-ins for both children
- School seed has `wellbeingEnabled: true`
