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
  updatedAt    DateTime @updatedAt

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

Data sources and query paths:
- `AttendanceRecord` — filter by childId + date range
- Homework: query `HomeworkCompletion` by childId in date range, join to `HomeworkAssignment` for titles/due dates. For total count, query `HomeworkAssignment` by child's schoolId + yearGroup + dueDate range, then left-join completions for this child.
- Reading: find `ReadingDiary` by childId (unique), then query `ReadingEntry` by diaryId + date range.
- Achievements: query `Achievement` by childId + date range, join `AchievementCategory` via categoryId to get category names.
- `WellbeingCheckIn` — filter by childId + date range. Trend: compare average mood ordinal (GREAT=5, GOOD=4, OK=3, LOW=2, STRUGGLING=1) of current week vs prior week.
- `ReportCard` — latest for child via cycleId join to `ReportCycle`, aggregate `SubjectGrade.level` values for overall level.

**Batch optimization:** For `generateWeeklyBatch`, fetch all records per data source for the entire school + date range in one query, then partition by childId in memory. Avoids N+1 queries (6 queries × 200 children = 1200 → reduced to 6 queries total).

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
- **Hard budget cap:** If cumulative token usage for a school in a given week exceeds `MAX_WEEKLY_TOKENS` (default: 500,000 — ~$0.50 on Haiku), stop generating AI insights for that school and fall back to template-only for remaining children. Prevents runaway costs from bugs or retries.
- **Short-circuit on `generateNow`:** If a `ProgressSummary` already exists for this child+week and was updated less than 1 hour ago, return the existing one without regenerating (avoids repeated AI calls from staff clicking "generate" multiple times).
- **Budget alert:** If weekly token usage exceeds 80% of cap, log warning.

Estimated cost: ~$0.50-2.00 per school per month (Haiku pricing, ~200 children, weekly generation).

## Router

**File:** `apps/api/src/router/progress-summary.ts`

Feature guard: `assertFeatureEnabled(ctx, "progressSummaries")`

### Procedures

- `getLatestSummary` — `protectedProcedure`. Input: `{ childId }`. Verify parentChild relationship. Return latest ProgressSummary for this child. Include parsed templateData metrics for UI rendering.

- `getSummaryHistory` — `protectedProcedure`. Input: `{ childId, limit?, cursor? }`. Cursor-based pagination. Return past summaries ordered by weekStart desc.

- `generateNow` — `schoolFeatureProcedure`. Input: `{ schoolId, childId }`. Staff manually triggers summary generation for one child. Returns the generated summary.

- `generateWeeklyBatch` — `schoolAdminProcedure`. Input: `{ schoolId }`. Admin triggers batch generation for all children in school. Returns immediately with `{ status: "started", childCount }`. Runs generation in background wrapped in try-catch with per-child error logging. Does NOT fire-and-forget — logs completion status and error count.

## Notifications

When a weekly summary is generated (via cron or batch), send a push notification to the parent:
- Title: "Weekly Progress Summary"
- Body: "{childName}'s weekly summary is ready"
- Deep link to `/dashboard/progress`
- Uses existing `notificationService.sendPush()` pattern
- Respects quiet hours and notification preferences

## Mobile

Mobile screens (Expo) are out of scope for this initial implementation. Web page comes first; mobile can follow.

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

## Seed Data

Add to `packages/db/prisma/seed.ts`:
- Enable `progressSummariesEnabled: true` on seed school
- Create a sample `ProgressSummary` for child1 with realistic metrics and a template summary (no AI insight in seed — AI_SUMMARY_PROVIDER may not be set)

The existing seed data already includes attendance records, homework assignments, reading entries, achievements, and wellbeing check-ins — sufficient for `gatherChildMetrics` to produce meaningful results.

## Feature Toggle Registration

**REQUIRED** — `"progressSummaries"` must be added to the `FeatureName` type union, `SchoolFeatures` interface, `featureFieldMap`, and `featureLabel` in `feature-guards.ts`, or the router will not compile.

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
