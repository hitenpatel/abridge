# AI Progress Summaries — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Weekly per-child progress summaries combining all data sources. Hybrid approach: template for structured data, Claude Haiku for one insight sentence. Feature-toggleable.

No competitor has this feature — genuine differentiator for pilot school pitches.

---

## Schema

```prisma
model ProgressSummary {
  id           String   @id @default(cuid())
  childId      String
  child        Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId     String
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  weekStart    DateTime @db.Date
  templateData Json     // structured metrics + token usage
  insight      String?  // AI-generated sentence (null if AI disabled)
  summary      String   // full rendered summary text
  createdAt    DateTime @default(now())

  @@unique([childId, weekStart])
  @@index([schoolId, weekStart])
  @@map("progress_summary")
}
```

Feature toggle: `progressSummariesEnabled Boolean @default(false)` on School.

Add relations to School and Child.

## Configuration

Environment variable `AI_SUMMARY_PROVIDER`:
- `"claude"` — use Claude Haiku API for insight generation
- `"template"` — template-only, no AI calls (zero cost)
- `"none"` — feature disabled at infrastructure level

Environment variable `ANTHROPIC_API_KEY` — required when `AI_SUMMARY_PROVIDER=claude`.

## Service

**File:** `apps/api/src/lib/progress-summary.ts`

### gatherChildMetrics(childId, weekStart, weekEnd)

Queries all data sources and returns a structured metrics object:

```typescript
interface ChildWeeklyMetrics {
  childName: string;
  weekStart: Date;
  attendance: {
    percentage: number;      // e.g. 96
    daysPresent: number;
    daysTotal: number;
    lateCount: number;
  };
  homework: {
    completed: number;
    total: number;
    overdue: number;
    gradedCount: number;
  };
  reading: {
    daysRead: number;
    totalMinutes: number;
    avgMinutes: number;
    currentStreak: number;
    currentBook: string | null;
  };
  achievements: {
    pointsEarned: number;
    awardsReceived: number;
    categories: string[];    // e.g. ["Star of the Week", "Kindness"]
  };
  wellbeing: {
    avgMood: string | null;  // e.g. "GOOD"
    checkInCount: number;
    trend: "improving" | "stable" | "declining" | null;
  };
  reportCard: {
    latestCycle: string | null;
    overallLevel: string | null;
  } | null;
}
```

Data sources:
- `AttendanceRecord` — filter by childId + date range
- `HomeworkAssignment` + `HomeworkCompletion` — filter by child's yearGroup + date range
- `ReadingDiary` + `ReadingEntry` — filter by childId + date range
- `Achievement` — filter by childId + date range
- `WellbeingCheckIn` — filter by childId + date range
- `ReportCard` — latest for child (not date-scoped)

### renderTemplateSummary(metrics)

Builds structured text from metrics:

```
Attendance: 96% (4/5 days, 1 late).
Homework: completed 3 of 4 assignments (1 overdue).
Reading: read 4 days this week (avg 18 min/day, 3-day streak). Currently reading "Charlotte's Web".
Achievements: earned 15 points — Star of the Week, Kindness Award.
Wellbeing: mood average GOOD, stable trend.
```

Rules:
- Omit sections where data is empty (e.g. no achievements = skip that line)
- Use encouraging but factual tone
- Include specific numbers, not vague language

### generateInsight(metrics)

Calls Claude Haiku API to generate one encouraging sentence connecting the data points.

**System prompt:**
```
You are a primary school teaching assistant writing a one-sentence weekly insight for a parent about their child's progress. Be warm, specific, and encouraging. Reference concrete data. Do not be generic. Maximum 150 characters.
```

**User prompt:** The metrics object serialized as a concise summary.

**Returns:** The insight string, or null if:
- `AI_SUMMARY_PROVIDER !== "claude"`
- API call fails (timeout 5s)
- API returns empty/invalid response

**Example outputs:**
- "Emma's 4-day reading streak and improved homework completion suggest she's really finding her confidence this term."
- "Noah's perfect attendance and two achievement awards show he's having a fantastic week."
- "Olivia's wellbeing dipped slightly — her reading time stayed strong though, which is a great sign."

### generateWeeklySummary(childId, weekStart)

Orchestrates all three steps:
1. `gatherChildMetrics(childId, weekStart, weekEnd)`
2. `renderTemplateSummary(metrics)`
3. `generateInsight(metrics)` (may return null)
4. Combine: `summary = templateText + (insight ? "\n\nInsight: " + insight : "")`
5. Upsert `ProgressSummary` record with templateData (includes metrics + tokenUsage), insight, summary

## Cost Controls

- **Rate limit:** Max 1 AI summary per child per week (enforced by `@@unique([childId, weekStart])`)
- **Fallback:** If Claude API fails or times out (5s), save template-only summary without insight — never block on AI
- **Admin kill switch:** Set `AI_SUMMARY_PROVIDER=template` to instantly disable AI calls without deploy
- **Usage tracking:** Store `tokensUsed: { input, output }` in `templateData` JSON for cost monitoring
- **Budget alert:** If weekly token usage exceeds configurable threshold, log warning but continue generating

Estimated cost: ~$0.50-2.00 per school per month (Haiku pricing, ~200 children, weekly generation).

## Router

**File:** `apps/api/src/router/progress-summary.ts`

Feature guard: `assertFeatureEnabled(ctx, "progressSummaries")`

### Procedures

- `getLatestSummary` — `protectedProcedure`. Input: `{ childId }`. Verify parentChild relationship. Return latest ProgressSummary for this child. Include parsed templateData metrics for UI rendering.

- `getSummaryHistory` — `protectedProcedure`. Input: `{ childId, limit?, cursor? }`. Cursor-based pagination. Return past summaries ordered by weekStart desc.

- `generateNow` — `schoolFeatureProcedure`. Input: `{ schoolId, childId }`. Staff manually triggers summary generation for one child. Returns the generated summary.

- `generateWeeklyBatch` — `schoolAdminProcedure`. Input: `{ schoolId }`. Admin triggers batch generation for all children in school. Returns count of summaries generated. Runs async (fire-and-forget after initial response).

## Cron

**File:** `apps/api/src/lib/progress-summary-cron.ts`

- Runs every Monday at 6:00 AM (configurable via `SUMMARY_CRON_HOUR` env var)
- Queries all schools with `progressSummariesEnabled = true`
- For each school, generates summaries for all children
- Logs results (generated count, errors, token usage)
- Uses same `setInterval` pattern as MIS sync cron

## Web Page

**File:** `apps/web/src/app/dashboard/progress/page.tsx`

### Parent View

- Child selector (multi-child)
- Latest summary card:
  - Header: "Week of {date}"
  - Metrics grid: attendance %, homework completion, reading streak, achievements, wellbeing mood
  - Each metric as a small card with icon + number + label
  - AI insight sentence highlighted in a coloured callout box (if present)
  - Full summary text below
- History section: list of past weekly summaries, click to expand

### Staff View

- Class overview table: child name, latest summary date, key metrics (attendance, homework, reading)
- "Generate Summaries" button (triggers batch for this week)
- Click child → view their latest summary detail

Feature gate: `progressSummariesEnabled`

Nav items:
- Parent: `{ name: "Progress", href: "/dashboard/progress", icon: "insights", featureKey: "progressSummariesEnabled" }`
- Staff: same

## Tests

### API Tests (5)
1. `gatherChildMetrics` returns correct metrics from seeded data
2. `renderTemplateSummary` produces expected text format
3. `generateWeeklySummary` with mocked AI returns insight + template
4. `generateWeeklySummary` with AI disabled returns template only
5. `getLatestSummary` verifies parent-child ownership

### E2E Tests (2)
1. Parent views progress summary for their child
2. Staff generates summary batch

### Ralph Loop Usage

Use Ralph Loop for iterating on:
- The Claude system/user prompt until insight quality is consistently good
- Edge cases: child with no data, child with perfect scores, child with concerning patterns
- Template formatting for different data combinations

## Feature Toggle Registration

Same pattern as achievements/gallery:
- `apps/api/src/lib/feature-guards.ts` — add `"progressSummaries"`
- `apps/api/src/trpc.ts` — add `progressSummariesEnabled: true` to select
- `apps/api/src/router/settings.ts` — add to toggle select + Zod schema
- `apps/web/src/lib/feature-toggles.tsx` — add to interface + defaults
- `apps/web/src/app/dashboard/layout.tsx` — add nav items
- `apps/web/src/app/dashboard/settings/page.tsx` — add toggle

## Dependencies

- `@anthropic-ai/sdk` — Claude API client (install in apps/api)
- No other new dependencies

## Environment Variables

- `AI_SUMMARY_PROVIDER` — `"claude"` | `"template"` | `"none"` (default: `"template"`)
- `ANTHROPIC_API_KEY` — required when provider is `"claude"`
- `SUMMARY_CRON_HOUR` — hour to run weekly cron (default: `6`)
