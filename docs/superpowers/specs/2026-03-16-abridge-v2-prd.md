# Abridge v2 — Product Requirements Document

**Date:** 2026-03-16
**Status:** Approved
**Vision:** The AI-first school communication platform. Every feature augmented by AI. Schools choose their own AI provider.

**Rebrand:** SchoolConnect → Abridge. All user-facing references updated. Internal package scope (`@schoolconnect/`) unchanged.

---

## Competitive Position

Abridge's moat is the **AI layer** — no competitor has AI-powered insights, and no competitor lets schools choose their own AI provider (Claude, OpenAI, Gemini, Ollama). This is a GDPR/data sovereignty story that UK schools care deeply about.

| Capability | ClassDojo | ParentMail | Weduc | Arbor | **Abridge** |
|-----------|-----------|------------|-------|-------|------------|
| AI Progress Summaries | no | no | no | no | **yes** |
| Configurable AI provider | no | no | no | no | **yes** |
| Real-time parent-teacher chat | yes | no | yes | no | **Phase 1** |
| AI message drafting | no | no | no | no | **Phase 2** |
| AI absence pattern detection | no | no | no | no | **Phase 2** |
| Student self-service portal | no | no | no | yes | **Phase 4** |
| Feature toggles per school | no | no | no | partial | **yes** |
| Open deployment (cloud, self-host planned) | no | no | no | no | **yes** |

Note: Self-hosting via Docker Compose is planned but not yet implemented. Current deployment is Vercel + Railway.

---

## Phase Overview

| Phase | Name | Focus | Effort | Ralph Loop |
|-------|------|-------|--------|-----------|
| 0 | Rebrand | SchoolConnect → Abridge | Small | No |
| 1 | Real-time Chat | WebSocket parent-teacher chat | Large | Yes |
| 2 | AI Everywhere | 6 AI features across the platform | Large | Yes (4 of 6) |
| 3 | Mobile Parity | 8 Expo screens + Maestro E2E | Medium | Yes |
| 4 | Student Portal | Student login with filtered access | Medium | Yes |
| 5 | Polish & Production | Tests, staging, migrations, timetable | Small | Yes (tests) |

**Build order:** 0 → 5.1 → 5.3 → 1 → 2.1+2.2 → 3 (high priority screens) → 2.3-2.6 → 4 → 3 (remaining) → 5.2+5.4+5.5

---

## Phase 0: Rebrand

**Goal:** Rename every user-facing reference from SchoolConnect to Abridge.

### What changes
- `apps/web` — page titles, headings, sidebar logo text ("Abridge"), landing page hero, meta tags (`<title>`, `og:title`, `og:description`), PWA manifest (`name`, `short_name`), favicon
- `apps/mobile` — app name in `app.json`, splash screen text, About screen
- `apps/api` — Swagger docs title ("Abridge API"), email templates (Resend), notification text
- `packages/db/prisma/seed.ts` — seed school name if referencing "SchoolConnect"
- `docs/` — all markdown files (USER_GUIDE, API, DEVELOPMENT, README, AGENTS, CLAUDE)
- E2E tests — update selectors that match "SchoolConnect" text

### What does NOT change
- Package scope (`@schoolconnect/db`, `@schoolconnect/api`) — internal only, renaming causes cascading breakage across imports, Turborepo config, and CI
- Database table names — no migration needed
- Git repo name — separate concern, rename when ready
- Domain — DNS/hosting level, not a code change
- Environment variable names — internal

### Tests
- Run existing E2E suite after rebrand to catch any broken text selectors
- Grep for remaining "SchoolConnect" references to verify completeness

### Ralph Loop
No — find-and-replace task, not iterative.

---

## Phase 1: Real-time Parent-Teacher Chat

**Goal:** GDPR-compliant, school-moderated real-time chat that replaces illegal WhatsApp groups. The #1 reason UK schools switch platforms.

### Infrastructure

**WebSocket server:**
- `@fastify/websocket` plugin on the existing Fastify server
- Auth: validate better-auth session token on WebSocket upgrade handshake
- Connection manager (`apps/api/src/lib/chat/connection-manager.ts`):
  - In-memory Map of userId → WebSocket connections (supports multiple tabs/devices)
  - Heartbeat ping every 30 seconds, disconnect after 3 missed pongs
  - Reconnection: client uses exponential backoff (1s, 2s, 4s, 8s, max 30s)

**Scaling note:** In-memory connection manager is single-instance only. For horizontal scaling (2+ API servers), add Redis pub/sub as a message broker between instances. Single-instance is appropriate for school-sized deployments (typically <500 concurrent users per school).

**Message types over WebSocket:**
```typescript
type WsMessage =
  | { type: "chat:message"; conversationId: string; body: string }
  | { type: "chat:typing"; conversationId: string; isTyping: boolean }
  | { type: "chat:read"; conversationId: string; messageId: string }
  | { type: "chat:online"; userId: string; online: boolean }
```

### Schema

```prisma
model ChatMessage {
  id             String       @id @default(cuid())
  conversationId String
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation("ChatMessageSender", fields: [senderId], references: [id])
  body           String
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
  @@map("chat_message")
}
```

**Unread count strategy:** Since chat is 1:1, `readAt` on `ChatMessage` is unambiguous (only one recipient). Unread count = `COUNT(*) WHERE conversationId = X AND senderId != currentUser AND readAt IS NULL`. Acceptable performance for school chat volumes.

Note: Create a separate `ChatConversation` model rather than extending the existing `Conversation` (which is used for async messaging threads with the `Message` model). This avoids architectural confusion between real-time chat and broadcast messaging. The `ChatMessage` model references `ChatConversation` instead of `Conversation`.

Add `User` relation: `chatMessagesSent ChatMessage[] @relation("ChatMessageSender")`

Feature toggle: `liveChatEnabled Boolean @default(false)` on School.

### Chat Rules (safeguarding-critical)
- **1:1 only** — no group chats (moderation requirement for UK schools)
- Parent initiates chat with any staff member at their child's school
- Staff sees inbox of all conversations, sorted by last message
- Staff can close/archive conversations (parent cannot)
- **Admin can view any conversation** in their school (safeguarding requirement)
- **Messages cannot be deleted** — only archived. Full audit trail.
- Admin export: download full conversation as PDF for safeguarding reviews
- Max message length: 2000 characters
- **Retention policy:** Chat messages retained for 6 years (UK school record-keeping requirement), then automatically purged. A scheduled job removes messages older than the retention period monthly.
- Reopening: when a parent messages a staff member with a closed conversation, the existing conversation is reopened (closedAt set back to null) rather than creating a new one. The `@@unique([schoolId, parentId, staffId])` constraint on ChatConversation enforces this.
- Auto-flag: optional keyword list for concerning content (configurable per school). When triggered: creates a safeguarding alert visible to the school's Designated Safeguarding Lead (DSL) via the admin panel, logs the flagged message + conversation for review. Does NOT block message delivery.

### Delivery
- Real-time via WebSocket if recipient is connected
- If offline: send push notification (reuse existing `notificationService`)
- If push fails: SMS fallback via existing notification-fallback cron
- Message persisted in DB regardless of delivery status

### Web UI
- New page: `/dashboard/chat`
- Split view: conversation list (left panel) + message thread (right panel)
- Typing indicator: "Sarah is typing..." (transient, not persisted)
- Online status: green dot on avatar (in-memory, not persisted)
- Unread count badge in nav sidebar
- Staff inbox: all conversations with unread counts, sorted by last message
- Admin view: toggle to see all school conversations

### Router (`chat`)
- `sendMessage` — `protectedProcedure`. Verify participant. Create ChatMessage. Broadcast via WebSocket. Push notify if offline.
- `getMessages` — `protectedProcedure`. Verify participant. Cursor-based pagination.
- `markRead` — `protectedProcedure`. Update readAt on messages.
- `getConversations` — `protectedProcedure`. List conversations with unread counts.
- `closeConversation` — `schoolStaffProcedure`. Archive conversation.
- `adminGetConversation` — `schoolAdminProcedure`. Admin views any conversation.
- `exportConversation` — `schoolAdminProcedure`. Generate PDF export.

### Tests
- 6 API unit tests: send message, read receipt, typing event, admin access, conversation close, message history
- 3 E2E tests: parent sends message and receives reply, staff sees inbox, admin views conversation

### Ralph Loop
**YES** — WebSocket reconnection edge cases:
```
/ralph-loop "Test WebSocket chat reliability. Start API server, connect as parent, send message, verify delivery. Then: disconnect WiFi simulation (close WS), reconnect, verify missed messages delivered. Test concurrent connections (2 tabs). Test heartbeat timeout. Fix any failures. Output <promise>CHAT RELIABLE</promise> when all edge cases pass." --max-iterations 10
```

---

## Phase 2: AI Everywhere

**Goal:** Every repetitive staff task gets an AI assist. Every data pattern gets surfaced automatically. All features use the same configurable provider system (`AI_SUMMARY_PROVIDER` / `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`).

### 2.1 AI Message Drafting

**What:** Staff type a brief prompt, AI generates a full parent-facing message.

**Input:** Staff types: "reminder school trip friday, packed lunch, £5 outstanding"
**Output:** AI generates: "Dear Parents, A reminder that our school trip is this Friday. Please ensure your child brings a packed lunch. If you have an outstanding balance of £5.00, please make payment via the app before Thursday. Thank you."

**UI:** In the message compose form, add:
- "AI Draft" button that opens a prompt input
- Tone selector: Formal / Friendly / Urgent
- Generated draft fills the message body (editable before sending)
- "Regenerate" button for a different version

**Rate limit:** 20 AI drafts per user per hour. Returns cached previous generation if limit exceeded.

**Service:** `apps/api/src/lib/ai-drafting.ts`
- `generateDraft(prompt, tone, schoolName)` — calls AI provider with a system prompt tailored to the tone
- Same timeout/fallback pattern as progress summaries
- Token tracking for cost monitoring

**Feature toggle:** `aiDraftingEnabled Boolean @default(false)`

**Router:** Add `generateDraft` to messaging router — `schoolFeatureProcedure`.

**Ralph Loop: YES** — tuning prompts for 3 tone settings across different message types:
```
/ralph-loop "Test AI message drafting. Generate drafts for: trip reminder, absence follow-up, payment overdue, sports day invitation, snow closure. Test each in Formal/Friendly/Urgent tones. Check: appropriate length, correct tone, no hallucinated details, uses school name. Adjust system prompt until all 15 combinations are good. Output <promise>DRAFTING TUNED</promise> when quality is consistent." --max-iterations 10
```

### 2.2 Smart Absence Pattern Detection

**What:** Automatically flag concerning attendance patterns that humans miss.

**Patterns detected:**
- 3+ consecutive absences
- Declining attendance trend over 4 weeks (>5% drop)
- Frequent Monday/Friday absences (3+ in 6 weeks — potential indicator)
- Absence spike after school holidays (3+ days within first week back)
- Below 90% attendance threshold (UK statutory concern level)

**Schema:**
```prisma
enum AttendanceAlertType {
  CONSECUTIVE_ABSENCE
  DECLINING_TREND
  DAY_PATTERN
  POST_HOLIDAY
  BELOW_THRESHOLD
}

enum AttendanceAlertStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
}

model AttendanceAlert {
  id          String                @id @default(cuid())
  childId     String
  child       Child                 @relation("AttendanceAlerts", fields: [childId], references: [id], onDelete: Cascade)
  schoolId    String
  school      School                @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  type        AttendanceAlertType
  status      AttendanceAlertStatus @default(OPEN)
  description String
  data        Json
  acknowledgedBy String?
  acknowledger   User?              @relation("AttendanceAlertAcknowledger", fields: [acknowledgedBy], references: [id])
  resolvedAt  DateTime?
  createdAt   DateTime              @default(now())

  @@index([schoolId, status])
  @@index([childId, createdAt])
  @@map("attendance_alert")
}
```

**Service:** `apps/api/src/lib/attendance-alerts.ts`
- `detectPatterns(prisma, schoolId)` — runs all pattern detectors, creates alerts
- Pure heuristic — no AI API call needed (rule-based detection)
- Runs as part of the weekly progress summary cron (Monday 6am)

**Feature toggle:** `attendanceAlertsEnabled Boolean @default(false)`

**Staff UI:** Alert badges on attendance page. Click to view details, acknowledge, or resolve.

**No parent-facing component** — staff-only, safeguarding sensitive.

**Ralph Loop: YES** — tuning detection thresholds:
```
/ralph-loop "Test attendance alert detection against seed data. Create scenarios: child with 3 consecutive absences, child with Monday pattern, child at 88% attendance. Run detectPatterns. Check: correct alerts generated, no false positives for children with valid absences (e.g. authorised). Adjust thresholds. Output <promise>DETECTION TUNED</promise> when precision is good." --max-iterations 8
```

### 2.3 Smart Form Translation

**What:** Auto-translate form fields when parent's language isn't English. AI translates contextually (not word-by-word).

**Implementation:**
- When parent views a form and `user.language !== "en"`, check `TranslationCache` for form+language
- If not cached: send field labels + descriptions to AI for contextual translation
- Cache result in `TranslationCache` (existing model)
- Fallback to existing `google-translate-api-x` if AI fails

**Feature toggle:** Extend existing `translationEnabled` — no new toggle needed.

**Ralph Loop: NO** — straightforward integration.

### 2.4 AI Report Card Comments

**What:** Auto-generate draft report card comments from child's data.

**Flow:**
- Teacher clicks "Generate comment" on a report card subject row
- AI receives: subject, grades, attendance %, homework completion rate, reading stats, achievements
- Generates 2-3 sentence comment: "Emma has shown excellent progress in Mathematics this term, consistently achieving Expected level. Her homework completion rate of 95% demonstrates strong commitment."
- Teacher edits before saving

**Service:** `apps/api/src/lib/ai-report-comments.ts`
- `generateComment(childMetrics, subject, grade)` — calls AI provider
- Reuses `gatherChildMetrics` from progress-summary service

**Feature toggle:** Extend existing `reportCardsEnabled` — add "Generate" button only when `AI_SUMMARY_PROVIDER !== "template"`.

**Ralph Loop: YES** — tuning comment quality:
```
/ralph-loop "Test AI report card comments for different scenarios: high-achieving child, struggling child, average child, child with no data. Check: appropriate tone, factual accuracy, no generic phrases, correct subject context. Adjust prompt. Output <promise>COMMENTS TUNED</promise> when quality is consistent." --max-iterations 8
```

### 2.5 Predictive Payment Reminders

**What:** Parents who've been late before get earlier reminders.

**Implementation:**
- Simple heuristic (no AI call): query payment history, if >2 late payments, flag as "needs early reminder"
- Early reminder sent 3 days before due date (vs standard 1 day)
- Extends existing notification service schedule

Add `reminderSentAt DateTime?` to `PaymentItemChild` (not `PaymentItem`) — reminders are per-child since some parents pay early and others don't.

**Feature toggle:** Part of existing `paymentsEnabled`.

**Ralph Loop: NO** — rule-based, not iterative.

### 2.6 AI Homework Help Hints

**What:** Parent clicks "Get a hint" on homework, AI provides guidance without giving the answer.

**Flow:**
- Parent views homework assignment detail
- "Get a Hint" button visible
- AI reads title + description, generates a guiding question
- "Try breaking the multiplication into smaller steps. What is 6 × 3 first?"
- Rate limited: 3 hints per assignment per child (prevents answer-fishing)

**Schema:** Add `hintCount Int @default(0)` to `HomeworkCompletion`.

**Service:** `apps/api/src/lib/ai-homework-hints.ts`
- `generateHint(title, description, subject, yearGroup)` — calls AI provider
- System prompt emphasizes: guide, don't answer. Age-appropriate language.

**Feature toggle:** Extend existing `homeworkEnabled` — hints only appear when `AI_SUMMARY_PROVIDER !== "template"`.

**Ralph Loop: YES** — critical to get right (must give guidance, not answers):
```
/ralph-loop "Test homework hints for: Year 4 maths (times tables), Year 6 English (creative writing), Year 3 science (plants). Check: hints guide without revealing answers, age-appropriate language, specific to the assignment. Test edge case: vague assignment description. Adjust prompt. Output <promise>HINTS TUNED</promise> when hints consistently guide without answering." --max-iterations 10
```

---

## Phase 3: Mobile Parity

**Goal:** Every web feature has a corresponding Expo React Native screen. Parents primarily use mobile.

### Screens to build (priority order)

| # | Screen | Web Page Source | Priority | Notes |
|---|--------|----------------|----------|-------|
| 1 | `HomeworkScreen.tsx` | `homework/page.tsx` | High | Parent: list + mark done. Staff: set + grade. |
| 2 | `ReadingDiaryScreen.tsx` | `reading/page.tsx` | High | Parent: log reading + streak. Staff: class overview. |
| 3 | `ProgressScreen.tsx` | `progress/page.tsx` | High | Parent: metrics cards + AI insight. |
| 4 | `ChatScreen.tsx` | `chat/page.tsx` (Phase 1) | High | Real-time chat. WebSocket on mobile. |
| 5 | `AchievementsScreen.tsx` | `achievements/page.tsx` | Medium | Parent: points + badges. Staff: award. |
| 6 | `GalleryScreen.tsx` | `gallery/page.tsx` | Medium | Parent: album grid + photo viewer. |
| 7 | `TimetableScreen.tsx` | `timetable/page.tsx` (Phase 5) | Medium | Weekly grid view. |
| 8 | `VisitorsScreen.tsx` | `visitors/page.tsx` | Low | Staff-only, usually at desk. |

### For each screen
- Follow existing Expo patterns in `apps/mobile/src/screens/`
- NativeWind styling (Tailwind for React Native)
- Same tRPC queries as web equivalent
- Add navigation entry in mobile nav stack
- Create Maestro YAML E2E flow under `apps/mobile/.maestro/parent/` or `staff/`

### Ralph Loop
**YES** — per screen:
```
/ralph-loop "Build HomeworkScreen.tsx for Expo. Follow patterns from existing screens. Run on iOS simulator. Take screenshot. Check: layout matches web equivalent, all data renders, mark-done button works. Fix any issues. Run Maestro flow. Output <promise>HOMEWORK SCREEN DONE</promise> when screen works and Maestro passes." --max-iterations 8
```

---

## Phase 4: Student Portal

**Goal:** Secondary school students (11-16) self-serve homework, timetable, and progress without going through parents.

### Schema changes

Add to `Child` model:
```prisma
  userId    String?  @unique
  user      User?    @relation("StudentUser", fields: [userId], references: [id])
```

Add `Student` to considerations in auth flow — check if user has a `Child` record linked.

Feature toggle: `studentPortalEnabled Boolean @default(false)`

### Student access matrix

| Feature | Student can... |
|---------|---------------|
| Homework | View assignments, mark complete, see grades |
| Timetable | View their schedule |
| Reading diary | Log reading sessions |
| Achievements | View points and badges |
| Progress summaries | View their own summary |
| Attendance | View their own record |
| Payments | **NO** — parent only |
| Forms/consent | **NO** — parent only (legally) |
| Messages | **NO** — go to parent |
| Chat | **NO** — parent only (safeguarding) |
| Wellbeing | **NO** — parent/staff only |

### Auth flow
- Staff generates student invite code per child (not per class)
- Student registers with code + email + password
- Code links to `Child` record via `child.userId`
- Student sessions have role `"student"` for RBAC
- Same web + mobile app, filtered by role

**Middleware:** Add `studentProcedure` to `apps/api/src/trpc.ts` — checks `child.userId === ctx.user.id`. Students bypass `parentChild` checks and access their own `Child` record directly. Existing `protectedProcedure` works for student login; `studentProcedure` adds the child-self-access pattern.

### Tests
- 4 API tests: student auth, homework access, payment rejection, timetable access
- 2 E2E tests: student views homework, student can't access payments

### Ralph Loop
**Ralph Loop: YES (short)**
```
/ralph-loop "Test student access matrix. Login as student. Verify: can view homework, timetable, reading diary, achievements, progress, attendance. Verify CANNOT access: payments, forms, messages, chat, wellbeing. Fix any RBAC leaks. Output <promise>STUDENT RBAC VERIFIED</promise> when all access controls hold." --max-iterations 5
```

---

## Phase 5: Polish & Production Readiness

### 5.1 Fix Remaining Test Issues

- **3 api-docs test failures** — `@fastify/swagger` import in vitest. Rewrite as integration test or fix mock.
- **8 pre-existing lint errors** — `noNonNullAssertion` in WellbeingScreen.tsx, attendance/page.tsx, reports/page.tsx. Replace `!` with `?? fallback`.
- **Emergency-comms E2E flakiness** — consistently flaky "Lockdown in Effect" test.

**Ralph Loop: YES**
```
/ralph-loop "Run all API tests (cd apps/api && npx vitest run). Fix any failures. Run lint (npx pnpm lint). Fix errors in our files. Run build (npx pnpm build). Fix TS errors. Output <promise>ALL CLEAN</promise> when 0 test failures AND 0 lint errors in our files AND build passes." --max-iterations 10
```

### 5.2 Staging Environment

- Vercel preview deployment for web (auto-deploys on `develop` branch)
- Railway staging instance for API
- Separate staging PostgreSQL database
- `AI_SUMMARY_PROVIDER=template` on staging (no AI costs)
- CI: deploy to staging on `develop`, production on `main`

### 5.3 Database Migrations

- Switch from `prisma db push` to `prisma migrate` for production
- Generate migration history from current schema state
- Add `prisma migrate deploy` to CI/CD pipeline before server start
- Document rollback procedures in `docs/DEPLOYMENT.md`

### 5.4 Timetable Web UI

- New page: `/dashboard/timetable`
- `TimetableEntry` model already exists in schema — no schema changes
- Parent view: per-child weekly grid (Mon-Fri columns, period rows), colour-coded by subject
- Staff view: class timetable management, manual entry form
- Data source: MIS sync populates TimetableEntry, or manual staff entry

### 5.5 Rebrand Verification

- Final grep for remaining "SchoolConnect" references
- Verify all user-facing text says "Abridge"
- Update email templates, push notification text
- Verify PWA manifest, meta tags, og:image

---

## Ralph Loop Summary

| Phase | Ralph Loop Task | Iterations | What it tunes |
|-------|----------------|------------|---------------|
| 1 | WebSocket reliability | 10 | Reconnection, heartbeat, offline delivery |
| 2.1 | Message drafting prompts | 10 | 3 tones × 5 message types |
| 2.2 | Absence detection thresholds | 8 | Pattern sensitivity, false positive rate |
| 2.4 | Report card comment quality | 8 | Tone, factual accuracy, subject context |
| 2.6 | Homework hint guidance | 10 | Guide vs answer, age-appropriate language |
| 3 | Mobile screen polish (×8) | 8 each | Layout, data rendering, Maestro stability |
| 4 | Student RBAC verification | 5 | Access controls, permission leaks |
| 5.1 | Test + lint cleanup | 10 | Test reliability, lint compliance |

**Total Ralph Loop iterations:** ~100 across all phases

---

## Environment Variables (new)

| Variable | Phase | Purpose |
|----------|-------|---------|
| `WEBSOCKET_HEARTBEAT_INTERVAL` | 1 | Heartbeat ping interval in ms (default: 30000) |
| `CHAT_MAX_MESSAGE_LENGTH` | 1 | Max chat message length (default: 2000) |
| `CHAT_KEYWORD_LIST` | 1 | Comma-separated safeguarding keywords (optional) |
| `ATTENDANCE_ALERT_CONSECUTIVE_THRESHOLD` | 2.2 | Days for consecutive absence alert (default: 3) |
| `ATTENDANCE_ALERT_DAY_PATTERN_THRESHOLD` | 2.2 | Occurrences for day-pattern alert (default: 3) |
| `ATTENDANCE_ALERT_BELOW_THRESHOLD` | 2.2 | Percentage for below-threshold alert (default: 90) |
| `HINT_MAX_PER_ASSIGNMENT` | 2.6 | Max hints per child per assignment (default: 3) |

All existing AI env vars (`AI_SUMMARY_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `ANTHROPIC_API_KEY`) are reused by Phase 2 features.

---

## Success Metrics

| Metric | Target | How to measure |
|--------|--------|---------------|
| WhatsApp replacement | 80% of pilot school parents use chat within 1 month | Chat message count vs school size |
| AI adoption | 50% of staff use AI drafting within 2 weeks | Draft generation count |
| Mobile usage | 60% of parent sessions are mobile | Analytics |
| Student portal | 70% of secondary students register within 1 term | Student registrations vs eligible children |
| Absence detection | Flag 90% of concerning patterns with <10% false positive | Manual review of alerts vs actual concerns |
