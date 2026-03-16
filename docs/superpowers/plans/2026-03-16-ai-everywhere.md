# AI Everywhere — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Add 6 AI-powered features across the platform, all using the existing configurable AI provider system.

**Architecture:** Each feature is a standalone service + router procedure. Features 2.1, 2.4, 2.6 call the AI provider. Features 2.2, 2.5 are rule-based (no AI cost). Feature 2.3 extends existing translation.

**Spec:** `docs/superpowers/specs/2026-03-16-abridge-v2-prd.md` — Phase 2 section.

---

## Feature 2.1: AI Message Drafting

### Task 1: Service + Router

**Files:**
- Create: `apps/api/src/lib/ai-drafting.ts`
- Modify: `apps/api/src/router/messaging.ts`

- [ ] Create `generateDraft(prompt, tone, schoolName)` in `apps/api/src/lib/ai-drafting.ts`. Uses same AI provider pattern as progress-summary.ts (`callAIProvider`). System prompt varies by tone (Formal/Friendly/Urgent). 5s timeout, returns null on failure. Rate limit: track calls per user in memory (20/hour).

- [ ] Add `generateDraft` procedure to messaging router. `schoolFeatureProcedure`. Input: `{ schoolId, prompt: z.string().min(1).max(500), tone: z.enum(["formal", "friendly", "urgent"]) }`. Feature guard: check `AI_SUMMARY_PROVIDER !== "template"`. Returns `{ draft: string | null }`.

- [ ] Add feature toggle `aiDraftingEnabled Boolean @default(false)` to School. Register in all 6 toggle files. Add "AI Draft" to compose UI conditionally.

- [ ] Write 3 tests in `apps/api/src/__tests__/ai-drafting.test.ts`: generates draft with mocked AI, returns null when provider is template, respects rate limit.

- [ ] Commit: `git commit -m "feat: add AI message drafting with tone selector and rate limiting"`

---

## Feature 2.2: Smart Absence Pattern Detection

### Task 2: Service + Schema + Router

**Files:**
- Create: `apps/api/src/lib/attendance-alerts.ts`
- Modify: `packages/db/prisma/schema.prisma`
- Modify: `apps/api/src/router/attendance.ts`
- Modify: `apps/web/src/app/dashboard/attendance/page.tsx`

- [ ] Add schema: `AttendanceAlertType` enum (CONSECUTIVE_ABSENCE, DECLINING_TREND, DAY_PATTERN, POST_HOLIDAY, BELOW_THRESHOLD), `AttendanceAlertStatus` enum (OPEN, ACKNOWLEDGED, RESOLVED), `AttendanceAlert` model. Add `attendanceAlertsEnabled Boolean @default(false)` to School. Relations to Child, School, User.

- [ ] Create `detectPatterns(prisma, schoolId)` in `apps/api/src/lib/attendance-alerts.ts`. Pure heuristic, no AI. Detects: 3+ consecutive absences, declining trend >5% over 4 weeks, 3+ same-day absences in 6 weeks, below 90% threshold. Creates AttendanceAlert records.

- [ ] Wire into progress summary cron (runs weekly alongside summaries).

- [ ] Add to attendance router: `getAlerts` (schoolFeatureProcedure), `acknowledgeAlert` (schoolFeatureProcedure), `resolveAlert` (schoolFeatureProcedure).

- [ ] Add alert badges to staff attendance page.

- [ ] Register `attendanceAlertsEnabled` toggle in all 6 files.

- [ ] Write 4 tests: consecutive detection, day pattern detection, below threshold, no false positive for authorised absence.

- [ ] Commit: `git commit -m "feat: add smart absence pattern detection with staff alerts"`

---

## Feature 2.3: Smart Form Translation

### Task 3: Extend translation

**Files:**
- Modify: `apps/api/src/router/forms.ts`

- [ ] In `getTemplate` procedure, if `ctx.user.language !== "en"`, check TranslationCache for form fields. If not cached, call AI provider to translate field labels + descriptions contextually. Cache result. Fallback to existing google-translate-api-x on AI failure.

- [ ] Write 2 tests: translates form fields, uses cache on second call.

- [ ] Commit: `git commit -m "feat: add AI contextual form translation with cache"`

---

## Feature 2.4: AI Report Card Comments

### Task 4: Service + Router

**Files:**
- Create: `apps/api/src/lib/ai-report-comments.ts`
- Modify: `apps/api/src/router/report-card.ts`

- [ ] Create `generateComment(childMetrics, subject, grade)` using AI provider. Reuses `gatherChildMetrics` from progress-summary. Generates 2-3 sentence subject comment.

- [ ] Add `generateComment` procedure to report-card router. `schoolFeatureProcedure`. Input: `{ schoolId, childId, subject, currentGrade? }`. Only available when AI provider is configured.

- [ ] Write 3 tests: generates comment with mocked AI, returns null when template mode, includes subject context.

- [ ] Commit: `git commit -m "feat: add AI report card comment generation from child data"`

---

## Feature 2.5: Predictive Payment Reminders

### Task 5: Extend payments

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `apps/api/src/lib/payment-reminders.ts`

- [ ] Add `reminderSentAt DateTime?` to `PaymentItemChild` model in schema.

- [ ] Create `sendPaymentReminders(prisma)` service. Simple heuristic: query parent's payment history, if >2 late payments, send reminder 3 days before due (vs standard 1 day). Uses existing notification service. Track via `reminderSentAt`.

- [ ] Wire into a daily cron (check at 9am for payments due within 1-3 days).

- [ ] Write 2 tests: early reminder for late-payer, standard reminder for on-time payer.

- [ ] Commit: `git commit -m "feat: add predictive payment reminders based on payment history"`

---

## Feature 2.6: AI Homework Help Hints

### Task 6: Service + Router

**Files:**
- Create: `apps/api/src/lib/ai-homework-hints.ts`
- Modify: `apps/api/src/router/homework.ts`
- Modify: `packages/db/prisma/schema.prisma`

- [ ] Add `hintCount Int @default(0)` to `HomeworkCompletion` model.

- [ ] Create `generateHint(title, description, subject, yearGroup)` using AI provider. System prompt: guide without answering, age-appropriate language. Max 200 chars.

- [ ] Add `getHint` procedure to homework router. `protectedProcedure`. Input: `{ assignmentId, childId }`. Verify parentChild. Check hintCount < 3. Increment hintCount. Call AI. Return hint.

- [ ] Add "Get a Hint" button to homework page parent view (only when AI configured).

- [ ] Write 3 tests: generates hint, rejects after 3 hints, returns null in template mode.

- [ ] Commit: `git commit -m "feat: add AI homework help hints with rate limiting"`

---

## Task 7: Verification

- [ ] Generate Prisma, run lint, build, all tests. Fix issues. Commit.
- [ ] Update seed data with new feature toggles enabled.
- [ ] Push to main.

---

## Summary

| Task | Feature | AI Cost | Tests |
|------|---------|---------|-------|
| 1 | Message Drafting | Yes (per draft) | 3 |
| 2 | Absence Detection | No (rule-based) | 4 |
| 3 | Form Translation | Yes (cached) | 2 |
| 4 | Report Comments | Yes (per comment) | 3 |
| 5 | Payment Reminders | No (heuristic) | 2 |
| 6 | Homework Hints | Yes (per hint) | 3 |
| 7 | Verification | — | — |

**Total: 7 tasks, 17 tests**
