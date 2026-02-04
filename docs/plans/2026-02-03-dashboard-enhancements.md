# Dashboard Enhancements Implementation Plan

> **For AI:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the parent dashboard with Today's Overview, Action Required, This Week, and attendance percentage widgets as specified in PRD Section 7.3.

**Architecture:**
- Extend `dashboardRouter.getSummary` to return richer data: today's attendance per child, upcoming events this week, attendance percentage per child.
- Web: Add widget components to dashboard page.
- Mobile: Update home/dashboard view (currently messages tab is the default — consider adding a dashboard tab).

**Tech Stack:** tRPC, Prisma, date-fns, Next.js, React Native.

---

### Task 1: Extend getSummary with Today's Overview Data

**Files:**
- Modify: `apps/api/src/router/dashboard.ts`
- Modify: `apps/api/src/__tests__/dashboard.test.ts`

**Step 1: Write failing test for extended summary**

Add to dashboard test:

```typescript
describe("getSummary - extended", () => {
  it("returns today's attendance for each child", async () => {
    const ctx = createTestContext({
      prisma: {
        ...basePrisma,
        attendanceRecord: {
          findMany: vi.fn().mockResolvedValue([
            { childId: "child-1", session: "AM", mark: "PRESENT", date: new Date() },
            { childId: "child-1", session: "PM", mark: "PRESENT", date: new Date() },
          ]),
          count: vi.fn().mockResolvedValue(0),
        },
        event: {
          findMany: vi.fn().mockResolvedValue([
            { id: "evt-1", title: "Sports Day", startDate: new Date(), category: "EVENT" },
          ]),
        },
      },
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.getSummary();

    expect(result.todayAttendance).toBeDefined();
    expect(result.upcomingEvents).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/dashboard.test.ts`
Expected: FAIL — `todayAttendance` undefined.

**Step 3: Extend getSummary implementation**

Add to `getSummary` in `dashboard.ts`, after existing metrics:

```typescript
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from "date-fns";

// 5. Today's Attendance
const today = new Date();
const todayAttendance = await ctx.prisma.attendanceRecord.findMany({
  where: {
    childId: { in: childIds },
    date: {
      gte: startOfDay(today),
      lte: endOfDay(today),
    },
  },
  select: {
    childId: true,
    session: true,
    mark: true,
  },
});

// Group by child
const attendanceByChild: Record<string, { am?: string; pm?: string }> = {};
for (const record of todayAttendance) {
  if (!attendanceByChild[record.childId]) {
    attendanceByChild[record.childId] = {};
  }
  if (record.session === "AM") {
    attendanceByChild[record.childId].am = record.mark;
  } else {
    attendanceByChild[record.childId].pm = record.mark;
  }
}

// 6. Upcoming Events (this week)
const schoolIds = [...new Set(children.map((c: any) => c.schoolId))];
const upcomingEvents = schoolIds.length > 0
  ? await ctx.prisma.event.findMany({
      where: {
        schoolId: { in: schoolIds },
        startDate: {
          gte: today,
          lte: endOfWeek(today, { weekStartsOn: 1 }),
        },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    })
  : [];

// 7. Attendance Percentage (last 30 days per child)
const thirtyDaysAgo = subDays(today, 30);
const attendanceStats: Record<string, { total: number; present: number }> = {};

if (childIds.length > 0) {
  const recentRecords = await ctx.prisma.attendanceRecord.findMany({
    where: {
      childId: { in: childIds },
      date: { gte: thirtyDaysAgo },
      mark: { not: "NOT_REQUIRED" },
    },
    select: { childId: true, mark: true },
  });

  for (const r of recentRecords) {
    if (!attendanceStats[r.childId]) {
      attendanceStats[r.childId] = { total: 0, present: 0 };
    }
    attendanceStats[r.childId].total++;
    if (r.mark === "PRESENT" || r.mark === "LATE") {
      attendanceStats[r.childId].present++;
    }
  }
}

// Add to return:
return {
  children,
  metrics: { unreadMessages, paymentsCount, paymentsTotal, attendanceAlerts },
  todayAttendance: attendanceByChild,
  upcomingEvents,
  attendancePercentage: Object.fromEntries(
    Object.entries(attendanceStats).map(([childId, stats]) => [
      childId,
      stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : null,
    ]),
  ),
};
```

**Step 4: Run tests**

Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/dashboard.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add apps/api/src/router/dashboard.ts apps/api/src/__tests__/dashboard.test.ts
git commit -m "feat(dashboard): extend getSummary with today's attendance, events, attendance %"
```

---

### Task 2: Dashboard Web UI — Today's Overview Widget

**Files:**
- Create: `apps/web/src/components/dashboard/today-overview.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Create today-overview.tsx**

```typescript
"use client";

const markLabels: Record<string, { label: string; color: string }> = {
  PRESENT: { label: "Present", color: "text-green-600" },
  LATE: { label: "Late", color: "text-yellow-600" },
  ABSENT_AUTHORISED: { label: "Absent (Auth)", color: "text-orange-600" },
  ABSENT_UNAUTHORISED: { label: "Absent", color: "text-red-600" },
};

interface TodayOverviewProps {
  children: Array<{ id: string; firstName: string; lastName: string }>;
  todayAttendance: Record<string, { am?: string; pm?: string }>;
  attendancePercentage: Record<string, number | null>;
}

export function TodayOverview({ children, todayAttendance, attendancePercentage }: TodayOverviewProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3">Today's Overview</h3>
      <div className="space-y-3">
        {children.map((child) => {
          const att = todayAttendance[child.id];
          const pct = attendancePercentage[child.id];
          return (
            <div key={child.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{child.firstName} {child.lastName}</p>
                <div className="flex gap-2 text-xs">
                  <span>AM: <span className={markLabels[att?.am || ""]?.color || "text-gray-400"}>{markLabels[att?.am || ""]?.label || "—"}</span></span>
                  <span>PM: <span className={markLabels[att?.pm || ""]?.color || "text-gray-400"}>{markLabels[att?.pm || ""]?.label || "—"}</span></span>
                </div>
              </div>
              {pct !== null && pct !== undefined && (
                <span className={`text-sm font-medium ${pct >= 95 ? "text-green-600" : pct >= 90 ? "text-yellow-600" : "text-red-600"}`}>
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Update dashboard page to use widget**

Import `TodayOverview` and pass `data.todayAttendance`, `data.children`, `data.attendancePercentage` from `getSummary`.

**Step 3: Commit**
```bash
git add apps/web/src/components/dashboard/today-overview.tsx apps/web/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add Today's Overview widget to web"
```

---

### Task 3: Dashboard Web UI — This Week Widget

**Files:**
- Create: `apps/web/src/components/dashboard/this-week.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Create this-week.tsx**

```typescript
"use client";

import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  TERM_DATE: "bg-blue-100 text-blue-700",
  INSET_DAY: "bg-yellow-100 text-yellow-700",
  EVENT: "bg-green-100 text-green-700",
  DEADLINE: "bg-red-100 text-red-700",
  CLUB: "bg-purple-100 text-purple-700",
};

interface ThisWeekProps {
  events: Array<{
    id: string;
    title: string;
    startDate: string | Date;
    category: string;
  }>;
}

export function ThisWeek({ events }: ThisWeekProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3">This Week</h3>
      {events.length === 0 && (
        <p className="text-sm text-gray-500">No events this week.</p>
      )}
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${categoryColors[event.category] || "bg-gray-100"}`}>
              {format(new Date(event.startDate), "EEE")}
            </span>
            <span className="text-sm">{event.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Add to dashboard page alongside TodayOverview**

Use a two-column grid layout for the widgets.

**Step 3: Commit**
```bash
git add apps/web/src/components/dashboard/this-week.tsx apps/web/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add This Week events widget to web"
```

---

### Task 4: Dashboard Mobile Enhancements

**Files:**
- Create: `apps/mobile/src/screens/DashboardScreen.tsx`
- Modify: `apps/mobile/App.tsx` (add Home/Dashboard tab)

**Step 1: Create DashboardScreen.tsx**

- Call `trpc.dashboard.getSummary.useQuery()`.
- Show: children cards with today's attendance marks, attendance %, unread count, outstanding payments.
- Show upcoming events section.
- Tapping metrics navigates to respective tabs.

**Step 2: Add as first tab in App.tsx**

Replace or prepend a "Home" tab before Messages:

```typescript
<Tab.Screen name="Home" component={DashboardScreen} />
```

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/DashboardScreen.tsx apps/mobile/App.tsx
git commit -m "feat(dashboard): add mobile dashboard home screen"
```

---
