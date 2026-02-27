# Phase 3 Feature Design: SchoolConnect Expansion

**Date:** 2026-02-27
**Status:** Approved
**Goal:** Balanced feature set targeting school acquisition, parent engagement, and staff efficiency across both primary and secondary UK schools.
**Constraints:** Minimal AI (deterministic logic only), hybrid integrations (MIS essential, standalone everything else), per-school feature toggles for all features.

---

## Phase Overview

| Phase | Theme | Features | Priority |
|-------|-------|----------|----------|
| **3A** | Safety & Compliance | Wellbeing Check-ins, Emergency Lockdown Comms, Admin Analytics | First |
| **3B** | Daily Engagement | Meal Booking, Digital Report Cards (PDF), Community Hub | Second |
| **3C** | Operational Efficiency | MIS Integration, Homework Tracker, Reading Diary, Visitor Management | Third |

---

## School Branding (Cross-Cutting)

New fields on the `School` model used across all PDF-generating features:

```
School (add fields)
├── logoUrl         (String nullable — school crest/logo, max 2MB PNG/JPG)
├── brandColor      (String nullable — hex code, default "#1E3A5F")
├── secondaryColor  (String nullable — hex accent colour)
├── schoolMotto     (String nullable — displayed on official documents)
├── brandFont       (enum nullable: DEFAULT, ARIAL, TIMES_NEW_ROMAN, GEORGIA, VERDANA,
│                     COMIC_SANS, OPEN_SANS, ROBOTO, LATO, MONTSERRAT)
```

Admin configures branding once in Admin settings. Applied to: report card PDFs, emergency alert emails, payment receipts, consent forms.

PDF generation uses `@react-pdf/renderer` server-side for consistent output across all devices.

---

## Feature Toggles Summary

All features are per-school toggles on the `School` model, default `false`:

| Feature | Toggle Field |
|---------|-------------|
| Wellbeing Check-ins | `wellbeingEnabled` |
| Emergency Comms | `emergencyCommsEnabled` |
| Admin Analytics | `analyticsEnabled` (exists) |
| Meal Booking | `mealBookingEnabled` |
| Digital Report Cards | `reportCardsEnabled` |
| Community Hub | `communityHubEnabled` |
| MIS Integration | `misIntegrationEnabled` |
| Homework Tracker | `homeworkEnabled` |
| Reading Diary | `readingDiaryEnabled` |
| Visitor Management | `visitorManagementEnabled` |

When disabled: nav links hidden, API procedures return early with error, mobile screens hidden. Toggling off preserves data.

---

## Phase 3A: Safety & Compliance

### 3A.1 Wellbeing Check-ins

**Purpose:** Lightweight mood tracking for students. Deterministic rule-based alerts flag patterns for staff. No AI.

#### Data Model

```
WellbeingCheckIn
├── id            (CUID)
├── childId       → Child
├── schoolId      → School
├── mood          (enum: GREAT, GOOD, OK, LOW, STRUGGLING)
├── note          (String nullable, max 200 chars)
├── checkedInBy   (enum: STUDENT, PARENT, STAFF)
├── date          (@db.Date)
├── createdAt
└── unique [childId, date]

WellbeingAlert
├── id              (CUID)
├── childId         → Child
├── schoolId        → School
├── triggerRule     (enum: THREE_LOW_DAYS, FIVE_ABSENT_DAYS, MOOD_DROP, MANUAL)
├── status          (enum: OPEN, ACKNOWLEDGED, RESOLVED)
├── acknowledgedBy  → User (nullable)
├── resolvedBy      → User (nullable)
├── note            (text nullable)
├── createdAt
├── acknowledgedAt  (nullable)
├── resolvedAt      (nullable)
```

#### Trigger Rules

| Rule | Fires When | Cooldown |
|------|------------|----------|
| `THREE_LOW_DAYS` | 3+ days LOW/STRUGGLING in 7-day window | 7 days |
| `FIVE_ABSENT_DAYS` | 5+ absences in 30-day window | 14 days |
| `MOOD_DROP` | 2+ level drop from 7-day average | 7 days |
| `MANUAL` | Staff manually flags | None |

#### User Flows

- **Parents (primary):** Submit on behalf of child. Morning push: "How is [Child] feeling today?" Tap 1 of 5 emojis, optional note. < 5 seconds.
- **Students (secondary):** Submit themselves via mobile app.
- **Staff:** Dashboard with class colour-coded grid. Alert queue (open alerts sorted by severity). Click alert → 30-day mood history + attendance overlay. Acknowledge → Resolve workflow with notes.

#### Privacy

- Secondary students submit themselves; parents see only their child's data.
- Staff see only children at their school.
- Data retained 1 academic year, then purged.

#### Performance

- Check-in: single INSERT, no computation at write time.
- Alert generation: cron every 15 min, queries only today's check-ins against rolling windows.
- Dashboard: date-indexed queries with `[schoolId, date]` compound index.

---

### 3A.2 Emergency Lockdown Comms

**Purpose:** Single-tap alert to all parents during critical incidents. Fastest path in the entire app.

#### Data Model

```
EmergencyAlert
├── id              (CUID)
├── schoolId        → School
├── type            (enum: LOCKDOWN, EVACUATION, SHELTER_IN_PLACE, MEDICAL, OTHER)
├── status          (enum: ACTIVE, ALL_CLEAR, CANCELLED)
├── title           (auto-generated from type)
├── message         (String nullable, max 500 chars)
├── initiatedBy     → User
├── resolvedBy      → User (nullable)
├── resolvedAt      (nullable)
├── createdAt
├── updatedAt

EmergencyUpdate
├── id              (CUID)
├── alertId         → EmergencyAlert
├── message         (text, max 500 chars)
├── postedBy        → User
├── createdAt
```

#### User Flows

- **Staff (initiate):** Red "Emergency" button always visible on staff dashboard. Select type → optional message → confirm with PIN (existing login password). Alert fires immediately.
- **Delivery:** Push (URGENT priority, bypasses quiet hours) + SMS + Email — all three simultaneously.
- **Parents:** Full-screen alert on mobile. Persistent red banner on web. Real-time updates as staff post them. "All Clear" notification on resolution.
- **Staff (manage):** Post timestamped updates. Only admin or initiator can resolve. Cancel requires reason.

#### Safeguards

- One active alert per school at a time.
- PIN confirmation prevents accidental triggers.
- Cancel requires reason (audit trail).
- All actions logged with timestamps and user IDs.
- Alert history retained permanently (safeguarding record).
- Any staff role can initiate (not just admin — anyone should be able to raise an alert).

#### Performance

- Single INSERT + fan-out via existing NotificationDelivery infrastructure.
- Active alert: single indexed lookup `[schoolId, status = ACTIVE]`.
- Target: < 2 seconds from tap to first notification dispatched.
- Fan-out is async — staff sees confirmation immediately.

---

### 3A.3 Admin Analytics Dashboard

**Purpose:** Data-driven view of school operations. Built entirely from existing data — no new data collection.

#### No New Domain Models

Purely read-side aggregation. One new model for caching:

```
AnalyticsSnapshot
├── id          (CUID)
├── schoolId    → School
├── period      (enum: DAILY, WEEKLY, TERMLY)
├── date        (@db.Date)
├── data        (JSON — pre-computed aggregates)
├── createdAt
└── unique [schoolId, period, date]
```

#### Dashboard Sections

**Attendance Overview:**
- School-wide attendance % (today, this week, this term)
- Persistent absentees (< 90%)
- Year group breakdown
- 12-week trend line

**Payment Completion:**
- Total collected this term
- Outstanding amount
- Completion rate by category
- Overdue payments (> 14 days)

**Message Engagement:**
- Messages sent this term
- Read rate (%)
- Average time-to-read
- Unread by category

**Form & Consent Tracking:**
- Active forms and submission rate
- Overdue forms
- Per-form completion breakdown

**Wellbeing Summary** (when `wellbeingEnabled`):
- Check-in rate today
- Mood distribution
- Open alerts count

#### UI

- Top row: 4 summary cards. Below: tabbed sections with charts and tables.
- Date range picker: today / this week / this term / custom.
- CSV export per section.

#### Performance Strategy

| Strategy | Detail |
|----------|--------|
| Materialised cache | Nightly cron pre-computes term aggregates into `AnalyticsSnapshot` |
| Redis hot cache | Summary cards cached 5-min TTL |
| Compound indexes | `[schoolId, date]` on AttendanceRecord, Message, Payment |
| Pagination | Drill-down tables paginated |
| Near-real-time | 5-min cache, not live WebSocket |

---

## Phase 3B: Daily Engagement

### 3B.1 Meal Booking & Dietary Management

**Purpose:** Parents pre-order school meals, manage allergy profiles. Kitchens get accurate daily counts. Daily touchpoint, especially for primary.

#### Data Model

```
MealMenu
├── id              (CUID)
├── schoolId        → School
├── weekStarting    (@db.Date — always Monday)
├── publishedAt     (nullable)
├── createdBy       → User
├── createdAt
└── unique [schoolId, weekStarting]

MealOption
├── id              (CUID)
├── menuId          → MealMenu
├── day             (enum: MONDAY–FRIDAY)
├── name            (String)
├── description     (String nullable)
├── category        (enum: HOT_MAIN, VEGETARIAN, JACKET_POTATO, SANDWICH, DESSERT)
├── allergens       (String[] — UK 14 allergens)
├── priceInPence    (integer)
├── available       (boolean)
├── sortOrder       (integer)
├── createdAt

MealBooking
├── id              (CUID)
├── childId         → Child
├── schoolId        → School
├── mealOptionId    → MealOption
├── date            (@db.Date)
├── status          (enum: BOOKED, CANCELLED)
├── bookedBy        → User
├── createdAt
└── unique [childId, date]

DietaryProfile
├── id              (CUID)
├── childId         → Child (unique)
├── allergies       (String[] — UK 14 allergens)
├── dietaryNeeds    (enum[]: VEGETARIAN, VEGAN, HALAL, KOSHER, GLUTEN_FREE, DAIRY_FREE, OTHER)
├── otherNotes      (String nullable, max 300 chars)
├── updatedAt
├── createdAt
```

#### UK 14 Allergens

Celery, Cereals (gluten), Crustaceans, Eggs, Fish, Lupin, Milk, Molluscs, Mustard, Nuts, Peanuts, Sesame, Soya, Sulphites.

#### User Flows

- **Staff:** Create weekly menus with options per day. Publish → parents notified. Kitchen dashboard: daily aggregated counts + allergy flags. Toggle options unavailable mid-week.
- **Parents:** Set dietary profile once per child. View menu, allergen warnings auto-shown. Book one meal per day or full week. Pay via existing Stripe (DINNER_MONEY category). Cancel up to configurable cutoff (e.g., 8am same day).

#### Performance

- Menus: ~25 rows per week, no pagination needed.
- Kitchen aggregation: GROUP BY on MealBooking for date + school.
- Allergen matching: client-side array comparison.

---

### 3B.2 Digital Report Cards

**Purpose:** Replace paper reports. Structured digital format with termly progress, historical trends, and server-side branded PDF generation.

#### Data Model

```
ReportCycle
├── id              (CUID)
├── schoolId        → School
├── name            (String — "Autumn Term 2026")
├── type            (enum: TERMLY, HALF_TERMLY, END_OF_YEAR, MOCK, CUSTOM)
├── assessmentModel (enum: PRIMARY_DESCRIPTIVE, SECONDARY_GRADES)
├── publishDate     (@db.Date)
├── status          (enum: DRAFT, PUBLISHED, ARCHIVED)
├── createdBy       → User
├── createdAt
└── unique [schoolId, name]

ReportCard
├── id              (CUID)
├── cycleId         → ReportCycle
├── childId         → Child
├── schoolId        → School
├── generalComment  (text, max 1000 chars)
├── attendancePct   (Float)
├── createdAt
└── unique [cycleId, childId]

SubjectGrade
├── id              (CUID)
├── reportCardId    → ReportCard
├── subject         (String)
├── sortOrder       (integer)
├── level           (enum nullable: EMERGING, DEVELOPING, EXPECTED, EXCEEDING)
├── effort          (enum nullable: OUTSTANDING, GOOD, SATISFACTORY, NEEDS_IMPROVEMENT)
├── currentGrade    (String nullable — "7", "B+", "Merit")
├── targetGrade     (String nullable)
├── comment         (text, max 500 chars)
├── createdAt
```

#### Two Assessment Models

| | Primary (KS1/KS2) | Secondary (KS3/4/5) |
|---|---|---|
| Scale | Emerging → Exceeding | Numeric/letter grades |
| Focus | Descriptive + effort | Current vs target gap |
| Parent view | Colour-coded level badges | Gap indicators (green/red) |

`assessmentModel` on `ReportCycle` determines which fields are required and how the UI renders.

#### PDF Generation

- Library: `@react-pdf/renderer` (React components → PDF, no headless browser).
- Flow: tRPC procedure → fetch data → render template → upload to temp storage (signed URL, 15-min expiry) → return URL.
- Template uses school branding: logo, colours, font, motto.
- Cached in Redis (keyed by reportCardId, 1-hour TTL).
- Fallback: stream PDF buffer directly if S3 not configured.
- Rate limited: 1 request per report per minute per user.

#### User Flows

- **Staff:** Admin creates report cycle. Teachers fill grades per child (bulk entry mode: table view per subject). Admin publishes on date.
- **Parents:** Push notification on publish. Report view: summary header → subject list with colour coding. "Download Report" button → branded PDF. Historical "Progress" tab per subject across cycles.

#### Performance

- Write-once, read-many — cached.
- 500 children × 10 subjects = 5,000 SubjectGrade rows — trivial.
- Bulk entry: single batch INSERT/upsert.
- Historical trend: max ~30 rows per child.
- PDF generation: ~200ms per report.

---

### 3B.3 Community Hub

**Purpose:** Replace WhatsApp/Facebook groups. Structured space for discussions, PTA events, and volunteer signups. No marketplace.

#### Data Model

```
CommunityPost
├── id              (CUID)
├── schoolId        → School
├── authorId        → User
├── type            (enum: DISCUSSION, EVENT, VOLUNTEER_REQUEST)
├── title           (String, max 150 chars)
├── body            (text, max 2000 chars)
├── tags            (String[] — max 3 per post)
├── imageUrls       (String[] — up to 4)
├── isPinned        (boolean — staff can pin, max 3 per school)
├── status          (enum: ACTIVE, CLOSED, REMOVED)
├── removedBy       → User (nullable)
├── removedReason   (String nullable)
├── createdAt
├── updatedAt

CommunityComment
├── id              (CUID)
├── postId          → CommunityPost
├── authorId        → User
├── body            (text, max 500 chars)
├── status          (enum: ACTIVE, REMOVED)
├── createdAt

VolunteerSlot
├── id              (CUID)
├── postId          → CommunityPost
├── description     (String)
├── date            (@db.Date)
├── startTime       (String — "14:00")
├── endTime         (String — "15:00")
├── spotsTotal      (integer)
├── spotsTaken      (integer, default 0)

VolunteerSignup
├── id              (CUID)
├── slotId          → VolunteerSlot
├── userId          → User
├── createdAt
└── unique [slotId, userId]
```

#### Tags

- `communityTags` field on `School` (String[]) — custom tags set by staff.
- Auto-generated year group tags merged with school custom tags.
- Filter bar: horizontal scrollable chips. GIN index on tags array for fast filtering.

#### Post Types

| Type | Example |
|------|---------|
| DISCUSSION | "Can anyone recommend a Year 3 maths workbook?" |
| EVENT | "Summer Fair — Saturday 12th July, 12-4pm" |
| VOLUNTEER_REQUEST | "4 helpers needed for Sports Day — sign up below" |

#### Moderation (deterministic)

- New accounts (< 7 days): max 2 posts/day.
- Posts with external URLs: held for staff review.
- Report button: 3 reports = auto-hidden, staff notified.
- Staff can pin/unpin (max 3), remove with reason.

#### Performance

- Feed: indexed on `[schoolId, status, createdAt DESC]`, cursor-based pagination (20/page).
- Comments: loaded on-demand per post expansion.
- Volunteer slots: atomic INCREMENT for spotsTaken.

---

## Phase 3C: Operational Efficiency

### 3C.1 MIS Integration Layer

**Purpose:** One-way sync from school MIS (SIMS, Arbor, Bromcom) into SchoolConnect. Eliminates double-entry for student data, attendance, and timetables.

#### Architecture: Adapter Pattern

```
MisProvider (interface)
├── syncStudents()      → Student[]
├── syncAttendance()    → AttendanceRecord[]
├── syncTimetable()     → TimetableEntry[]
├── syncYearGroups()    → YearGroup[]
├── testConnection()    → boolean

Adapters:
├── CsvAdapter       (manual upload fallback — build first)
├── ArborAdapter     (best API, growing share — build second)
├── SimsAdapter      (biggest share, complex API — build third)
├── BromcomAdapter   (smaller share — build fourth)
```

#### Data Model

```
MisConnection
├── id              (CUID)
├── schoolId        → School (unique)
├── provider        (enum: SIMS, ARBOR, BROMCOM, SCHOLARPACK, CSV_MANUAL)
├── apiUrl          (String nullable)
├── credentials     (String — encrypted JSON, AES-256)
├── status          (enum: CONNECTED, DISCONNECTED, ERROR)
├── lastSyncAt      (nullable)
├── lastSyncStatus  (enum: SUCCESS, PARTIAL, FAILED)
├── lastSyncError   (String nullable)
├── syncFrequency   (enum: HOURLY, TWICE_DAILY, DAILY, MANUAL)
├── createdAt
├── updatedAt

MisSyncLog
├── id              (CUID)
├── connectionId    → MisConnection
├── syncType        (enum: STUDENTS, ATTENDANCE, TIMETABLE, YEAR_GROUPS, FULL)
├── status          (enum: STARTED, SUCCESS, PARTIAL, FAILED)
├── recordsProcessed (integer)
├── recordsCreated  (integer)
├── recordsUpdated  (integer)
├── recordsSkipped  (integer)
├── errors          (JSON nullable)
├── startedAt
├── completedAt
├── durationMs      (integer)

TimetableEntry
├── id              (CUID)
├── schoolId        → School
├── childId         → Child
├── dayOfWeek       (enum: MONDAY–FRIDAY)
├── periodNumber    (integer)
├── periodName      (String nullable)
├── subject         (String)
├── teacher         (String nullable)
├── room            (String nullable)
├── startTime       (String — "09:00")
├── endTime         (String — "09:50")
├── termStart       (@db.Date)
├── termEnd         (@db.Date)
└── unique [childId, dayOfWeek, periodNumber, termStart]
```

#### Sync Strategy

One-way: MIS → SchoolConnect. Never write back.

| Data | Conflict Resolution |
|------|---------------------|
| Students | Match by name + DOB. Existing manual children preserved, flagged for merge. |
| Attendance | MIS wins. Parent-reported absences kept as supplementary. |
| Timetable | Full replace per term. |
| Year Groups | Upsert by name, never delete. |

#### Security

- Credentials encrypted at rest (AES-256, key from env var).
- Never exposed in API responses.
- Sync runs as background job with error boundary.

#### Performance

- Background cron, never blocks request/response.
- Batch queries for diffing (not N+1).
- Typical sync: < 5 seconds for 1500 students.
- Daily attendance: only today's records (no backfill).
- MisSyncLog pruned after 90 days.

---

### 3C.2 Homework Tracker

**Purpose:** Teachers set homework with due dates. Parents see what's due and when. Visibility tool, not a learning management system.

#### Data Model

```
HomeworkAssignment
├── id              (CUID)
├── schoolId        → School
├── setBy           → User
├── subject         (String)
├── title           (String, max 200 chars)
├── description     (text nullable, max 1000 chars)
├── yearGroup       (String)
├── className       (String nullable — "10A", "7Set2")
├── setDate         (@db.Date)
├── dueDate         (@db.Date)
├── attachmentUrls  (String[], max 3)
├── isReadingTask   (boolean, default false — links to reading diary)
├── status          (enum: ACTIVE, CANCELLED)
├── createdAt
├── updatedAt

HomeworkCompletion
├── id              (CUID)
├── assignmentId    → HomeworkAssignment
├── childId         → Child
├── status          (enum: NOT_STARTED, IN_PROGRESS, COMPLETED)
├── completedAt     (nullable)
├── markedBy        (enum nullable: PARENT, STUDENT, TEACHER)
├── grade           (String nullable — flexible: "A+", "7/10", "Merit")
├── feedback        (text nullable, max 500 chars)
├── gradedBy        → User (nullable)
├── gradedAt        (nullable)
├── createdAt
├── updatedAt
└── unique [assignmentId, childId]
```

New field on `Child`:
```
Child (add)
├── className       (String nullable — "10A", populated by MIS sync or manual)
```

#### Targeting

- Year group (required) + optional class name.
- Matching: `Child.yearGroup` + `Child.className` if set.

#### Grading

- Grade field is free-text String (max 10 chars) — covers A-F, 1-9, percentages, stars, merit/distinction.
- Bulk grading mode: table view with inline grade + feedback per child.
- Push notification to parent when graded.
- Grades visible only to that child's parents.

#### Notifications

- New homework → push to parents in year group/class.
- "Due tomorrow" → 4pm reminder (configurable).
- Overdue → nudge next morning.
- Graded → push to parent.

#### Performance

- Indexed on `[schoolId, yearGroup, dueDate]`.
- ~5-15 assignments/week/year group — trivial.
- "Due tomorrow" cron: daily at 4pm.

---

### 3C.3 Reading Diary

**Purpose:** Digital replacement for the physical reading record book. Parents log reading, teachers review and respond. Essential for primary KS1/KS2.

#### Data Model

```
ReadingDiary
├── id              (CUID)
├── childId         → Child (unique)
├── schoolId        → School
├── currentBook     (String nullable)
├── readingLevel    (String nullable — "Orange Band", "Stage 5", "Free Reader")
├── targetMinsPerDay (integer nullable)
├── createdAt
├── updatedAt

ReadingEntry
├── id              (CUID)
├── diaryId         → ReadingDiary
├── date            (@db.Date)
├── bookTitle       (String, max 200 chars)
├── pagesOrChapter  (String nullable — "Pages 12-25", "Chapter 3")
├── minutesRead     (integer nullable)
├── parentComment   (text nullable, max 500 chars)
├── teacherComment  (text nullable, max 500 chars)
├── readWith        (enum: ALONE, PARENT, TEACHER, SIBLING, OTHER)
├── entryBy         (enum: PARENT, TEACHER)
├── createdAt
├── updatedAt
└── index on [diaryId, date]
```

#### User Flows

- **Parents:** "Log Reading" button — date, book (defaults current), pages, minutes, who they read with, comment. < 30 seconds. Weekly calendar dots. Streak counter.
- **Teachers:** Class overview: children with last entry date + weekly count. Colour coding (green/amber/red). Add comments to entries. Add standalone entries. Update reading level + current book + target. "Who hasn't read this week?" filter.

#### Homework Integration

When `homeworkEnabled` is also active and `isReadingTask = true` on an assignment, a ReadingEntry logged on/before the due date auto-marks HomeworkCompletion as COMPLETED.

#### Notifications

- Opt-in evening nudge (7pm): "Has [Child] read today?"
- Teacher comment → push to parent.
- Weekly Friday summary: "[Child] read 4 out of 5 days this week."

#### Stats (per child, no AI)

- Total entries this term.
- Average minutes per session.
- Days read this week/month.
- Books completed.
- Current streak.

#### Performance

- Single INSERT per entry.
- Class overview: indexed query grouped by child — one query.
- Stats: COUNT/AVG with date range, cached client-side.

---

### 3C.4 Visitor & Volunteer Management

**Purpose:** Digital sign-in replacing paper visitor books. DBS tracking for volunteers. Ofsted-compliant safeguarding record.

#### Data Model

```
Visitor
├── id              (CUID)
├── schoolId        → School
├── name            (String)
├── organisation    (String nullable)
├── phone           (String nullable)
├── email           (String nullable)
├── isRegular       (boolean)
├── dbsNumber       (String nullable)
├── dbsExpiryDate   (@db.Date nullable)
├── dbsVerifiedBy   → User (nullable)
├── photoUrl        (String nullable)
├── createdAt
├── updatedAt
└── index [schoolId, name]

VisitorLog
├── id              (CUID)
├── schoolId        → School
├── visitorId       → Visitor
├── purpose         (enum: MEETING, MAINTENANCE, DELIVERY, VOLUNTEERING,
│                     INSPECTION, PARENT_VISIT, CONTRACTOR, OTHER)
├── visitingStaff   (String nullable)
├── badgeNumber     (String nullable)
├── signInAt        (DateTime)
├── signOutAt       (DateTime nullable)
├── signedInBy      → User
├── signedOutBy     → User (nullable)
├── notes           (text nullable, max 300 chars)
├── createdAt

VolunteerDbs
├── id              (CUID)
├── schoolId        → School
├── userId          → User (nullable)
├── visitorId       → Visitor (nullable)
├── name            (String)
├── dbsNumber       (String)
├── dbsType         (enum: BASIC, STANDARD, ENHANCED, ENHANCED_BARRED)
├── issueDate       (@db.Date)
├── expiryDate      (@db.Date nullable)
├── verifiedBy      → User
├── verifiedAt      (DateTime)
├── status          (enum: VALID, EXPIRING_SOON, EXPIRED, REVOKED)
├── createdAt
├── updatedAt
```

#### User Flows

- **Sign-in:** Type name → autocomplete from previous visitors. New: enter details + purpose. Regulars: pre-populated. DBS warning if volunteering without valid DBS. Issue badge → Sign In.
- **Sign-out:** "Currently on site" list. Tap → Sign Out. End-of-day warning at 5pm.
- **DBS management:** Register tab with colour-coded status. Add/update DBS. Dashboard alert for expiring checks.
- **Admin reporting:** Searchable visitor log. CSV export (Ofsted). "People on Site" count in emergencies.

#### Fire Register Integration

When `emergencyCommsEnabled` active: emergency dashboard shows signed-in visitor count + printable list with badge numbers.

#### Safeguarding Rules

| Rule | Trigger | Action |
|------|---------|--------|
| No DBS for volunteer | Purpose = VOLUNTEERING, no valid DBS | Amber warning, staff acknowledge |
| Expired DBS | Expiry passed | Cannot sign in as volunteer |
| Unsigned visitor | Still in after 8 hours | Auto-notify office staff |
| Expiring DBS | Within 60 days | Weekly digest to admin |

#### Performance

- Autocomplete: indexed `[schoolId, name]`, small dataset.
- "On site": `WHERE signOutAt IS NULL` — tiny result set.
- DBS cron: daily date comparison.
- Visitor log: cursor-paginated, indexed `[schoolId, signInAt DESC]`.

---

## New Models Summary

| Phase | New Models | Count |
|-------|-----------|-------|
| 3A | WellbeingCheckIn, WellbeingAlert, EmergencyAlert, EmergencyUpdate, AnalyticsSnapshot | 5 |
| 3B | MealMenu, MealOption, MealBooking, DietaryProfile, ReportCycle, ReportCard, SubjectGrade, CommunityPost, CommunityComment, VolunteerSlot, VolunteerSignup | 11 |
| 3C | MisConnection, MisSyncLog, TimetableEntry, HomeworkAssignment, HomeworkCompletion, ReadingDiary, ReadingEntry, Visitor, VisitorLog, VolunteerDbs | 10 |
| **Total** | | **26 new models** |

Modified existing models:
- `School`: 5 branding fields + 7 feature toggle fields + 1 communityTags field
- `Child`: 1 className field

---

## Performance Principles

1. **No AI, no external APIs at runtime** (except MIS sync which is background).
2. **Cron for heavy work**: analytics snapshots, wellbeing alerts, MIS sync, DBS expiry checks — all background.
3. **Redis caching**: summary cards (5-min TTL), published reports (1-hour TTL), analytics (5-min TTL).
4. **Compound indexes**: `[schoolId, date]` pattern on all date-queryable tables.
5. **Cursor-based pagination**: all list endpoints.
6. **Existing infrastructure**: push notifications, SMS, email, Stripe — no new external services except `@react-pdf/renderer`.

---

## Build Order

| Order | Feature | Rationale |
|-------|---------|-----------|
| 1 | Admin Analytics | Uses existing data, no new writes, quick win |
| 2 | Wellbeing Check-ins | Simple CRUD + cron, high differentiator |
| 3 | Emergency Comms | Leverages existing notification infra |
| 4 | Meal Booking | Links to existing payments |
| 5 | Community Hub | Standalone, no dependencies |
| 6 | Digital Report Cards + PDF | More complex, needs branding system first |
| 7 | Homework Tracker + Grading | Standalone with className addition |
| 8 | Reading Diary | Builds on homework, simple addition |
| 9 | Visitor Management | Standalone, DBS tracking |
| 10 | MIS Integration (CSV first) | Most complex, benefits from stable schema |
