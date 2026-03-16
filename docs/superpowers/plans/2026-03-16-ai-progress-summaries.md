# AI Progress Summaries Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate weekly per-child progress summaries combining attendance, homework, reading, achievements, wellbeing, and report card data, with an optional AI-generated insight sentence via Claude Haiku.

**Architecture:** A `ProgressSummary` model stores generated summaries. A service layer gathers metrics from 6 data sources, renders a template, optionally calls Claude Haiku for an insight sentence, and upserts the result. A cron job runs weekly. Feature-toggleable per school.

**Tech Stack:** Prisma (schema), tRPC (router), Zod (validation), @anthropic-ai/sdk (Claude API), Next.js App Router (page), Vitest (tests), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-03-16-ai-progress-summaries-design.md`

---

## Chunk 1: Schema + Feature Toggle + Service

### Task 1: Schema — ProgressSummary model + feature toggle

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add feature toggle to School model**

Add after the last feature toggle (galleryEnabled):

```prisma
  progressSummariesEnabled  Boolean  @default(false)
```

- [ ] **Step 2: Add ProgressSummary model**

Add at the end of schema.prisma:

```prisma
// ─── Progress Summaries ────────────────────────────────────

model ProgressSummary {
  id           String   @id @default(cuid())
  childId      String
  child        Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId     String
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  weekStart    DateTime @db.Date
  templateData Json
  insight      String?
  summary      String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([childId, weekStart])
  @@index([schoolId, weekStart])
  @@map("progress_summary")
}
```

- [ ] **Step 3: Add relations**

School: `progressSummaries ProgressSummary[]`
Child: `progressSummaries ProgressSummary[]`

- [ ] **Step 4: Generate Prisma client**

Run: `npx pnpm --filter @schoolconnect/db db:generate`

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add ProgressSummary model and progressSummariesEnabled toggle"
```

---

### Task 2: Feature toggle registration

**Files:**
- Modify: `apps/api/src/lib/feature-guards.ts`
- Modify: `apps/api/src/trpc.ts`
- Modify: `apps/api/src/router/settings.ts`
- Modify: `apps/web/src/lib/feature-toggles.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add to feature-guards.ts**

Add `"progressSummaries"` to FeatureName type, `progressSummariesEnabled: boolean` to SchoolFeatures, `progressSummaries: "progressSummariesEnabled"` to featureFieldMap, `progressSummaries: "Progress Summaries"` to featureLabel.

- [ ] **Step 2: Add to trpc.ts select clause**

Add `progressSummariesEnabled: true` to the school select in schoolFeatureProcedure.

- [ ] **Step 3: Add to settings.ts**

Add `progressSummariesEnabled: true` to featureToggleSelect and `progressSummariesEnabled: z.boolean().optional()` to the updateFeatureToggles Zod schema.

- [ ] **Step 4: Add to feature-toggles.tsx**

Add `progressSummariesEnabled: boolean` to FeatureToggles interface and `progressSummariesEnabled: false` to defaults.

- [ ] **Step 5: Add nav items to layout.tsx**

Parent nav: `{ name: "Progress", href: "/dashboard/progress", icon: "insights", featureKey: "progressSummariesEnabled" }`
Staff nav: same item.
Add `"progressSummariesEnabled"` to the featureKey type union in NavItem.

- [ ] **Step 6: Add toggle to settings/page.tsx**

Add state variable, sync in useEffect, include in mutation, add Toggle component.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts apps/api/src/router/settings.ts apps/web/src/lib/feature-toggles.tsx apps/web/src/app/dashboard/layout.tsx apps/web/src/app/dashboard/settings/page.tsx
git commit -m "feat: register progressSummaries feature toggle across stack"
```

---

### Task 3: Install Anthropic SDK

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install**

Run: `npx pnpm --filter @schoolconnect/api add @anthropic-ai/sdk`

- [ ] **Step 2: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "deps: add @anthropic-ai/sdk for AI progress summaries"
```

---

### Task 4: Progress summary service — metrics gathering

**Files:**
- Create: `apps/api/src/lib/progress-summary.ts`

- [ ] **Step 1: Create the metrics gathering function**

```typescript
import type { PrismaClient } from "@schoolconnect/db";

export interface ChildWeeklyMetrics {
  childName: string;
  weekStart: Date;
  attendance: { percentage: number; daysPresent: number; daysTotal: number; lateCount: number };
  homework: { completed: number; total: number; overdue: number };
  reading: { daysRead: number; totalMinutes: number; avgMinutes: number; currentStreak: number; currentBook: string | null };
  achievements: { pointsEarned: number; awardsReceived: number; categories: string[] };
  wellbeing: { avgMood: string | null; checkInCount: number; trend: "improving" | "stable" | "declining" | null };
}

export async function gatherChildMetrics(
  prisma: PrismaClient,
  childId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<ChildWeeklyMetrics> {
  // ... implementation querying all 6 data sources with correct join paths
}
```

Query paths per the spec:
- Attendance: `attendanceRecord.findMany({ where: { childId, date: { gte: weekStart, lt: weekEnd } } })`
- Homework: `homeworkCompletion.findMany({ where: { childId, createdAt: { gte: weekStart, lt: weekEnd } }, include: { assignment: true } })` for completed, `homeworkAssignment.findMany({ where: { schoolId, yearGroup: child.yearGroup, dueDate: { gte: weekStart, lt: weekEnd } } })` for total
- Reading: find ReadingDiary by childId, then `readingEntry.findMany({ where: { diaryId, date: { gte, lt } } })`
- Achievements: `achievement.findMany({ where: { childId, createdAt: { gte, lt } }, include: { category: { select: { name: true } } } })`
- Wellbeing: `wellbeingCheckIn.findMany({ where: { childId, date: { gte, lt } } })`, compute trend by comparing to prior week
- Child name from `child.findUnique({ where: { id: childId }, select: { firstName: true, lastName: true } })`

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/lib/progress-summary.ts
git commit -m "feat: add progress summary metrics gathering service"
```

---

### Task 5: Progress summary service — template + AI + orchestrator

**Files:**
- Modify: `apps/api/src/lib/progress-summary.ts`

- [ ] **Step 1: Add template renderer**

```typescript
export function renderTemplateSummary(metrics: ChildWeeklyMetrics): string {
  const lines: string[] = [];
  // Attendance line (always present)
  lines.push(`Attendance: ${metrics.attendance.percentage}% (${metrics.attendance.daysPresent}/${metrics.attendance.daysTotal} days${metrics.attendance.lateCount > 0 ? `, ${metrics.attendance.lateCount} late` : ""}).`);
  // Homework line (if any assignments)
  if (metrics.homework.total > 0) { ... }
  // Reading line (if any entries)
  if (metrics.reading.daysRead > 0) { ... }
  // Achievements line (if any)
  if (metrics.achievements.awardsReceived > 0) { ... }
  // Wellbeing line (if any check-ins)
  if (metrics.wellbeing.checkInCount > 0) { ... }
  return lines.join("\n");
}
```

- [ ] **Step 2: Add AI insight generator**

```typescript
import Anthropic from "@anthropic-ai/sdk";

export async function generateInsight(metrics: ChildWeeklyMetrics): Promise<string | null> {
  if (process.env.AI_SUMMARY_PROVIDER !== "claude") return null;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const metricsText = renderTemplateSummary(metrics);

    const response = await Promise.race([
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: "You are a primary school teaching assistant writing a one-sentence weekly insight for a parent about their child's progress. Be warm, specific, and encouraging. Reference concrete data. Do not be generic. Maximum 150 characters.",
        messages: [{ role: "user", content: `Child: ${metrics.childName}\n\n${metricsText}` }],
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 5000)),
    ]);

    const text = response.content[0]?.type === "text" ? response.content[0].text : null;
    return text;
  } catch (err) {
    logger.warn({ err }, "AI insight generation failed, falling back to template");
    return null;
  }
}
```

- [ ] **Step 3: Add orchestrator**

```typescript
export async function generateWeeklySummary(
  prisma: PrismaClient,
  childId: string,
  weekStart: Date,
): Promise<{ id: string; summary: string }> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const child = await prisma.child.findUniqueOrThrow({ where: { id: childId }, select: { schoolId: true } });
  const metrics = await gatherChildMetrics(prisma, childId, weekStart, weekEnd);
  const templateText = renderTemplateSummary(metrics);
  const insight = await generateInsight(metrics);
  const summary = insight ? `${templateText}\n\nInsight: ${insight}` : templateText;

  const result = await prisma.progressSummary.upsert({
    where: { childId_weekStart: { childId, weekStart } },
    update: { templateData: metrics as any, insight, summary },
    create: { childId, schoolId: child.schoolId, weekStart, templateData: metrics as any, insight, summary },
  });

  return { id: result.id, summary: result.summary };
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/progress-summary.ts
git commit -m "feat: add template renderer, AI insight generator, and summary orchestrator"
```

---

### Task 6: Progress summary service tests

**Files:**
- Create: `apps/api/src/__tests__/progress-summary.test.ts`

- [ ] **Step 1: Write tests**

5 tests:
1. `gatherChildMetrics` returns correct metrics structure from mocked Prisma
2. `renderTemplateSummary` produces expected text with full data
3. `renderTemplateSummary` omits empty sections (no homework = no homework line)
4. `generateInsight` returns null when AI_SUMMARY_PROVIDER is not "claude"
5. `generateWeeklySummary` with mocked AI returns insight + template combined

Mock `@anthropic-ai/sdk` with `vi.mock`. Mock Prisma methods. Set `process.env.AI_SUMMARY_PROVIDER` in tests.

- [ ] **Step 2: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/progress-summary.test.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/progress-summary.test.ts
git commit -m "test: add progress summary service tests"
```

---

## Chunk 2: Router + Cron + Web Page

### Task 7: Progress summary router

**Files:**
- Create: `apps/api/src/router/progress-summary.ts`
- Modify: `apps/api/src/router/index.ts`

- [ ] **Step 1: Create the router**

4 procedures:

`getLatestSummary` — `protectedProcedure`. Input: `{ childId: z.string() }`. Query `parentChild` where userId = ctx.user.id and childId = input.childId. If not found, throw FORBIDDEN. Return latest `progressSummary` for this child ordered by weekStart desc.

`getSummaryHistory` — `protectedProcedure`. Input: `{ childId: z.string(), limit: z.number().min(1).max(50).default(10), cursor: z.string().nullish() }`. Same parent-child check. Cursor-based pagination on progressSummary ordered by weekStart desc.

`generateNow` — `schoolFeatureProcedure` + `assertFeatureEnabled(ctx, "progressSummaries")`. Input: `{ schoolId: z.string(), childId: z.string() }`. Short-circuit: if summary exists for this child+week and updatedAt < 1 hour ago, return existing. Otherwise call `generateWeeklySummary()`.

`generateWeeklyBatch` — `schoolAdminProcedure` + `assertFeatureEnabled(ctx, "progressSummaries")`. Input: `{ schoolId: z.string() }`. Get all children for school. Return `{ status: "started", childCount }` immediately. Run generation in background with try-catch per child.

- [ ] **Step 2: Register in router/index.ts**

Import and add: `progressSummary: progressSummaryRouter`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/router/progress-summary.ts apps/api/src/router/index.ts
git commit -m "feat: add progress summary router with generate, history, and batch"
```

---

### Task 8: Router tests

**Files:**
- Create: `apps/api/src/__tests__/progress-summary-router.test.ts`

- [ ] **Step 1: Write tests**

4 tests following the mock pattern from meal-booking.test.ts:
1. `getLatestSummary` returns latest summary for parent's child
2. `getLatestSummary` rejects non-parent access (FORBIDDEN)
3. `getSummaryHistory` returns paginated results
4. `generateNow` short-circuits when recent summary exists

Include all feature toggles in school mock (including `progressSummariesEnabled: true`).

- [ ] **Step 2: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/progress-summary-router.test.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/progress-summary-router.test.ts
git commit -m "test: add progress summary router tests"
```

---

### Task 9: Weekly cron job

**Files:**
- Create: `apps/api/src/lib/progress-summary-cron.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the cron**

```typescript
import type { PrismaClient } from "@schoolconnect/db";
import { logger } from "./logger";
import { generateWeeklySummary } from "./progress-summary";

export function startProgressSummaryCron(prisma: PrismaClient) {
  const cronHour = parseInt(process.env.SUMMARY_CRON_HOUR || "6", 10);
  // Check every hour, only run on Monday at the configured hour
  setInterval(async () => {
    const now = new Date();
    if (now.getDay() !== 1 || now.getHours() !== cronHour) return;
    // ... query schools with progressSummariesEnabled, generate for all children
  }, 60 * 60 * 1000);
}
```

Includes:
- Token budget tracking per school per week
- Hard cap: stop AI insights if budget exceeded, fall back to template
- Per-child try-catch (one failure doesn't stop the batch)
- Send push notification to parents after generation via notificationService

- [ ] **Step 2: Wire into Fastify startup**

In `apps/api/src/index.ts`, after server starts:

```typescript
import { startProgressSummaryCron } from "./lib/progress-summary-cron";
// ... at end of main():
startProgressSummaryCron(prisma);
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/progress-summary-cron.ts apps/api/src/index.ts
git commit -m "feat: add weekly progress summary cron with budget cap and notifications"
```

---

### Task 10: Progress web page

**Files:**
- Create: `apps/web/src/app/dashboard/progress/page.tsx`

- [ ] **Step 1: Create the progress page**

**Parent view:**
- Child selector (multi-child)
- Latest summary card:
  - "Week of {date}" header
  - Metrics grid: 5 cards (attendance %, homework x/y, reading streak, achievement points, wellbeing mood) with icons
  - AI insight in a highlighted callout (blue/purple background) if present
  - Full summary text
- History section: expandable list of past weeks

**Staff view:**
- Class overview table: child name, latest summary date, attendance %, homework rate
- "Generate Summaries" button → calls `generateWeeklyBatch`, shows progress toast
- Click child → view their summary

Feature gate: `progressSummariesEnabled`

Follow patterns from `apps/web/src/app/dashboard/meals/page.tsx`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/progress/page.tsx
git commit -m "feat: add progress summary page with metrics cards and AI insight"
```

---

### Task 11: Seed data + E2E tests

**Files:**
- Modify: `packages/db/prisma/seed.ts`
- Modify: `e2e/helpers/seed-data.ts`
- Create: `e2e/progress-summary-journey.test.ts`

- [ ] **Step 1: Add seed data**

In seed.ts, enable `progressSummariesEnabled: true` on school. Create a sample ProgressSummary for child1 with realistic templateData and summary text (no insight — AI may not be configured).

- [ ] **Step 2: Add seed helper**

In seed-data.ts: `seedProgressSummary({ childId, schoolId, weekStart?, summary?, insight? })`

- [ ] **Step 3: Write E2E tests**

2 tests:
1. "parent should view progress summary for their child" — setup school, register, seed child + summary, enable feature, navigate to /dashboard/progress, verify summary text visible
2. "progress page should show disabled state" — navigate without enabling, verify disabled heading

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts e2e/helpers/seed-data.ts e2e/progress-summary-journey.test.ts
git commit -m "test: add progress summary E2E tests and seed data"
```

---

## Chunk 3: Verification

### Task 12: Update feature-guards test + lint + build

**Files:**
- Modify: `apps/api/src/__tests__/feature-guards.test.ts`

- [ ] **Step 1: Add progressSummariesEnabled to test fixtures**

Add `progressSummariesEnabled: true` to `allTogglesEnabled()` and `progressSummariesEnabled: false` to `allTogglesDisabled()`.

- [ ] **Step 2: Run lint**

Run: `npx pnpm lint`
Fix any issues in new files.

- [ ] **Step 3: Run build**

Run: `npx pnpm build`
Fix any TS errors.

- [ ] **Step 4: Run all API tests**

Run: `cd apps/api && npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from progress summary implementation"
```

---

### Task 13: Ralph Loop — prompt tuning (optional, post-merge)

Use Ralph Loop to iterate on the Claude system/user prompt:

```
/ralph-loop "Run the progress summary service against seed data with different child scenarios (perfect attendance, struggling, mixed). Check the insight quality. Adjust the system prompt in apps/api/src/lib/progress-summary.ts to improve output. Test with: 1) child with all perfect metrics, 2) child with low attendance + good reading, 3) child with no data. Output <promise>PROMPTS TUNED</promise> when insights are consistently warm, specific, and reference concrete data." --max-iterations 10
```

This is best done with ANTHROPIC_API_KEY set and a running database.

---

## Summary

| Task | What | Files | Tests |
|------|------|-------|-------|
| 1 | Schema + toggle | schema.prisma | — |
| 2 | Feature toggle registration | 6 files | — |
| 3 | Install SDK | package.json | — |
| 4 | Metrics gathering service | progress-summary.ts | — |
| 5 | Template + AI + orchestrator | progress-summary.ts | — |
| 6 | Service tests | progress-summary.test.ts | 5 tests |
| 7 | Router | progress-summary.ts, index.ts | — |
| 8 | Router tests | progress-summary-router.test.ts | 4 tests |
| 9 | Cron + notifications | progress-summary-cron.ts, index.ts | — |
| 10 | Web page | progress/page.tsx | — |
| 11 | Seed + E2E | seed.ts, seed-data.ts, E2E test | 2 E2E |
| 12 | Verification | feature-guards.test.ts, lint, build | — |
| 13 | Ralph Loop prompt tuning | progress-summary.ts | iterative |

**Total: 13 tasks, 9 API tests, 2 E2E tests**
