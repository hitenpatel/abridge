# Phase 3C Implementation Plan: Operational Efficiency

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Homework Tracker (with grading), Reading Diary, Visitor & Volunteer Management, and MIS Integration Layer to SchoolConnect.

**Architecture:** Four feature modules. Homework and Reading Diary are standalone CRUD with push notification hooks. Visitor Management is office-staff focused with DBS tracking and fire register integration. MIS Integration uses an adapter pattern for one-way sync from external school systems, starting with CSV upload as the first adapter.

**Tech Stack:** Prisma (schema), tRPC (routers), Zod (validation), Next.js App Router (pages), Tailwind + shadcn/ui (UI), Vitest (API tests), Playwright (E2E).

**Build Order:** Homework Tracker → Reading Diary → Visitor Management → MIS Integration (simplest first, MIS complexity last).

**Prerequisites:** Phase 3A completed (feature toggle pattern established). `className` field on `Child` model added in this phase for homework targeting.

---

## Task 1: Schema — Feature Toggles + Child className

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add feature toggles to School model**

```prisma
  // Phase 3C feature toggles
  homeworkEnabled            Boolean  @default(false)
  readingDiaryEnabled        Boolean  @default(false)
  visitorManagementEnabled   Boolean  @default(false)
  misIntegrationEnabled      Boolean  @default(false)
```

**Step 2: Add className to Child model**

Check if `className` already exists on `Child`. If not, add:

```prisma
  className     String?
```

**Step 3: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add Phase 3C feature toggles and className to Child"
```

---

## Task 2: Schema — Homework Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum HomeworkStatus {
  ACTIVE
  CANCELLED
}

enum HomeworkCompletionStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum HomeworkMarkedBy {
  PARENT
  STUDENT
  TEACHER
}
```

**Step 2: Add HomeworkAssignment model**

```prisma
model HomeworkAssignment {
  id             String           @id @default(cuid())
  schoolId       String
  school         School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  setBy          String
  teacher        User             @relation("HomeworkSetBy", fields: [setBy], references: [id])
  subject        String
  title          String
  description    String?
  yearGroup      String
  className      String?
  setDate        DateTime         @db.Date
  dueDate        DateTime         @db.Date
  attachmentUrls String[]
  isReadingTask  Boolean          @default(false)
  status         HomeworkStatus   @default(ACTIVE)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  completions    HomeworkCompletion[]

  @@index([schoolId, yearGroup, dueDate])
  @@index([schoolId, status])
  @@map("homework_assignment")
}
```

**Step 3: Add HomeworkCompletion model**

```prisma
model HomeworkCompletion {
  id           String                     @id @default(cuid())
  assignmentId String
  assignment   HomeworkAssignment         @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  childId      String
  child        Child                      @relation(fields: [childId], references: [id], onDelete: Cascade)
  status       HomeworkCompletionStatus   @default(NOT_STARTED)
  completedAt  DateTime?
  markedBy     HomeworkMarkedBy?
  grade        String?
  feedback     String?
  gradedBy     String?
  grader       User?                      @relation("HomeworkGradedBy", fields: [gradedBy], references: [id])
  gradedAt     DateTime?
  createdAt    DateTime                   @default(now())
  updatedAt    DateTime                   @updatedAt

  @@unique([assignmentId, childId])
  @@index([childId, assignmentId])
  @@map("homework_completion")
}
```

**Step 4: Add relations to School, Child, and User**

In `School`:
```prisma
  homeworkAssignments HomeworkAssignment[]
```

In `Child`:
```prisma
  homeworkCompletions HomeworkCompletion[]
```

In `User`:
```prisma
  homeworkSet     HomeworkAssignment[]  @relation("HomeworkSetBy")
  homeworkGraded  HomeworkCompletion[]  @relation("HomeworkGradedBy")
```

**Step 5: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add HomeworkAssignment and HomeworkCompletion models"
```

---

## Task 3: Schema — Reading Diary Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum ReadWith {
  ALONE
  PARENT
  TEACHER
  SIBLING
  OTHER
}

enum ReadingEntryBy {
  PARENT
  TEACHER
}
```

**Step 2: Add ReadingDiary model**

```prisma
model ReadingDiary {
  id              String         @id @default(cuid())
  childId         String         @unique
  child           Child          @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId        String
  school          School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  currentBook     String?
  readingLevel    String?
  targetMinsPerDay Int?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  entries         ReadingEntry[]

  @@index([schoolId])
  @@map("reading_diary")
}
```

**Step 3: Add ReadingEntry model**

```prisma
model ReadingEntry {
  id             String         @id @default(cuid())
  diaryId        String
  diary          ReadingDiary   @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  date           DateTime       @db.Date
  bookTitle      String
  pagesOrChapter String?
  minutesRead    Int?
  parentComment  String?
  teacherComment String?
  readWith       ReadWith
  entryBy        ReadingEntryBy
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([diaryId, date])
  @@map("reading_entry")
}
```

**Step 4: Add relations to School and Child**

In `School`:
```prisma
  readingDiaries ReadingDiary[]
```

In `Child`:
```prisma
  readingDiary ReadingDiary?
```

**Step 5: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add ReadingDiary and ReadingEntry models"
```

---

## Task 4: Schema — Visitor Management Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum VisitPurpose {
  MEETING
  MAINTENANCE
  DELIVERY
  VOLUNTEERING
  INSPECTION
  PARENT_VISIT
  CONTRACTOR
  OTHER
}

enum DbsType {
  BASIC
  STANDARD
  ENHANCED
  ENHANCED_BARRED
}

enum DbsStatus {
  VALID
  EXPIRING_SOON
  EXPIRED
  REVOKED
}
```

**Step 2: Add Visitor model**

```prisma
model Visitor {
  id            String    @id @default(cuid())
  schoolId      String
  school        School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name          String
  organisation  String?
  phone         String?
  email         String?
  isRegular     Boolean   @default(false)
  dbsNumber     String?
  dbsExpiryDate DateTime? @db.Date
  dbsVerifiedBy String?
  verifier      User?     @relation("VisitorDbsVerifier", fields: [dbsVerifiedBy], references: [id])
  photoUrl      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  logs          VisitorLog[]

  @@index([schoolId, name])
  @@map("visitor")
}
```

**Step 3: Add VisitorLog model**

```prisma
model VisitorLog {
  id           String       @id @default(cuid())
  schoolId     String
  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  visitorId    String
  visitor      Visitor      @relation(fields: [visitorId], references: [id], onDelete: Cascade)
  purpose      VisitPurpose
  visitingStaff String?
  badgeNumber  String?
  signInAt     DateTime
  signOutAt    DateTime?
  signedInBy   String
  signInUser   User         @relation("VisitorSignIn", fields: [signedInBy], references: [id])
  signedOutBy  String?
  signOutUser  User?        @relation("VisitorSignOut", fields: [signedOutBy], references: [id])
  notes        String?
  createdAt    DateTime     @default(now())

  @@index([schoolId, signInAt(sort: Desc)])
  @@index([schoolId, signOutAt])
  @@map("visitor_log")
}
```

**Step 4: Add VolunteerDbs model**

```prisma
model VolunteerDbs {
  id          String    @id @default(cuid())
  schoolId    String
  school      School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  userId      String?
  user        User?     @relation("VolunteerDbsUser", fields: [userId], references: [id])
  visitorId   String?
  visitor     Visitor?  @relation(fields: [visitorId], references: [id])
  name        String
  dbsNumber   String
  dbsType     DbsType
  issueDate   DateTime  @db.Date
  expiryDate  DateTime? @db.Date
  verifiedBy  String
  verifier    User      @relation("VolunteerDbsVerifier", fields: [verifiedBy], references: [id])
  verifiedAt  DateTime
  status      DbsStatus @default(VALID)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([schoolId, status])
  @@map("volunteer_dbs")
}
```

**Step 5: Add relations to School, User, and Visitor**

In `School`:
```prisma
  visitors      Visitor[]
  visitorLogs   VisitorLog[]
  volunteerDbs  VolunteerDbs[]
```

In `User`:
```prisma
  visitorDbsVerified   Visitor[]      @relation("VisitorDbsVerifier")
  visitorSignIns       VisitorLog[]   @relation("VisitorSignIn")
  visitorSignOuts      VisitorLog[]   @relation("VisitorSignOut")
  volunteerDbsRecords  VolunteerDbs[] @relation("VolunteerDbsUser")
  volunteerDbsVerified VolunteerDbs[] @relation("VolunteerDbsVerifier")
```

In `Visitor`:
```prisma
  volunteerDbs VolunteerDbs[]
```

**Step 6: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add Visitor, VisitorLog, VolunteerDbs models"
```

---

## Task 5: Schema — MIS Integration Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum MisProvider {
  SIMS
  ARBOR
  BROMCOM
  SCHOLARPACK
  CSV_MANUAL
}

enum MisConnectionStatus {
  CONNECTED
  DISCONNECTED
  ERROR
}

enum MisSyncFrequency {
  HOURLY
  TWICE_DAILY
  DAILY
  MANUAL
}

enum MisSyncStatus {
  STARTED
  SUCCESS
  PARTIAL
  FAILED
}

enum MisSyncType {
  STUDENTS
  ATTENDANCE
  TIMETABLE
  YEAR_GROUPS
  FULL
}
```

**Step 2: Add MisConnection model**

```prisma
model MisConnection {
  id             String              @id @default(cuid())
  schoolId       String              @unique
  school         School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  provider       MisProvider
  apiUrl         String?
  credentials    String
  status         MisConnectionStatus @default(DISCONNECTED)
  lastSyncAt     DateTime?
  lastSyncStatus MisSyncStatus?
  lastSyncError  String?
  syncFrequency  MisSyncFrequency    @default(DAILY)
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  syncLogs       MisSyncLog[]

  @@map("mis_connection")
}
```

**Step 3: Add MisSyncLog model**

```prisma
model MisSyncLog {
  id               String        @id @default(cuid())
  connectionId     String
  connection       MisConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  syncType         MisSyncType
  status           MisSyncStatus @default(STARTED)
  recordsProcessed Int           @default(0)
  recordsCreated   Int           @default(0)
  recordsUpdated   Int           @default(0)
  recordsSkipped   Int           @default(0)
  errors           Json?
  startedAt        DateTime      @default(now())
  completedAt      DateTime?
  durationMs       Int?

  @@index([connectionId, startedAt(sort: Desc)])
  @@map("mis_sync_log")
}
```

**Step 4: Add TimetableEntry model**

```prisma
model TimetableEntry {
  id           String    @id @default(cuid())
  schoolId     String
  school       School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  childId      String
  child        Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  dayOfWeek    DayOfWeek
  periodNumber Int
  periodName   String?
  subject      String
  teacher      String?
  room         String?
  startTime    String
  endTime      String
  termStart    DateTime  @db.Date
  termEnd      DateTime  @db.Date

  @@unique([childId, dayOfWeek, periodNumber, termStart])
  @@index([schoolId, childId])
  @@map("timetable_entry")
}
```

Note: `DayOfWeek` enum was already added in Phase 3B (Task 2). If not, add it here.

**Step 5: Add relations**

In `School`:
```prisma
  misConnection    MisConnection?
  timetableEntries TimetableEntry[]
```

In `Child`:
```prisma
  timetableEntries TimetableEntry[]
```

**Step 6: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add MisConnection, MisSyncLog, TimetableEntry models"
```

---

## Task 6: Update Feature Guards + Web Toggles

**Files:**
- Modify: `apps/api/src/lib/feature-guards.ts`
- Modify: `apps/api/src/trpc.ts`
- Modify: `apps/web/src/lib/feature-toggles.tsx`

**Step 1: Add to feature-guards.ts**

```typescript
// Add to FeatureName type
| "homework"
| "readingDiary"
| "visitorManagement"
| "misIntegration"

// Add to SchoolFeatures interface
homeworkEnabled: boolean;
readingDiaryEnabled: boolean;
visitorManagementEnabled: boolean;
misIntegrationEnabled: boolean;

// Add to featureFieldMap
homework: "homeworkEnabled",
readingDiary: "readingDiaryEnabled",
visitorManagement: "visitorManagementEnabled",
misIntegration: "misIntegrationEnabled",

// Add to featureLabel
homework: "Homework Tracker",
readingDiary: "Reading Diary",
visitorManagement: "Visitor Management",
misIntegration: "MIS Integration",
```

**Step 2: Update trpc.ts select**

```typescript
homeworkEnabled: true,
readingDiaryEnabled: true,
visitorManagementEnabled: true,
misIntegrationEnabled: true,
```

**Step 3: Update feature-toggles.tsx**

```typescript
// Add to interface + defaults
homeworkEnabled: false,
readingDiaryEnabled: false,
visitorManagementEnabled: false,
misIntegrationEnabled: false,
```

**Step 4: Commit**

```bash
git add apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts apps/web/src/lib/feature-toggles.tsx
git commit -m "feat: add Phase 3C feature guards for homework, reading diary, visitors, MIS"
```

---

## Task 7: Homework Router + Tests

**Files:**
- Create: `apps/api/src/router/homework.ts`
- Create: `apps/api/src/__tests__/homework.test.ts`

**Step 1: Write failing tests**

Create `apps/api/src/__tests__/homework.test.ts` with tests for:
- `setHomework` — creates assignment with subject, year group, due date
- `listHomeworkForChild` — returns assignments matching child's year group
- `markComplete` — parent marks homework as completed
- `gradeHomework` — teacher adds grade + feedback
- `cancelHomework` — teacher cancels an assignment

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/homework.test.ts`

**Step 3: Write the homework router**

Create `apps/api/src/router/homework.ts`:

Key procedures:
- `setHomework` — `schoolFeatureProcedure`, creates HomeworkAssignment with subject, title, description, yearGroup, optional className, setDate, dueDate, attachments, isReadingTask flag
- `listForChild` — `protectedProcedure`, queries assignments matching child's yearGroup + className, ordered by dueDate, includes completion status for the child
- `listForTeacher` — `schoolFeatureProcedure`, lists assignments set by this teacher with completion counts
- `markComplete` — `protectedProcedure`, parent/student upserts HomeworkCompletion with status COMPLETED
- `markInProgress` — `protectedProcedure`, upserts with status IN_PROGRESS
- `gradeHomework` — `schoolFeatureProcedure`, teacher updates HomeworkCompletion with grade (String, max 10), feedback (max 500), gradedBy, gradedAt
- `bulkGrade` — `schoolFeatureProcedure`, batch update grades for multiple children on one assignment
- `cancelHomework` — `schoolFeatureProcedure`, sets assignment status to CANCELLED

**Step 4: Register in router index**

**Step 5: Run tests, verify pass**

**Step 6: Commit**

```bash
git add apps/api/src/router/homework.ts apps/api/src/__tests__/homework.test.ts apps/api/src/router/index.ts
git commit -m "feat: add homework router with assignment CRUD, completion tracking, and grading"
```

---

## Task 8: Homework Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/homework/page.tsx`

**Step 1: Create the homework page**

**Parent view:**
- Child selector (multi-child)
- "Upcoming Homework" list sorted by due date
- Colour coding: green (completed), amber (due within 2 days), red (overdue), grey (future)
- Each item: subject badge, title, due date, status
- Click item → detail view: description, attachments, "Mark as Done" button
- If graded: grade badge + teacher feedback shown
- Filter by subject

**Staff view:**
- "Set Homework" form: subject, title, description, year group, optional class, due date, optional attachments, isReadingTask checkbox
- "My Assignments" list: assignments set by this teacher
- Click assignment → completion overview: table of children with status + grade columns
- Bulk grading mode: inline grade + feedback input per child, "Save All" button
- "Cancel" button with confirmation

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/homework/page.tsx
git commit -m "feat: add homework page with parent tracking and staff grading"
```

---

## Task 9: Reading Diary Router + Tests

**Files:**
- Create: `apps/api/src/router/reading-diary.ts`
- Create: `apps/api/src/__tests__/reading-diary.test.ts`

**Step 1: Write failing tests**

Tests for:
- `logReading` — parent creates a reading entry with book, minutes, readWith, comment
- `getEntries` — returns entries for a child in date range
- `addTeacherComment` — teacher adds comment to existing entry
- `createTeacherEntry` — teacher logs a reading session for a child
- `updateDiary` — teacher updates currentBook, readingLevel, targetMinsPerDay
- `getClassOverview` — teacher sees all children with entry counts this week
- `getStats` — returns reading stats for a child (total entries, avg minutes, streak)

**Step 2: Write the reading diary router**

Create `apps/api/src/router/reading-diary.ts`:

Key procedures:
- `logReading` — `protectedProcedure`, parent creates ReadingEntry. Auto-creates ReadingDiary if not exists. If `homeworkEnabled` and a matching `isReadingTask` assignment exists for today, auto-marks HomeworkCompletion as COMPLETED.
- `getEntries` — `protectedProcedure`, returns entries for child in date range
- `addTeacherComment` — `schoolFeatureProcedure`, updates teacherComment on existing entry
- `createTeacherEntry` — `schoolFeatureProcedure`, teacher logs entry with entryBy: TEACHER
- `updateDiary` — `schoolFeatureProcedure`, teacher updates currentBook, readingLevel, targetMinsPerDay
- `getDiary` — `protectedProcedure`, returns diary with current book and reading level
- `getClassOverview` — `schoolFeatureProcedure`, for each child in school: last entry date, entries this week, reading level. Colour coding: green (on track), amber (1-2 days behind), red (no entries this week)
- `getStats` — `protectedProcedure`, returns: total entries this term, avg minutes, days read this week/month, books completed, current streak (consecutive days with entry)

**Step 3: Register, run tests, commit**

```bash
git add apps/api/src/router/reading-diary.ts apps/api/src/__tests__/reading-diary.test.ts apps/api/src/router/index.ts
git commit -m "feat: add reading diary router with entries, teacher comments, class overview, stats"
```

---

## Task 10: Reading Diary Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/reading/page.tsx`

**Step 1: Create the reading diary page**

**Parent view:**
- Child selector
- Current book + reading level badge (set by teacher)
- "Log Reading" form: date (default today), book title (default current book), pages/chapter, minutes, readWith selector (emoji icons: 👤 Alone, 👨‍👩‍👧 Parent, 👩‍🏫 Teacher, 👧 Sibling), comment. Submit in < 30 seconds.
- Weekly calendar strip: dots showing which days child read (filled = entry, empty = no entry)
- Streak counter: "5 days in a row!" with fire icon
- Entry list: chronological, each showing date, book, minutes, mood emoji for readWith, parent comment, teacher comment (if any)
- Stats card: total entries, avg minutes, days this week

**Staff view:**
- Class overview table: child name, reading level, last entry date, entries this week, colour indicator
- "Who hasn't read this week?" filter button
- Click child → their diary: entry list + update reading level/current book/target form
- Add comment to any entry
- Add standalone entry (teacher reading session)

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/reading/page.tsx
git commit -m "feat: add reading diary page with parent logging and staff class overview"
```

---

## Task 11: Visitor Management Router + Tests

**Files:**
- Create: `apps/api/src/router/visitor.ts`
- Create: `apps/api/src/__tests__/visitor.test.ts`

**Step 1: Write failing tests**

Tests for:
- `signIn` — creates visitor log entry with sign-in time
- `signOut` — updates log with sign-out time
- `searchVisitors` — autocomplete search by name
- `getOnSite` — returns all currently signed-in visitors
- `addDbs` — creates/updates DBS record
- `getDsbRegister` — returns all DBS records with status colour coding
- `getVisitorHistory` — paginated visitor log

**Step 2: Write the visitor router**

Create `apps/api/src/router/visitor.ts`:

Key procedures:
- `signIn` — `schoolFeatureProcedure`, upserts Visitor (name, org, phone, email, isRegular), creates VisitorLog entry. If purpose=VOLUNTEERING and no valid DBS, returns `dbsWarning: true` (doesn't block, but flags).
- `signOut` — `schoolFeatureProcedure`, updates VisitorLog.signOutAt
- `searchVisitors` — `schoolFeatureProcedure`, search by name prefix, regulars first, limit 10
- `getOnSite` — `schoolFeatureProcedure`, `WHERE signOutAt IS NULL`, includes visitor details + duration
- `addOrUpdateDbs` — `schoolFeatureProcedure`, creates/updates VolunteerDbs record, auto-sets status based on expiryDate
- `getDbsRegister` — `schoolFeatureProcedure`, all DBS records with status. Auto-compute: VALID if expiry > 60 days, EXPIRING_SOON if < 60 days, EXPIRED if past
- `getVisitorHistory` — `schoolFeatureProcedure`, paginated, filterable by date range, name, purpose. CSV export support.
- `getFireRegister` — `schoolFeatureProcedure`, combines signed-in visitors + staff count for emergency use

**Step 3: Register, run tests, commit**

```bash
git add apps/api/src/router/visitor.ts apps/api/src/__tests__/visitor.test.ts apps/api/src/router/index.ts
git commit -m "feat: add visitor management router with sign-in/out, DBS tracking, fire register"
```

---

## Task 12: Visitor Management Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/visitors/page.tsx`

**Step 1: Create the visitor management page**

Staff-only page with tabs:

**"Sign In" tab:**
- Visitor name input with autocomplete dropdown (regulars first)
- If new visitor: expand to show organisation, phone, email fields
- Purpose dropdown: Meeting, Maintenance, Delivery, Volunteering, Inspection, Parent Visit, Contractor, Other
- "Visiting" text input (who they're here to see)
- Badge number input
- DBS warning banner: if purpose=Volunteering and no valid DBS, show amber warning with "Acknowledge" checkbox
- "Sign In" button

**"On Site" tab:**
- List of currently signed-in visitors with: name, purpose, badge, sign-in time, duration
- "Sign Out" button per visitor
- End-of-day summary: count of visitors still signed in
- Emergency mode: if `emergencyCommsEnabled`, show "People on Site: X" prominently

**"DBS Register" tab:**
- Table: name, DBS number, type, issue date, expiry, status badge (green/amber/red)
- "Add DBS" button → form with fields
- Filter: Valid / Expiring Soon / Expired

**"History" tab:**
- Searchable visitor log: date range, name, purpose filters
- Paginated table: date, visitor name, purpose, sign-in, sign-out, duration
- "Export CSV" button

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/visitors/page.tsx
git commit -m "feat: add visitor management page with sign-in, DBS register, and history"
```

---

## Task 13: MIS Integration — Adapter Interface + CSV Adapter

**Files:**
- Create: `apps/api/src/lib/mis/types.ts`
- Create: `apps/api/src/lib/mis/csv-adapter.ts`

**Step 1: Define adapter interface**

Create `apps/api/src/lib/mis/types.ts`:

```typescript
export interface MisSyncResult<T> {
  records: T[];
  errors: Array<{ row: number; field: string; message: string }>;
}

export interface MisStudentRecord {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  yearGroup: string;
  className?: string;
}

export interface MisAttendanceRecord {
  studentFirstName: string;
  studentLastName: string;
  studentDob: Date;
  date: Date;
  session: "AM" | "PM";
  mark: "PRESENT" | "ABSENT_AUTH" | "ABSENT_UNAUTH" | "LATE" | "NOT_REQUIRED";
}

export interface MisProvider {
  syncStudents(data: string | Buffer): Promise<MisSyncResult<MisStudentRecord>>;
  syncAttendance(data: string | Buffer): Promise<MisSyncResult<MisAttendanceRecord>>;
  testConnection(): Promise<boolean>;
}
```

**Step 2: Create CSV adapter**

Create `apps/api/src/lib/mis/csv-adapter.ts`:

```typescript
import type { MisAttendanceRecord, MisProvider, MisStudentRecord, MisSyncResult } from "./types";

export class CsvAdapter implements MisProvider {
  async syncStudents(csvData: string | Buffer): Promise<MisSyncResult<MisStudentRecord>> {
    const text = typeof csvData === "string" ? csvData : csvData.toString("utf-8");
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const records: MisStudentRecord[] = [];
    const errors: Array<{ row: number; field: string; message: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

      if (!row["first_name"] || !row["last_name"] || !row["date_of_birth"] || !row["year_group"]) {
        errors.push({ row: i + 1, field: "required", message: "Missing required fields" });
        continue;
      }

      const dob = new Date(row["date_of_birth"]);
      if (Number.isNaN(dob.getTime())) {
        errors.push({ row: i + 1, field: "date_of_birth", message: "Invalid date" });
        continue;
      }

      records.push({
        firstName: row["first_name"],
        lastName: row["last_name"],
        dateOfBirth: dob,
        yearGroup: row["year_group"],
        className: row["class_name"] || undefined,
      });
    }

    return { records, errors };
  }

  async syncAttendance(csvData: string | Buffer): Promise<MisSyncResult<MisAttendanceRecord>> {
    const text = typeof csvData === "string" ? csvData : csvData.toString("utf-8");
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const records: MisAttendanceRecord[] = [];
    const errors: Array<{ row: number; field: string; message: string }> = [];

    const validMarks = ["PRESENT", "ABSENT_AUTH", "ABSENT_UNAUTH", "LATE", "NOT_REQUIRED"];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

      const date = new Date(row["date"]);
      if (Number.isNaN(date.getTime())) {
        errors.push({ row: i + 1, field: "date", message: "Invalid date" });
        continue;
      }

      const session = row["session"]?.toUpperCase();
      if (session !== "AM" && session !== "PM") {
        errors.push({ row: i + 1, field: "session", message: "Must be AM or PM" });
        continue;
      }

      const mark = row["mark"]?.toUpperCase();
      if (!validMarks.includes(mark)) {
        errors.push({ row: i + 1, field: "mark", message: `Invalid mark: ${mark}` });
        continue;
      }

      records.push({
        studentFirstName: row["first_name"],
        studentLastName: row["last_name"],
        studentDob: new Date(row["date_of_birth"]),
        date,
        session: session as "AM" | "PM",
        mark: mark as MisAttendanceRecord["mark"],
      });
    }

    return { records, errors };
  }

  async testConnection(): Promise<boolean> {
    return true; // CSV is always "connected"
  }
}
```

**Step 3: Commit**

```bash
git add apps/api/src/lib/mis/types.ts apps/api/src/lib/mis/csv-adapter.ts
git commit -m "feat: add MIS adapter interface and CSV adapter implementation"
```

---

## Task 14: MIS Integration Router + Tests

**Files:**
- Create: `apps/api/src/router/mis.ts`
- Create: `apps/api/src/__tests__/mis.test.ts`

**Step 1: Write failing tests**

Tests for:
- `setupConnection` — creates MIS connection for school
- `testConnection` — validates connection works
- `uploadCsv` — processes CSV file and syncs students
- `getSyncHistory` — returns sync logs
- `getConnectionStatus` — returns current connection status

**Step 2: Write the MIS router**

Key procedures:
- `setupConnection` — `schoolAdminProcedure`, creates MisConnection with provider, credentials (encrypted), sync frequency
- `testConnection` — `schoolFeatureProcedure`, instantiates adapter, calls testConnection()
- `uploadStudentsCsv` — `schoolFeatureProcedure`, accepts CSV string, runs through CsvAdapter.syncStudents(), matches by name+DOB, upserts Child records, logs to MisSyncLog
- `uploadAttendanceCsv` — `schoolFeatureProcedure`, same pattern for attendance
- `getConnectionStatus` — `schoolFeatureProcedure`, returns connection status, last sync time, next scheduled
- `getSyncHistory` — `schoolFeatureProcedure`, paginated MisSyncLog
- `disconnect` — `schoolAdminProcedure`, sets status to DISCONNECTED (keeps data)

**Step 3: Register, run tests, commit**

```bash
git add apps/api/src/router/mis.ts apps/api/src/__tests__/mis.test.ts apps/api/src/router/index.ts
git commit -m "feat: add MIS integration router with CSV upload, sync logging, connection management"
```

---

## Task 15: MIS Integration Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/mis/page.tsx`

**Step 1: Create the MIS page**

Admin-only page:

**Connection setup:**
- Provider dropdown: SIMS, Arbor, Bromcom, ScholarPack, CSV Manual
- If API-based: URL + credentials fields (hidden/encrypted display)
- "Test Connection" button with result indicator
- Sync frequency selector: Hourly, Twice Daily, Daily, Manual
- "Save" button

**CSV upload (when provider = CSV_MANUAL):**
- "Upload Students CSV" with drag-and-drop file area
- CSV template download link
- "Upload Attendance CSV" with same pattern
- Upload progress + result: X created, Y updated, Z skipped, N errors
- Error table showing row-level issues

**Status dashboard:**
- Connection status card: Connected/Disconnected/Error with last sync time
- "Sync Now" button for manual trigger
- Sync history table: type, status, records processed, duration, timestamp

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/mis/page.tsx
git commit -m "feat: add MIS integration page with CSV upload and sync dashboard"
```

---

## Task 16: Add Nav Links for Phase 3C Pages

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx`

**Step 1: Add navigation items**

For **parent** navigation (conditional on toggles):
```typescript
{ name: "Homework", href: "/dashboard/homework", icon: BookOpen },
{ name: "Reading", href: "/dashboard/reading", icon: BookOpenCheck },
```

For **staff** navigation:
```typescript
{ name: "Homework", href: "/dashboard/homework", icon: BookOpen },
{ name: "Reading", href: "/dashboard/reading", icon: BookOpenCheck },
{ name: "Visitors", href: "/dashboard/visitors", icon: UserCheck },
```

For **admin** navigation:
```typescript
{ name: "MIS", href: "/dashboard/mis", icon: Database },
```

Import from `lucide-react`: `BookOpen`, `BookOpenCheck`, `UserCheck`, `Database`.

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: add nav links for homework, reading, visitors, and MIS pages"
```

---

## Task 17: Update Admin Settings + Seed Data

**Files:**
- Modify: `apps/web/src/app/dashboard/admin/page.tsx`
- Modify: `packages/db/prisma/seed.ts`

**Step 1: Add Phase 3C toggle controls to admin**

Toggle switches for: `homeworkEnabled`, `readingDiaryEnabled`, `visitorManagementEnabled`, `misIntegrationEnabled`.

**Step 2: Add seed data**

```typescript
// Enable features
homeworkEnabled: true,
readingDiaryEnabled: true,
visitorManagementEnabled: true,
misIntegrationEnabled: false, // Requires explicit setup

// Homework
const hwAssignment = await prisma.homeworkAssignment.create({
  data: {
    schoolId: school.id,
    setBy: teacherUser.id,
    subject: "Mathematics",
    title: "Chapter 5 Practice Questions",
    description: "Complete questions 1-10 on page 45.",
    yearGroup: "4",
    setDate: new Date(),
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
});

// Reading diary
await prisma.readingDiary.upsert({
  where: { childId: child.id },
  update: {},
  create: {
    childId: child.id,
    schoolId: school.id,
    currentBook: "Charlotte's Web",
    readingLevel: "Orange Band",
    targetMinsPerDay: 15,
  },
});

// Visitor
const visitor = await prisma.visitor.create({
  data: {
    schoolId: school.id,
    name: "John Smith",
    organisation: "ABC Plumbing",
    isRegular: true,
  },
});
```

**Step 3: Seed, commit**

```bash
git add apps/web/src/app/dashboard/admin/page.tsx packages/db/prisma/seed.ts
git commit -m "feat: add Phase 3C seed data and admin toggles"
```

---

## Task 18: Run Unit Tests + Lint + Build

**Step 1:** `cd apps/api && npx vitest run`
**Step 2:** `npx pnpm lint`
**Step 3:** `npx pnpm build`
**Step 4: Fix and commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from Phase 3C implementation"
```

---

## Task 19: E2E Seed Helpers for Phase 3C

**Files:**
- Modify: `e2e/helpers/seed-data.ts`

**Step 1: Add homework seeders**

```typescript
export async function seedHomeworkAssignment(params: {
  schoolId: string;
  setBy: string;
  subject?: string;
  title?: string;
  yearGroup?: string;
  className?: string;
  dueDate?: Date;
  isReadingTask?: boolean;
}): Promise<{ id: string; title: string }> {
  const assignment = await prisma.homeworkAssignment.create({
    data: {
      schoolId: params.schoolId,
      setBy: params.setBy,
      subject: params.subject || "Mathematics",
      title: params.title || "Practice Questions",
      yearGroup: params.yearGroup || "4",
      className: params.className || null,
      setDate: new Date(),
      dueDate: params.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      isReadingTask: params.isReadingTask || false,
    },
  });
  return { id: assignment.id, title: assignment.title };
}

export async function seedHomeworkCompletion(params: {
  assignmentId: string;
  childId: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  grade?: string;
  feedback?: string;
  gradedBy?: string;
}): Promise<{ id: string }> {
  const completion = await prisma.homeworkCompletion.upsert({
    where: { assignmentId_childId: { assignmentId: params.assignmentId, childId: params.childId } },
    update: {
      status: params.status || "NOT_STARTED",
      grade: params.grade || null,
      feedback: params.feedback || null,
      gradedBy: params.gradedBy || null,
      gradedAt: params.gradedBy ? new Date() : null,
    },
    create: {
      assignmentId: params.assignmentId,
      childId: params.childId,
      status: params.status || "NOT_STARTED",
      grade: params.grade || null,
      feedback: params.feedback || null,
      gradedBy: params.gradedBy || null,
      gradedAt: params.gradedBy ? new Date() : null,
    },
  });
  return { id: completion.id };
}
```

**Step 2: Add reading diary seeders**

```typescript
export async function seedReadingDiary(params: {
  childId: string;
  schoolId: string;
  currentBook?: string;
  readingLevel?: string;
}): Promise<{ id: string }> {
  const diary = await prisma.readingDiary.upsert({
    where: { childId: params.childId },
    update: {},
    create: {
      childId: params.childId,
      schoolId: params.schoolId,
      currentBook: params.currentBook || "Charlotte's Web",
      readingLevel: params.readingLevel || "Orange Band",
      targetMinsPerDay: 15,
    },
  });
  return { id: diary.id };
}

export async function seedReadingEntries(params: {
  diaryId: string;
  daysBack?: number;
}): Promise<{ count: number }> {
  const daysBack = params.daysBack || 5;
  let count = 0;
  const books = ["Charlotte's Web", "Charlotte's Web", "The BFG", "The BFG", "Matilda"];

  for (let i = 0; i < daysBack; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    await prisma.readingEntry.create({
      data: {
        diaryId: params.diaryId,
        date,
        bookTitle: books[i % books.length],
        minutesRead: 15 + Math.floor(Math.random() * 15),
        readWith: i % 2 === 0 ? "PARENT" : "ALONE",
        entryBy: "PARENT",
        parentComment: i === 0 ? "Read really well tonight!" : null,
      },
    });
    count++;
  }
  return { count };
}
```

**Step 3: Add visitor seeders**

```typescript
export async function seedVisitor(params: {
  schoolId: string;
  name?: string;
  organisation?: string;
  isRegular?: boolean;
}): Promise<{ id: string; name: string }> {
  const visitor = await prisma.visitor.create({
    data: {
      schoolId: params.schoolId,
      name: params.name || "John Smith",
      organisation: params.organisation || null,
      isRegular: params.isRegular || false,
    },
  });
  return { id: visitor.id, name: visitor.name };
}

export async function seedVisitorSignIn(params: {
  schoolId: string;
  visitorId: string;
  signedInBy: string;
  purpose?: "MEETING" | "MAINTENANCE" | "DELIVERY" | "VOLUNTEERING" | "INSPECTION" | "PARENT_VISIT" | "CONTRACTOR" | "OTHER";
}): Promise<{ id: string }> {
  const log = await prisma.visitorLog.create({
    data: {
      schoolId: params.schoolId,
      visitorId: params.visitorId,
      purpose: params.purpose || "MEETING",
      signInAt: new Date(),
      signedInBy: params.signedInBy,
    },
  });
  return { id: log.id };
}
```

**Step 4: Commit**

```bash
git add e2e/helpers/seed-data.ts
git commit -m "test: add E2E seed helpers for homework, reading diary, and visitors"
```

---

## Task 20: E2E — Homework Parent Journey

**Files:**
- Create: `e2e/parent-homework-journey.test.ts`

Tests to cover:
1. **Parent sees homework for their child** — seed assignment matching child's year group, navigate, verify title + subject + due date visible
2. **Parent marks homework as complete** — click "Mark as Done", verify status changes to completed
3. **Parent sees graded homework with feedback** — seed completion with grade + feedback, verify grade badge + feedback text shown
4. **Homework page shows colour-coded due dates** — seed overdue + upcoming + future homework, verify colour coding
5. **Feature disabled state** — navigate without `homeworkEnabled`

**Commit:**
```bash
git add e2e/parent-homework-journey.test.ts
git commit -m "test: add E2E tests for parent homework journey (5 tests)"
```

---

## Task 21: E2E — Staff Homework Journey

**Files:**
- Create: `e2e/staff-homework-journey.test.ts`

Tests to cover:
1. **Teacher sets homework for a year group** — fill form with subject, title, year group, due date, submit, verify appears in list
2. **Teacher views completion status** — seed assignment + completions, verify table shows which children completed
3. **Teacher grades homework** — click child, enter grade + feedback, save, verify saved
4. **Teacher cancels homework** — click cancel, confirm, verify cancelled status

**Commit:**
```bash
git add e2e/staff-homework-journey.test.ts
git commit -m "test: add E2E tests for staff homework journey (4 tests)"
```

---

## Task 22: E2E — Reading Diary Parent Journey

**Files:**
- Create: `e2e/parent-reading-diary-journey.test.ts`

Tests to cover:
1. **Parent logs a reading session** — navigate, fill book title + minutes + readWith, submit, verify entry appears
2. **Parent sees reading history with weekly dots** — seed entries, verify dots/indicators for days read
3. **Parent sees current book and reading level** — seed diary with currentBook + level, verify shown at top
4. **Parent sees reading stats** — seed entries, verify streak counter + total entries
5. **Feature disabled state** — navigate without `readingDiaryEnabled`

**Commit:**
```bash
git add e2e/parent-reading-diary-journey.test.ts
git commit -m "test: add E2E tests for parent reading diary journey (5 tests)"
```

---

## Task 23: E2E — Staff Reading Diary Journey

**Files:**
- Create: `e2e/staff-reading-diary-journey.test.ts`

Tests to cover:
1. **Teacher sees class reading overview** — seed diaries + entries for multiple children, verify overview table
2. **Teacher adds comment to a reading entry** — click child, add comment, verify saved
3. **Teacher updates reading level** — change level, save, verify updated
4. **"Who hasn't read this week?" filter** — seed some children with entries and some without, verify filter works

**Commit:**
```bash
git add e2e/staff-reading-diary-journey.test.ts
git commit -m "test: add E2E tests for staff reading diary journey (4 tests)"
```

---

## Task 24: E2E — Visitor Management Journey

**Files:**
- Create: `e2e/visitor-management-journey.test.ts`

Tests to cover:
1. **Staff signs in a new visitor** — enter name, org, purpose, badge number, sign in, verify appears in "On Site" list
2. **Staff signs out a visitor** — sign in, then sign out, verify removed from "On Site"
3. **Staff sees autocomplete for returning visitors** — seed a regular visitor, start typing name, verify suggestion appears
4. **Staff manages DBS register** — add DBS record, verify appears with status badge
5. **Staff views visitor history** — seed sign-in/out records, verify history table
6. **DBS warning for volunteer without valid DBS** — sign in visitor with purpose=Volunteering and no DBS, verify amber warning
7. **Feature disabled state** — navigate without `visitorManagementEnabled`

**Commit:**
```bash
git add e2e/visitor-management-journey.test.ts
git commit -m "test: add E2E tests for visitor management journey (7 tests)"
```

---

## Task 25: E2E — MIS Integration Journey

**Files:**
- Create: `e2e/mis-integration-journey.test.ts`

Tests to cover:
1. **Admin uploads student CSV** — navigate to MIS page, upload CSV with student data, verify sync result: X created, Y errors
2. **Admin uploads attendance CSV** — upload attendance CSV, verify sync result
3. **Admin sees sync history** — after uploads, verify sync log table shows entries with status + record counts
4. **Invalid CSV shows row-level errors** — upload CSV with bad data, verify error table shows specific row issues
5. **Feature disabled state** — navigate without `misIntegrationEnabled`

**Commit:**
```bash
git add e2e/mis-integration-journey.test.ts
git commit -m "test: add E2E tests for MIS integration journey (5 tests)"
```

---

## Task 26: Run Full E2E Suite + Final Verification

**Step 1: Run all E2E tests**

Run: `npx playwright test`
Expected: All tests pass (Phase 3A + 3B + 3C).

**Step 2: Run API unit tests**

Run: `cd apps/api && npx vitest run`
Expected: All pass.

**Step 3: Run lint + build**

Run: `npx pnpm lint && npx pnpm build`
Expected: Clean.

**Step 4: Fix and commit**

```bash
git add -A
git commit -m "fix: resolve any issues from Phase 3C E2E test suite"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Feature toggles + Child className | schema.prisma |
| 2 | Homework models + enums | schema.prisma |
| 3 | Reading diary models + enums | schema.prisma |
| 4 | Visitor management models + enums | schema.prisma |
| 5 | MIS integration models + enums | schema.prisma |
| 6 | Feature guards + web toggles | feature-guards.ts, trpc.ts, feature-toggles.tsx |
| 7 | Homework router + unit tests | homework.ts, homework.test.ts |
| 8 | Homework web page | homework/page.tsx |
| 9 | Reading diary router + unit tests | reading-diary.ts, reading-diary.test.ts |
| 10 | Reading diary web page | reading/page.tsx |
| 11 | Visitor management router + unit tests | visitor.ts, visitor.test.ts |
| 12 | Visitor management web page | visitors/page.tsx |
| 13 | MIS adapter interface + CSV adapter | mis/types.ts, mis/csv-adapter.ts |
| 14 | MIS integration router + unit tests | mis.ts, mis.test.ts |
| 15 | MIS integration web page | mis/page.tsx |
| 16 | Nav links for Phase 3C pages | layout.tsx |
| 17 | Admin settings + seed data | admin/page.tsx, seed.ts |
| 18 | Full unit test suite + build | All |
| **19** | **E2E seed helpers** | **seed-data.ts** |
| **20** | **E2E: Parent homework (5 tests)** | **parent-homework-journey.test.ts** |
| **21** | **E2E: Staff homework (4 tests)** | **staff-homework-journey.test.ts** |
| **22** | **E2E: Parent reading diary (5 tests)** | **parent-reading-diary-journey.test.ts** |
| **23** | **E2E: Staff reading diary (4 tests)** | **staff-reading-diary-journey.test.ts** |
| **24** | **E2E: Visitor management (7 tests)** | **visitor-management-journey.test.ts** |
| **25** | **E2E: MIS integration (5 tests)** | **mis-integration-journey.test.ts** |
| **26** | **Full E2E suite + final verification** | **All** |

### E2E Test Coverage Matrix — Phase 3C

| Feature | Happy Path | Empty State | Feature Disabled | Multi-User | Error Cases |
|---------|-----------|-------------|-----------------|------------|-------------|
| Homework (Parent) | ✅ View + complete | — | ✅ Feature off | — | ✅ Colour coding, Graded view |
| Homework (Staff) | ✅ Set + grade | — | — | ✅ Completion tracking | ✅ Cancel |
| Reading Diary (Parent) | ✅ Log reading | — | ✅ Feature off | — | ✅ Stats + streak |
| Reading Diary (Staff) | ✅ Class overview | — | — | ✅ Comment + level | ✅ Filter no-read |
| Visitor Management | ✅ Sign in/out | — | ✅ Feature off | ✅ Autocomplete | ✅ DBS warning, History |
| MIS Integration | ✅ CSV upload | — | ✅ Feature off | — | ✅ Invalid CSV errors |

**Total new E2E tests: 30 across 6 test files**

### Grand Total — All Three Phases

| Phase | Tasks | Unit Test Files | E2E Tests | E2E Files |
|-------|-------|----------------|-----------|-----------|
| 3A | 24 | 3 | 16 | 5 |
| 3B | 22 | 3 | 24 | 5 |
| 3C | 26 | 4 | 30 | 6 |
| **Total** | **72** | **10** | **70** | **16** |
