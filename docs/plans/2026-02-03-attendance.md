# Attendance Feature Implementation Plan

> **For AI:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement attendance tracking and absence reporting, allowing parents to view their child's records and notify the school of upcoming absences.

**Architecture:**
- **Backend:** tRPC router (`attendance.ts`) for querying records and submitting absence reports.
- **Reporting:** Absence reports will create `AttendanceRecord` entries with `ABSENT_AUTHORISED` (pending review) or a separate `AbsenceReport` table. *MVP: Just create AttendanceRecord with a specific note.*
- **Web UI:** Parent attendance calendar/list; Staff dashboard for monitoring school-wide attendance.
- **Mobile UI:** Parent dashboard for viewing recent sessions and reporting absences.

**Tech Stack:**
- tRPC (API)
- Prisma
- Date-fns (Date manipulation)
- Tailwind CSS

---

## Phase 1: Backend & Core Queries

### Task 1: Attendance Router (Backend)

**Files:**
- Create: `apps/api/src/router/attendance.ts`
- Modify: `apps/api/src/router/index.ts`

**Step 1: Implement `getAttendanceForChild`**

- Input: `childId: string`, `startDate: Date`, `endDate: Date`.
- Verify: User is parent of the child.
- Return: `AttendanceRecord` list.

**Step 2: Implement `reportAbsence`**

- Input: `childId: string`, `startDate: Date`, `endDate: Date`, `reason: string`.
- Logic: Create `AttendanceRecord` entries for all school sessions (AM/PM) in the range.
- Mark as `ABSENT_AUTHORISED` for now (simplified MVP).

**Step 3: Register Router**

Add to `appRouter` in `apps/api/src/router/index.ts`.

---

## Phase 2: Web UI

### Task 2: Parent Attendance View (Web)

**Files:**
- Create: `apps/web/src/app/dashboard/attendance/page.tsx`
- Create: `apps/web/src/components/attendance/attendance-list.tsx`

**Step 1: List Children & Select**

Show tabs or dropdown for children.

**Step 2: Display Attendance History**

Show a list or grid of recent sessions with status badges (Present, Late, Absent).

### Task 3: Absence Reporting Form (Web)

**Files:**
- Create: `apps/web/src/components/attendance/absence-report-form.tsx`

**Step 1: Implement Form**

Fields: Child select, Start Date, End Date, Reason.
Action: Call `trpc.attendance.reportAbsence.useMutation`.

---

## Phase 3: Mobile UI

### Task 4: Parent Attendance Screen (Mobile)

**Files:**
- Create: `apps/mobile/src/screens/AttendanceScreen.tsx`
- Modify: `apps/mobile/App.tsx` (Add tab)

**Step 1: Implementation**

Show recent attendance records in a list.
Add "Report Absence" button that opens a simple modal or screen.

---
