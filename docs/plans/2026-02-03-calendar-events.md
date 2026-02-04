# Calendar & Events Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement calendar & events API and UI so parents can view school events and staff can manage them.

**Architecture:**
- Add `calendarRouter` to `apps/api/src/router/calendar.ts` with staff CRUD and parent read access.
- Web: New `/dashboard/calendar` page with event list and filters.
- Mobile: New `CalendarScreen` tab.
- The `Event` model already exists in Prisma schema — no migrations needed.

**Tech Stack:** Fastify, tRPC v11, Prisma, Zod, date-fns, Next.js, React Native.

---

### Task 1: Create Calendar Router Scaffold

**Files:**
- Create: `apps/api/src/router/calendar.ts`
- Modify: `apps/api/src/router/index.ts`

**Step 1: Create calendar.ts with empty router**

```typescript
import { router } from "../trpc";

export const calendarRouter = router({});
```

**Step 2: Register in index.ts**

Add import and register:
```typescript
import { calendarRouter } from "./calendar";
// ...
export const appRouter = router({
  // ... existing routers
  calendar: calendarRouter,
});
```

**Step 3: Commit**
```bash
git add apps/api/src/router/calendar.ts apps/api/src/router/index.ts
git commit -m "feat(calendar): scaffold calendar router"
```

---

### Task 2: Implement listEvents (Parent Query)

**Files:**
- Modify: `apps/api/src/router/calendar.ts`
- Create: `apps/api/src/__tests__/calendar.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

function createTestContext(overrides?: Record<string, any>): any {
  return {
    prisma: {
      parentChild: {
        findMany: vi.fn().mockResolvedValue([
          { childId: "child-1", child: { schoolId: "school-1" } },
        ]),
      },
      event: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "evt-1",
            schoolId: "school-1",
            title: "Sports Day",
            body: "Annual sports day",
            startDate: new Date("2026-06-15T09:00:00Z"),
            endDate: new Date("2026-06-15T15:00:00Z"),
            allDay: true,
            category: "EVENT",
            createdAt: new Date(),
          },
        ]),
      },
    },
    req: {},
    res: {},
    user: { id: "parent-1" },
    session: {},
    ...overrides,
  };
}

describe("calendar router", () => {
  describe("listEvents", () => {
    it("returns events for parent's children's schools", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.calendar.listEvents({
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-30"),
      });

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Sports Day");
      expect(ctx.prisma.parentChild.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "parent-1" },
        }),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/calendar.test.ts`
Expected: FAIL — `calendar.listEvents` is not a function.

**Step 3: Implement listEvents**

In `apps/api/src/router/calendar.ts`:
```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const calendarRouter = router({
  listEvents: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        category: z.enum(["TERM_DATE", "INSET_DAY", "EVENT", "DEADLINE", "CLUB"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get schools the parent's children attend
      const parentLinks = await ctx.prisma.parentChild.findMany({
        where: { userId: ctx.user.id },
        select: { child: { select: { schoolId: true } } },
      });
      const schoolIds = [...new Set(parentLinks.map((p: any) => p.child.schoolId))];

      if (schoolIds.length === 0) return [];

      return ctx.prisma.event.findMany({
        where: {
          schoolId: { in: schoolIds },
          startDate: { gte: input.startDate, lte: input.endDate },
          ...(input.category ? { category: input.category } : {}),
        },
        orderBy: { startDate: "asc" },
      });
    }),
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/calendar.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add apps/api/src/router/calendar.ts apps/api/src/__tests__/calendar.test.ts
git commit -m "feat(calendar): implement listEvents for parents"
```

---

### Task 3: Implement createEvent and deleteEvent (Staff)

**Files:**
- Modify: `apps/api/src/router/calendar.ts`
- Modify: `apps/api/src/__tests__/calendar.test.ts`

**Step 1: Write failing tests for createEvent and deleteEvent**

Add to test file:
```typescript
describe("createEvent", () => {
  it("creates event for school", async () => {
    const ctx = createTestContext({
      user: { id: "staff-1" },
      prisma: {
        ...createTestContext().prisma,
        staffMember: {
          findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
        },
        event: {
          create: vi.fn().mockResolvedValue({ id: "evt-new", title: "New Event" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.createEvent({
      schoolId: "school-1",
      title: "New Event",
      body: "Details",
      startDate: new Date("2026-07-01T09:00:00Z"),
      allDay: true,
      category: "EVENT",
    });

    expect(result.success).toBe(true);
    expect(ctx.prisma.event.create).toHaveBeenCalled();
  });
});

describe("deleteEvent", () => {
  it("deletes event belonging to school", async () => {
    const ctx = createTestContext({
      user: { id: "staff-1" },
      prisma: {
        ...createTestContext().prisma,
        staffMember: {
          findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "ADMIN" }),
        },
        event: {
          findUnique: vi.fn().mockResolvedValue({ id: "evt-1", schoolId: "school-1" }),
          delete: vi.fn().mockResolvedValue({ id: "evt-1" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.deleteEvent({
      schoolId: "school-1",
      eventId: "evt-1",
    });

    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/calendar.test.ts`
Expected: FAIL — procedures not defined.

**Step 3: Implement createEvent and deleteEvent**

Add to `calendarRouter` in `calendar.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { schoolStaffProcedure } from "../trpc";

// Add to router object:
createEvent: schoolStaffProcedure
  .input(
    z.object({
      schoolId: z.string(),
      title: z.string().min(1),
      body: z.string().optional(),
      startDate: z.date(),
      endDate: z.date().optional(),
      allDay: z.boolean().default(false),
      category: z.enum(["TERM_DATE", "INSET_DAY", "EVENT", "DEADLINE", "CLUB"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.prisma.event.create({
      data: {
        schoolId: input.schoolId,
        title: input.title,
        body: input.body,
        startDate: input.startDate,
        endDate: input.endDate,
        allDay: input.allDay,
        category: input.category,
      },
    });

    return { success: true };
  }),

deleteEvent: schoolStaffProcedure
  .input(
    z.object({
      schoolId: z.string(),
      eventId: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const event = await ctx.prisma.event.findUnique({
      where: { id: input.eventId },
    });

    if (!event || event.schoolId !== input.schoolId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    await ctx.prisma.event.delete({ where: { id: input.eventId } });
    return { success: true };
  }),
```

**Step 4: Run tests**

Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/calendar.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add apps/api/src/router/calendar.ts apps/api/src/__tests__/calendar.test.ts
git commit -m "feat(calendar): implement createEvent and deleteEvent for staff"
```

---

### Task 4: Calendar Web UI — Event List Page

**Files:**
- Create: `apps/web/src/app/dashboard/calendar/page.tsx`
- Create: `apps/web/src/components/calendar/event-list.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx` (add nav link)

**Step 1: Create event-list.tsx component**

```typescript
"use client";

import { trpc } from "@/lib/trpc";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useState } from "react";

const categoryColors: Record<string, string> = {
  TERM_DATE: "bg-blue-100 text-blue-800",
  INSET_DAY: "bg-yellow-100 text-yellow-800",
  EVENT: "bg-green-100 text-green-800",
  DEADLINE: "bg-red-100 text-red-800",
  CLUB: "bg-purple-100 text-purple-800",
};

export function EventList() {
  const [month, setMonth] = useState(new Date());
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);

  const { data: events, isLoading } = trpc.calendar.listEvents.useQuery({
    startDate,
    endDate,
  });

  const prevMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
  const nextMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1 border rounded text-sm">Previous</button>
        <h3 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h3>
        <button onClick={nextMonth} className="px-3 py-1 border rounded text-sm">Next</button>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">Loading events...</p>}

      {events && events.length === 0 && (
        <p className="text-gray-500 text-sm">No events this month.</p>
      )}

      <div className="space-y-3">
        {events?.map((event: any) => (
          <div key={event.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{event.title}</h4>
                {event.body && <p className="text-sm text-gray-600 mt-1">{event.body}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(event.startDate), "EEE d MMM, h:mm a")}
                  {event.endDate && ` — ${format(new Date(event.endDate), "h:mm a")}`}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[event.category] || "bg-gray-100"}`}>
                {event.category.replace("_", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create calendar page.tsx**

```typescript
import { EventList } from "@/components/calendar/event-list";

export default function CalendarPage() {
  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Calendar & Events</h1>
      <EventList />
    </div>
  );
}
```

**Step 3: Add nav link in dashboard layout.tsx**

Add to `navItems` array:
```typescript
{ name: "Calendar", href: "/dashboard/calendar" },
```

**Step 4: Commit**
```bash
git add apps/web/src/app/dashboard/calendar/page.tsx apps/web/src/components/calendar/event-list.tsx apps/web/src/app/dashboard/layout.tsx
git commit -m "feat(calendar): add web calendar page with event list"
```

---

### Task 5: Calendar Mobile UI — CalendarScreen Tab

**Files:**
- Create: `apps/mobile/src/screens/CalendarScreen.tsx`
- Modify: `apps/mobile/App.tsx` (add tab)

**Step 1: Create CalendarScreen.tsx**

Follow the same pattern as `AttendanceScreen.tsx`:
- Use `trpc.calendar.listEvents.useQuery` with startOfMonth/endOfMonth.
- FlatList of events with category badges.
- Month navigation buttons.

**Step 2: Add tab in App.tsx**

Add `Calendar` to `TabParamList` and register `Tab.Screen`:
```typescript
<Tab.Screen name="Calendar" component={CalendarScreen} />
```

**Step 3: Commit**
```bash
git add apps/mobile/src/screens/CalendarScreen.tsx apps/mobile/App.tsx
git commit -m "feat(calendar): add mobile calendar tab"
```

---
