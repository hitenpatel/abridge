# Phase 3A Implementation Plan: Safety & Analytics

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Admin Analytics Dashboard, Wellbeing Check-ins, and Emergency Lockdown Comms to SchoolConnect.

**Architecture:** Three new feature modules following existing tRPC router + Prisma + Next.js patterns. Admin Analytics aggregates existing data with Redis caching. Wellbeing uses a 15-min cron for deterministic alert generation. Emergency Comms fans out via existing NotificationDelivery infrastructure.

**Tech Stack:** Prisma (schema + migrations), tRPC (routers), Zod (validation), Next.js App Router (pages), Tailwind + shadcn/ui (UI), Vitest (API tests), Redis (caching).

**Build Order:** Analytics → Wellbeing → Emergency (quick wins first, each builds on the last).

---

## Task 1: Schema — Feature Toggles & Branding Fields on School

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (School model)

**Step 1: Add new fields to School model**

Add these fields to the `School` model in the schema, after the existing feature toggles:

```prisma
  // Phase 3A feature toggles
  wellbeingEnabled          Boolean  @default(false)
  emergencyCommsEnabled     Boolean  @default(false)
  // analyticsEnabled already exists

  // School branding
  logoUrl                   String?
  brandColor                String?  @default("#1E3A5F")
  secondaryColor            String?
  schoolMotto               String?
  brandFont                 String?  @default("DEFAULT")
```

**Step 2: Generate Prisma client**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Expected: Prisma client generated successfully.

**Step 3: Push schema to database**

Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`
Expected: Schema pushed, no data loss warnings.

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add Phase 3A feature toggles and branding fields to School"
```

---

## Task 2: Schema — AnalyticsSnapshot Model

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add AnalyticsSnapshot model**

```prisma
model AnalyticsSnapshot {
  id        String   @id @default(cuid())
  schoolId  String
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  period    AnalyticsPeriod
  date      DateTime @db.Date
  data      Json
  createdAt DateTime @default(now())

  @@unique([schoolId, period, date])
  @@index([schoolId, date])
  @@map("analytics_snapshot")
}

enum AnalyticsPeriod {
  DAILY
  WEEKLY
  TERMLY
}
```

Add the relation to the School model:

```prisma
  // In School model, relations section
  analyticsSnapshots AnalyticsSnapshot[]
```

**Step 2: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add AnalyticsSnapshot model"
```

---

## Task 3: Schema — Wellbeing Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum Mood {
  GREAT
  GOOD
  OK
  LOW
  STRUGGLING
}

enum CheckInBy {
  STUDENT
  PARENT
  STAFF
}

enum WellbeingTriggerRule {
  THREE_LOW_DAYS
  FIVE_ABSENT_DAYS
  MOOD_DROP
  MANUAL
}

enum WellbeingAlertStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
}
```

**Step 2: Add WellbeingCheckIn model**

```prisma
model WellbeingCheckIn {
  id          String    @id @default(cuid())
  childId     String
  child       Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId    String
  school      School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  mood        Mood
  note        String?
  checkedInBy CheckInBy
  date        DateTime  @db.Date
  createdAt   DateTime  @default(now())

  @@unique([childId, date])
  @@index([schoolId, date])
  @@map("wellbeing_check_in")
}
```

**Step 3: Add WellbeingAlert model**

```prisma
model WellbeingAlert {
  id              String                @id @default(cuid())
  childId         String
  child           Child                 @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId        String
  school          School                @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  triggerRule     WellbeingTriggerRule
  status          WellbeingAlertStatus  @default(OPEN)
  acknowledgedBy  String?
  acknowledger    User?                 @relation("WellbeingAlertAcknowledger", fields: [acknowledgedBy], references: [id])
  resolvedBy      String?
  resolver        User?                 @relation("WellbeingAlertResolver", fields: [resolvedBy], references: [id])
  note            String?
  createdAt       DateTime              @default(now())
  acknowledgedAt  DateTime?
  resolvedAt      DateTime?

  @@index([schoolId, status])
  @@index([childId, createdAt])
  @@map("wellbeing_alert")
}
```

**Step 4: Add relations to Child, School, and User models**

In `Child`:
```prisma
  wellbeingCheckIns WellbeingCheckIn[]
  wellbeingAlerts   WellbeingAlert[]
```

In `School`:
```prisma
  wellbeingCheckIns WellbeingCheckIn[]
  wellbeingAlerts   WellbeingAlert[]
```

In `User`:
```prisma
  wellbeingAlertsAcknowledged WellbeingAlert[] @relation("WellbeingAlertAcknowledger")
  wellbeingAlertsResolved     WellbeingAlert[] @relation("WellbeingAlertResolver")
```

**Step 5: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add WellbeingCheckIn and WellbeingAlert models"
```

---

## Task 4: Schema — Emergency Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum EmergencyType {
  LOCKDOWN
  EVACUATION
  SHELTER_IN_PLACE
  MEDICAL
  OTHER
}

enum EmergencyStatus {
  ACTIVE
  ALL_CLEAR
  CANCELLED
}
```

**Step 2: Add EmergencyAlert model**

```prisma
model EmergencyAlert {
  id          String           @id @default(cuid())
  schoolId    String
  school      School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  type        EmergencyType
  status      EmergencyStatus  @default(ACTIVE)
  title       String
  message     String?
  initiatedBy String
  initiator   User             @relation("EmergencyAlertInitiator", fields: [initiatedBy], references: [id])
  resolvedBy  String?
  resolver    User?            @relation("EmergencyAlertResolver", fields: [resolvedBy], references: [id])
  resolvedAt  DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  updates     EmergencyUpdate[]

  @@index([schoolId, status])
  @@map("emergency_alert")
}
```

**Step 3: Add EmergencyUpdate model**

```prisma
model EmergencyUpdate {
  id       String         @id @default(cuid())
  alertId  String
  alert    EmergencyAlert @relation(fields: [alertId], references: [id], onDelete: Cascade)
  message  String
  postedBy String
  poster   User           @relation("EmergencyUpdatePoster", fields: [postedBy], references: [id])
  createdAt DateTime      @default(now())

  @@index([alertId, createdAt])
  @@map("emergency_update")
}
```

**Step 4: Add relations to School and User models**

In `School`:
```prisma
  emergencyAlerts EmergencyAlert[]
```

In `User`:
```prisma
  emergencyAlertsInitiated EmergencyAlert[] @relation("EmergencyAlertInitiator")
  emergencyAlertsResolved  EmergencyAlert[] @relation("EmergencyAlertResolver")
  emergencyUpdatesPosted   EmergencyUpdate[] @relation("EmergencyUpdatePoster")
```

**Step 5: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add EmergencyAlert and EmergencyUpdate models"
```

---

## Task 5: Update Feature Guards

**Files:**
- Modify: `apps/api/src/lib/feature-guards.ts`

**Step 1: Add new feature names to the type and map**

Add `"wellbeing"`, `"emergencyComms"`, and `"analytics"` to the `FeatureName` type, the `featureFieldMap`, the `featureLabel` map, and the `SchoolFeatures` interface:

```typescript
// Add to FeatureName type
| "wellbeing"
| "emergencyComms"
| "analytics"

// Add to SchoolFeatures interface
wellbeingEnabled: boolean;
emergencyCommsEnabled: boolean;
analyticsEnabled: boolean;

// Add to featureFieldMap
wellbeing: "wellbeingEnabled",
emergencyComms: "emergencyCommsEnabled",
analytics: "analyticsEnabled",

// Add to featureLabel
wellbeing: "Wellbeing Check-ins",
emergencyComms: "Emergency Communications",
analytics: "Analytics",
```

**Step 2: Update schoolFeatureProcedure select in trpc.ts**

In `apps/api/src/trpc.ts`, add the new toggle fields to the `select` in `schoolFeatureProcedure`:

```typescript
wellbeingEnabled: true,
emergencyCommsEnabled: true,
// analyticsEnabled should already be there
```

**Step 3: Commit**

```bash
git add apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts
git commit -m "feat: add Phase 3A feature guards for wellbeing, emergency, analytics"
```

---

## Task 6: Update Feature Toggles on Web

**Files:**
- Modify: `apps/web/src/lib/feature-toggles.tsx`

**Step 1: Add new toggles to interface and defaults**

```typescript
// Add to FeatureToggles interface
wellbeingEnabled: boolean;
emergencyCommsEnabled: boolean;
analyticsEnabled: boolean;

// Add to defaultToggles
wellbeingEnabled: false,
emergencyCommsEnabled: false,
analyticsEnabled: false,
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/feature-toggles.tsx
git commit -m "feat: add Phase 3A feature toggles to web client"
```

---

## Task 7: Analytics Router — Attendance Aggregation

**Files:**
- Create: `apps/api/src/router/analytics.ts` (or modify if exists)
- Test: `apps/api/src/__tests__/analytics.test.ts`

**Step 1: Write the failing test for attendance summary**

```typescript
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
  getCachedStaffMembership: vi.fn().mockResolvedValue(null),
  setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Record<string, any>): any {
  return {
    prisma: {
      school: {
        findUnique: vi.fn().mockResolvedValue({
          messagingEnabled: true,
          paymentsEnabled: true,
          attendanceEnabled: true,
          calendarEnabled: true,
          formsEnabled: true,
          translationEnabled: false,
          parentsEveningEnabled: false,
          wellbeingEnabled: false,
          emergencyCommsEnabled: false,
          analyticsEnabled: true,
          paymentDinnerMoneyEnabled: true,
          paymentTripsEnabled: true,
          paymentClubsEnabled: true,
          paymentUniformEnabled: true,
          paymentOtherEnabled: true,
        }),
      },
      attendanceRecord: {
        count: vi.fn().mockResolvedValue(100),
        groupBy: vi.fn().mockResolvedValue([
          { mark: "PRESENT", _count: { id: 85 } },
          { mark: "LATE", _count: { id: 5 } },
          { mark: "ABSENT_AUTH", _count: { id: 7 } },
          { mark: "ABSENT_UNAUTH", _count: { id: 3 } },
        ]),
      },
      staffMember: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-1",
          schoolId: "school-1",
          role: "ADMIN",
        }),
      },
    },
    user: { id: "user-1", name: "Admin User" },
    session: { id: "session-1" },
    ...overrides,
  };
}

describe("analytics router", () => {
  describe("getAttendanceSummary", () => {
    it("returns attendance percentages for date range", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.analytics.getAttendanceSummary({
        schoolId: "school-1",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(result).toHaveProperty("totalRecords");
      expect(result).toHaveProperty("breakdown");
      expect(ctx.prisma.attendanceRecord.groupBy).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/__tests__/analytics.test.ts`
Expected: FAIL — procedure not found or not defined.

**Step 3: Write the analytics router**

Create `apps/api/src/router/analytics.ts`:

```typescript
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { schoolFeatureProcedure, router } from "../trpc";

export const analyticsRouter = router({
  getAttendanceSummary: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "analytics");

      const breakdown = await ctx.prisma.attendanceRecord.groupBy({
        by: ["mark"],
        where: {
          schoolId: input.schoolId,
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        _count: { id: true },
      });

      const totalRecords = breakdown.reduce(
        (sum, row) => sum + row._count.id,
        0,
      );

      const present =
        breakdown.find((r) => r.mark === "PRESENT")?._count.id ?? 0;
      const late = breakdown.find((r) => r.mark === "LATE")?._count.id ?? 0;
      const attendanceRate =
        totalRecords > 0 ? ((present + late) / totalRecords) * 100 : 0;

      return {
        totalRecords,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        breakdown: breakdown.map((row) => ({
          mark: row.mark,
          count: row._count.id,
        })),
      };
    }),

  getPaymentSummary: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "analytics");

      const [totalCollected, totalOutstanding] = await Promise.all([
        ctx.prisma.payment.aggregate({
          where: {
            schoolId: input.schoolId,
            status: "PAID",
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
          _sum: { amountInPence: true },
        }),
        ctx.prisma.paymentItemChild.count({
          where: {
            paymentItem: { schoolId: input.schoolId },
            payment: null,
          },
        }),
      ]);

      return {
        totalCollectedPence: totalCollected._sum.amountInPence ?? 0,
        outstandingCount: totalOutstanding,
      };
    }),

  getMessageEngagement: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "analytics");

      const [totalSent, totalRead] = await Promise.all([
        ctx.prisma.message.count({
          where: {
            schoolId: input.schoolId,
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
        }),
        ctx.prisma.messageRead.count({
          where: {
            message: {
              schoolId: input.schoolId,
              createdAt: {
                gte: input.startDate,
                lte: input.endDate,
              },
            },
          },
        }),
      ]);

      const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

      return {
        totalSent,
        totalRead,
        readRate: Math.round(readRate * 10) / 10,
      };
    }),

  getFormCompletion: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "analytics");

      const templates = await ctx.prisma.formTemplate.findMany({
        where: { schoolId: input.schoolId },
        include: {
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return templates.map((t) => ({
        id: t.id,
        title: t.title,
        responseCount: t._count.responses,
      }));
    }),

  getDashboardSummary: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "analytics");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [attendanceToday, unreadMessages, outstandingPayments, pendingForms] =
        await Promise.all([
          ctx.prisma.attendanceRecord.count({
            where: {
              schoolId: input.schoolId,
              date: today,
              mark: { in: ["PRESENT", "LATE"] },
            },
          }),
          ctx.prisma.messageChild.count({
            where: {
              message: { schoolId: input.schoolId },
              messageRead: { none: {} },
            },
          }),
          ctx.prisma.paymentItemChild.count({
            where: {
              paymentItem: { schoolId: input.schoolId },
              payment: null,
            },
          }),
          ctx.prisma.formTemplate.count({
            where: {
              schoolId: input.schoolId,
              responses: { none: {} },
            },
          }),
        ]);

      return {
        attendanceToday,
        unreadMessages,
        outstandingPayments,
        pendingForms,
      };
    }),
});
```

**Step 4: Register in router index**

Modify `apps/api/src/router/index.ts` — the analytics router may already be imported. If so, ensure it points to the updated file. If not, add:

```typescript
import { analyticsRouter } from "./analytics";
// In the router({}) call:
analytics: analyticsRouter,
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/__tests__/analytics.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/router/analytics.ts apps/api/src/__tests__/analytics.test.ts apps/api/src/router/index.ts
git commit -m "feat: add analytics router with attendance, payment, message, and form aggregation"
```

---

## Task 8: Analytics Dashboard Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/analytics/page.tsx`

**Step 1: Create the analytics dashboard page**

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { FeatureDisabled } from "@/components/feature-disabled";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  BarChart3,
  CreditCard,
  FileText,
  Mail,
  Users,
} from "lucide-react";

function DateRangePicker({
  value,
  onChange,
}: {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}) {
  const presets = [
    { label: "Today", days: 0 },
    { label: "This Week", days: 7 },
    { label: "This Month", days: 30 },
    { label: "This Term", days: 90 },
  ];

  return (
    <div className="flex gap-2">
      {presets.map((preset) => {
        const start = new Date();
        start.setDate(start.getDate() - preset.days);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange({ start, end })}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryCards({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = trpc.analytics.getDashboardSummary.useQuery({
    schoolId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={`summary-skeleton-${i}`} className="h-28" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Attendance Today",
      value: data?.attendanceToday ?? 0,
      icon: Users,
      label: "present",
    },
    {
      title: "Unread Messages",
      value: data?.unreadMessages ?? 0,
      icon: Mail,
      label: "unread",
    },
    {
      title: "Outstanding Payments",
      value: data?.outstandingPayments ?? 0,
      icon: CreditCard,
      label: "pending",
    },
    {
      title: "Pending Forms",
      value: data?.pendingForms ?? 0,
      icon: FileText,
      label: "awaiting response",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceSection({
  schoolId,
  dateRange,
}: {
  schoolId: string;
  dateRange: { start: Date; end: Date };
}) {
  const { data, isLoading } = trpc.analytics.getAttendanceSummary.useQuery({
    schoolId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  if (isLoading) return <Skeleton className="h-64" />;

  const markColors: Record<string, string> = {
    PRESENT: "bg-green-500",
    LATE: "bg-yellow-500",
    ABSENT_AUTH: "bg-orange-500",
    ABSENT_UNAUTH: "bg-red-500",
    NOT_REQUIRED: "bg-gray-300",
  };

  const markLabels: Record<string, string> = {
    PRESENT: "Present",
    LATE: "Late",
    ABSENT_AUTH: "Authorised Absence",
    ABSENT_UNAUTH: "Unauthorised Absence",
    NOT_REQUIRED: "Not Required",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">
            {data?.attendanceRate ?? 0}%
          </div>
          <p className="text-sm text-muted-foreground">
            {data?.totalRecords ?? 0} total records
          </p>
        </div>
        <div className="space-y-2">
          {data?.breakdown.map((row) => (
            <div key={row.mark} className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${markColors[row.mark] ?? "bg-gray-300"}`} />
              <span className="text-sm flex-1">
                {markLabels[row.mark] ?? row.mark}
              </span>
              <span className="text-sm font-medium">{row.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentSection({
  schoolId,
  dateRange,
}: {
  schoolId: string;
  dateRange: { start: Date; end: Date };
}) {
  const { data, isLoading } = trpc.analytics.getPaymentSummary.useQuery({
    schoolId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const totalPounds = ((data?.totalCollectedPence ?? 0) / 100).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <div className="text-3xl font-bold">£{totalPounds}</div>
          <p className="text-sm text-muted-foreground">collected this period</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {data?.outstandingCount ?? 0} outstanding items
        </div>
      </CardContent>
    </Card>
  );
}

function MessageSection({
  schoolId,
  dateRange,
}: {
  schoolId: string;
  dateRange: { start: Date; end: Date };
}) {
  const { data, isLoading } = trpc.analytics.getMessageEngagement.useQuery({
    schoolId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <div className="text-3xl font-bold">{data?.readRate ?? 0}%</div>
          <p className="text-sm text-muted-foreground">read rate</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {data?.totalSent ?? 0} sent · {data?.totalRead ?? 0} read
        </div>
      </CardContent>
    </Card>
  );
}

function FormSection({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = trpc.analytics.getFormCompletion.useQuery({
    schoolId,
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Forms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No forms created yet.</p>
          )}
          {data?.map((form) => (
            <div key={form.id} className="flex items-center justify-between">
              <span className="text-sm truncate flex-1">{form.title}</span>
              <span className="text-sm font-medium ml-2">
                {form.responseCount} responses
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const features = useFeatureToggles();
  const { data: session } = trpc.auth.getSession.useQuery();
  const isAdmin =
    !!session?.staffRole &&
    session.staffRole === "ADMIN" &&
    !!session?.schoolId;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState({
    start: weekAgo,
    end: today,
  });

  if (!features.analyticsEnabled) {
    return <FeatureDisabled featureName="Analytics" />;
  }

  if (!isAdmin || !session?.schoolId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Analytics is only available to school administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            School performance overview
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <SummaryCards schoolId={session.schoolId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttendanceSection
          schoolId={session.schoolId}
          dateRange={dateRange}
        />
        <PaymentSection
          schoolId={session.schoolId}
          dateRange={dateRange}
        />
        <MessageSection
          schoolId={session.schoolId}
          dateRange={dateRange}
        />
        <FormSection schoolId={session.schoolId} />
      </div>
    </div>
  );
}
```

**Step 2: Verify the page renders (manual check or Playwright later)**

Run: `npx pnpm dev` and navigate to `http://localhost:3000/dashboard/analytics`

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/analytics/page.tsx
git commit -m "feat: add analytics dashboard page with attendance, payment, message, and form sections"
```

---

## Task 9: Wellbeing Router — Check-In CRUD

**Files:**
- Create: `apps/api/src/router/wellbeing.ts`
- Test: `apps/api/src/__tests__/wellbeing.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
  getCachedStaffMembership: vi.fn().mockResolvedValue(null),
  setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

function createTestContext(overrides?: Record<string, any>): any {
  return {
    prisma: {
      school: {
        findUnique: vi.fn().mockResolvedValue({
          messagingEnabled: true,
          paymentsEnabled: true,
          attendanceEnabled: true,
          calendarEnabled: true,
          formsEnabled: true,
          translationEnabled: false,
          parentsEveningEnabled: false,
          wellbeingEnabled: true,
          emergencyCommsEnabled: false,
          analyticsEnabled: false,
          paymentDinnerMoneyEnabled: true,
          paymentTripsEnabled: true,
          paymentClubsEnabled: true,
          paymentUniformEnabled: true,
          paymentOtherEnabled: true,
        }),
      },
      wellbeingCheckIn: {
        upsert: vi.fn().mockResolvedValue({
          id: "checkin-1",
          childId: "child-1",
          mood: "GOOD",
          date: new Date("2026-02-27"),
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      wellbeingAlert: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: "alert-1", status: "ACKNOWLEDGED" }),
        create: vi.fn().mockResolvedValue({ id: "alert-1" }),
      },
      parentChild: {
        findFirst: vi.fn().mockResolvedValue({
          parentId: "user-1",
          childId: "child-1",
        }),
      },
      child: {
        findUnique: vi.fn().mockResolvedValue({
          id: "child-1",
          schoolId: "school-1",
        }),
      },
      staffMember: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-1",
          schoolId: "school-1",
          role: "TEACHER",
        }),
      },
    },
    user: { id: "user-1", name: "Test User" },
    session: { id: "session-1" },
    ...overrides,
  };
}

describe("wellbeing router", () => {
  describe("submitCheckIn", () => {
    it("creates a check-in for a child", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.wellbeing.submitCheckIn({
        childId: "child-1",
        mood: "GOOD",
        note: "Had a good day",
      });

      expect(result).toHaveProperty("id");
      expect(ctx.prisma.wellbeingCheckIn.upsert).toHaveBeenCalled();
    });
  });

  describe("getCheckIns", () => {
    it("returns check-ins for a child in date range", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.wellbeing.getCheckIns({
        childId: "child-1",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-02-28"),
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getAlerts", () => {
    it("returns open alerts for a school", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.wellbeing.getAlerts({
        schoolId: "school-1",
        status: "OPEN",
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("acknowledgeAlert", () => {
    it("updates alert status to acknowledged", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.wellbeing.acknowledgeAlert({
        schoolId: "school-1",
        alertId: "alert-1",
      });

      expect(result.status).toBe("ACKNOWLEDGED");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/wellbeing.test.ts`
Expected: FAIL.

**Step 3: Write the wellbeing router**

Create `apps/api/src/router/wellbeing.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const wellbeingRouter = router({
  submitCheckIn: protectedProcedure
    .input(
      z.object({
        childId: z.string(),
        mood: z.enum(["GREAT", "GOOD", "OK", "LOW", "STRUGGLING"]),
        note: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify parent owns this child
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: {
          parentId: ctx.user.id,
          childId: input.childId,
        },
      });

      if (!parentChild) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a parent of this child",
        });
      }

      const child = await ctx.prisma.child.findUnique({
        where: { id: input.childId },
      });

      if (!child) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkIn = await ctx.prisma.wellbeingCheckIn.upsert({
        where: {
          childId_date: {
            childId: input.childId,
            date: today,
          },
        },
        update: {
          mood: input.mood,
          note: input.note ?? null,
        },
        create: {
          childId: input.childId,
          schoolId: child.schoolId,
          mood: input.mood,
          note: input.note ?? null,
          checkedInBy: "PARENT",
          date: today,
        },
      });

      return checkIn;
    }),

  staffCheckIn: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        childId: z.string(),
        mood: z.enum(["GREAT", "GOOD", "OK", "LOW", "STRUGGLING"]),
        note: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "wellbeing");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkIn = await ctx.prisma.wellbeingCheckIn.upsert({
        where: {
          childId_date: {
            childId: input.childId,
            date: today,
          },
        },
        update: {
          mood: input.mood,
          note: input.note ?? null,
        },
        create: {
          childId: input.childId,
          schoolId: input.schoolId,
          mood: input.mood,
          note: input.note ?? null,
          checkedInBy: "STAFF",
          date: today,
        },
      });

      return checkIn;
    }),

  getCheckIns: protectedProcedure
    .input(
      z.object({
        childId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify access (parent or staff)
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: {
          parentId: ctx.user.id,
          childId: input.childId,
        },
      });

      if (!parentChild) {
        // Check if staff at the child's school
        const child = await ctx.prisma.child.findUnique({
          where: { id: input.childId },
        });
        if (child) {
          const staff = await ctx.prisma.staffMember.findUnique({
            where: {
              userId_schoolId: {
                userId: ctx.user.id,
                schoolId: child.schoolId,
              },
            },
          });
          if (!staff) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No access to this child",
            });
          }
        }
      }

      return ctx.prisma.wellbeingCheckIn.findMany({
        where: {
          childId: input.childId,
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        orderBy: { date: "desc" },
      });
    }),

  getClassOverview: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        date: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "wellbeing");

      const targetDate = input.date ?? new Date();
      targetDate.setHours(0, 0, 0, 0);

      const checkIns = await ctx.prisma.wellbeingCheckIn.findMany({
        where: {
          schoolId: input.schoolId,
          date: targetDate,
        },
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              yearGroup: true,
            },
          },
        },
        orderBy: { child: { lastName: "asc" } },
      });

      return checkIns;
    }),

  getAlerts: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "wellbeing");

      return ctx.prisma.wellbeingAlert.findMany({
        where: {
          schoolId: input.schoolId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          child: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              yearGroup: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  acknowledgeAlert: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        alertId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "wellbeing");

      return ctx.prisma.wellbeingAlert.update({
        where: { id: input.alertId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedBy: ctx.user.id,
          acknowledgedAt: new Date(),
        },
      });
    }),

  resolveAlert: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        alertId: z.string(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "wellbeing");

      return ctx.prisma.wellbeingAlert.update({
        where: { id: input.alertId },
        data: {
          status: "RESOLVED",
          resolvedBy: ctx.user.id,
          resolvedAt: new Date(),
          note: input.note ?? null,
        },
      });
    }),

  createManualAlert: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        childId: z.string(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "wellbeing");

      return ctx.prisma.wellbeingAlert.create({
        data: {
          childId: input.childId,
          schoolId: input.schoolId,
          triggerRule: "MANUAL",
          note: input.note ?? null,
        },
      });
    }),
});
```

**Step 4: Register in router index**

Add to `apps/api/src/router/index.ts`:

```typescript
import { wellbeingRouter } from "./wellbeing";
// In router({}):
wellbeing: wellbeingRouter,
```

**Step 5: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/wellbeing.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/router/wellbeing.ts apps/api/src/__tests__/wellbeing.test.ts apps/api/src/router/index.ts
git commit -m "feat: add wellbeing router with check-in, alerts, and class overview"
```

---

## Task 10: Wellbeing Alert Cron Job

**Files:**
- Create: `apps/api/src/crons/wellbeing-alerts.ts`
- Modify: `apps/api/src/index.ts` (register cron)

**Step 1: Write the alert generation logic**

Create `apps/api/src/crons/wellbeing-alerts.ts`:

```typescript
import { PrismaClient } from "@schoolconnect/db";
import { logger } from "../lib/logger";

const MOOD_VALUES: Record<string, number> = {
  GREAT: 5,
  GOOD: 4,
  OK: 3,
  LOW: 2,
  STRUGGLING: 1,
};

export async function processWellbeingAlerts(prisma: PrismaClient) {
  const schools = await prisma.school.findMany({
    where: { wellbeingEnabled: true },
    select: { id: true },
  });

  for (const school of schools) {
    await processSchoolAlerts(prisma, school.id);
  }
}

async function processSchoolAlerts(prisma: PrismaClient, schoolId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all children with check-ins in the last 7 days
  const recentCheckIns = await prisma.wellbeingCheckIn.findMany({
    where: {
      schoolId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: "desc" },
  });

  // Group by child
  const byChild = new Map<string, typeof recentCheckIns>();
  for (const ci of recentCheckIns) {
    const existing = byChild.get(ci.childId) ?? [];
    existing.push(ci);
    byChild.set(ci.childId, existing);
  }

  for (const [childId, checkIns] of byChild) {
    // Rule: THREE_LOW_DAYS
    const lowDays = checkIns.filter(
      (ci) => ci.mood === "LOW" || ci.mood === "STRUGGLING",
    ).length;

    if (lowDays >= 3) {
      await createAlertIfNoCooldown(
        prisma,
        childId,
        schoolId,
        "THREE_LOW_DAYS",
        7,
      );
    }

    // Rule: MOOD_DROP (2+ level drop from 7-day average)
    if (checkIns.length >= 2) {
      const avgMood =
        checkIns.reduce((sum, ci) => sum + (MOOD_VALUES[ci.mood] ?? 3), 0) /
        checkIns.length;
      const latestMood = MOOD_VALUES[checkIns[0].mood] ?? 3;

      if (avgMood - latestMood >= 2) {
        await createAlertIfNoCooldown(
          prisma,
          childId,
          schoolId,
          "MOOD_DROP",
          7,
        );
      }
    }
  }

  // Rule: FIVE_ABSENT_DAYS (30-day window)
  const absences = await prisma.attendanceRecord.groupBy({
    by: ["childId"],
    where: {
      schoolId,
      date: { gte: thirtyDaysAgo },
      mark: { in: ["ABSENT_AUTH", "ABSENT_UNAUTH"] },
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: 5 } },
    },
  });

  for (const absence of absences) {
    await createAlertIfNoCooldown(
      prisma,
      absence.childId,
      schoolId,
      "FIVE_ABSENT_DAYS",
      14,
    );
  }
}

async function createAlertIfNoCooldown(
  prisma: PrismaClient,
  childId: string,
  schoolId: string,
  triggerRule: "THREE_LOW_DAYS" | "FIVE_ABSENT_DAYS" | "MOOD_DROP",
  cooldownDays: number,
) {
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

  const recentAlert = await prisma.wellbeingAlert.findFirst({
    where: {
      childId,
      schoolId,
      triggerRule,
      createdAt: { gte: cooldownDate },
    },
  });

  if (recentAlert) return;

  await prisma.wellbeingAlert.create({
    data: {
      childId,
      schoolId,
      triggerRule,
    },
  });

  logger.info(
    { childId, schoolId, triggerRule },
    "Wellbeing alert created",
  );
}
```

**Step 2: Register cron in main server**

Add to `apps/api/src/index.ts` (alongside existing crons like SMS fallback):

```typescript
import { processWellbeingAlerts } from "./crons/wellbeing-alerts";

// After server starts, add interval (every 15 minutes)
setInterval(async () => {
  try {
    await processWellbeingAlerts(prisma);
  } catch (err) {
    logger.error(err, "Wellbeing alert cron failed");
  }
}, 15 * 60 * 1000);
```

**Step 3: Commit**

```bash
git add apps/api/src/crons/wellbeing-alerts.ts apps/api/src/index.ts
git commit -m "feat: add wellbeing alert cron with THREE_LOW_DAYS, MOOD_DROP, FIVE_ABSENT_DAYS rules"
```

---

## Task 11: Wellbeing Dashboard Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/wellbeing/page.tsx`

**Step 1: Create the wellbeing page**

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureDisabled } from "@/components/feature-disabled";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Heart, AlertTriangle, CheckCircle, SmilePlus } from "lucide-react";

const MOOD_EMOJI: Record<string, string> = {
  GREAT: "😄",
  GOOD: "🙂",
  OK: "😐",
  LOW: "😟",
  STRUGGLING: "😢",
};

const MOOD_COLORS: Record<string, string> = {
  GREAT: "bg-green-100 text-green-800",
  GOOD: "bg-emerald-100 text-emerald-800",
  OK: "bg-yellow-100 text-yellow-800",
  LOW: "bg-orange-100 text-orange-800",
  STRUGGLING: "bg-red-100 text-red-800",
};

const ALERT_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800",
  ACKNOWLEDGED: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
};

function ParentCheckIn() {
  const { data: children } = trpc.user.listChildren.useQuery();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const submitMutation = trpc.wellbeing.submitCheckIn.useMutation({
    onSuccess: () => {
      setSelectedMood(null);
      setNote("");
    },
  });

  const childId = selectedChild ?? children?.[0]?.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: checkIns } = trpc.wellbeing.getCheckIns.useQuery(
    {
      childId: childId ?? "",
      startDate: thirtyDaysAgo,
      endDate: today,
    },
    { enabled: !!childId },
  );

  if (!children?.length) {
    return <p className="text-muted-foreground">No children found.</p>;
  }

  return (
    <div className="space-y-6">
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => setSelectedChild(child.id)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                (childId === child.id)
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {child.firstName}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SmilePlus className="h-5 w-5" />
            How is {children.find((c) => c.id === childId)?.firstName} feeling today?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            {Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
              <button
                key={mood}
                type="button"
                onClick={() => setSelectedMood(mood)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
                  selectedMood === mood
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-muted"
                }`}
              >
                <span className="text-3xl">{emoji}</span>
                <span className="text-xs capitalize">{mood.toLowerCase()}</span>
              </button>
            ))}
          </div>
          {selectedMood && (
            <div className="space-y-3">
              <textarea
                placeholder="Optional note (max 200 characters)"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border p-2 text-sm resize-none"
                rows={2}
              />
              <button
                type="button"
                onClick={() => {
                  if (childId && selectedMood) {
                    submitMutation.mutate({
                      childId,
                      mood: selectedMood as "GREAT" | "GOOD" | "OK" | "LOW" | "STRUGGLING",
                      note: note || undefined,
                    });
                  }
                }}
                disabled={submitMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checkIns?.length === 0 && (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            )}
            {checkIns?.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <span className="text-xl">{MOOD_EMOJI[ci.mood]}</span>
                <div className="flex-1">
                  <Badge className={MOOD_COLORS[ci.mood]}>
                    {ci.mood.toLowerCase()}
                  </Badge>
                  {ci.note && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {ci.note}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(ci.date).toLocaleDateString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffView({ schoolId }: { schoolId: string }) {
  const { data: overview, isLoading: overviewLoading } =
    trpc.wellbeing.getClassOverview.useQuery({ schoolId });

  const { data: alerts, isLoading: alertsLoading } =
    trpc.wellbeing.getAlerts.useQuery({ schoolId, status: "OPEN" });

  const acknowledgeMutation = trpc.wellbeing.acknowledgeAlert.useMutation();
  const resolveMutation = trpc.wellbeing.resolveAlert.useMutation();

  if (overviewLoading || alertsLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {alerts && alerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Open Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 rounded-md border border-red-100 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {alert.child.firstName} {alert.child.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {alert.child.yearGroup} · {alert.triggerRule.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                  <Badge className={ALERT_STATUS_COLORS[alert.status]}>
                    {alert.status.toLowerCase()}
                  </Badge>
                  <div className="flex gap-2">
                    {alert.status === "OPEN" && (
                      <button
                        type="button"
                        onClick={() =>
                          acknowledgeMutation.mutate({
                            schoolId,
                            alertId: alert.id,
                          })
                        }
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        Acknowledge
                      </button>
                    )}
                    {(alert.status === "OPEN" ||
                      alert.status === "ACKNOWLEDGED") && (
                      <button
                        type="button"
                        onClick={() =>
                          resolveMutation.mutate({
                            schoolId,
                            alertId: alert.id,
                          })
                        }
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Today's Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overview?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No check-ins submitted today.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {overview?.map((ci) => (
              <div
                key={ci.id}
                className={`flex flex-col items-center rounded-md border p-2 ${MOOD_COLORS[ci.mood]}`}
              >
                <span className="text-2xl">{MOOD_EMOJI[ci.mood]}</span>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">
                  {ci.child.firstName} {ci.child.lastName.charAt(0)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WellbeingPage() {
  const features = useFeatureToggles();
  const { data: session } = trpc.auth.getSession.useQuery();
  const isStaff = !!session?.staffRole && !!session?.schoolId;

  if (!features.wellbeingEnabled) {
    return <FeatureDisabled featureName="Wellbeing Check-ins" />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Wellbeing</h1>
        <p className="text-muted-foreground">
          {isStaff ? "Class wellbeing overview" : "Daily mood check-in"}
        </p>
      </div>

      {isStaff && session.schoolId ? (
        <StaffView schoolId={session.schoolId} />
      ) : (
        <ParentCheckIn />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/wellbeing/page.tsx
git commit -m "feat: add wellbeing dashboard page with parent check-in and staff overview"
```

---

## Task 12: Emergency Router

**Files:**
- Create: `apps/api/src/router/emergency.ts`
- Test: `apps/api/src/__tests__/emergency.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
  getCachedStaffMembership: vi.fn().mockResolvedValue(null),
  setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/notification", () => ({
  notificationService: {
    getInstance: vi.fn().mockReturnValue({
      sendPush: vi.fn().mockResolvedValue({ success: true, count: 1 }),
    }),
  },
}));

function createTestContext(overrides?: Record<string, any>): any {
  return {
    prisma: {
      school: {
        findUnique: vi.fn().mockResolvedValue({
          id: "school-1",
          name: "Test School",
          messagingEnabled: true,
          paymentsEnabled: true,
          attendanceEnabled: true,
          calendarEnabled: true,
          formsEnabled: true,
          translationEnabled: false,
          parentsEveningEnabled: false,
          wellbeingEnabled: false,
          emergencyCommsEnabled: true,
          analyticsEnabled: false,
          paymentDinnerMoneyEnabled: true,
          paymentTripsEnabled: true,
          paymentClubsEnabled: true,
          paymentUniformEnabled: true,
          paymentOtherEnabled: true,
        }),
      },
      emergencyAlert: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "alert-1",
          type: "LOCKDOWN",
          status: "ACTIVE",
          title: "Lockdown in Effect",
        }),
        update: vi.fn().mockResolvedValue({
          id: "alert-1",
          status: "ALL_CLEAR",
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      emergencyUpdate: {
        create: vi.fn().mockResolvedValue({
          id: "update-1",
          message: "Stay calm",
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      staffMember: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-1",
          schoolId: "school-1",
          role: "ADMIN",
        }),
      },
    },
    user: { id: "user-1", name: "Admin User" },
    session: { id: "session-1" },
    ...overrides,
  };
}

describe("emergency router", () => {
  describe("initiateAlert", () => {
    it("creates an emergency alert", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emergency.initiateAlert({
        schoolId: "school-1",
        type: "LOCKDOWN",
        message: "Please stay indoors",
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("ACTIVE");
      expect(ctx.prisma.emergencyAlert.create).toHaveBeenCalled();
    });

    it("rejects if active alert exists", async () => {
      const ctx = createTestContext();
      ctx.prisma.emergencyAlert.findFirst.mockResolvedValue({
        id: "existing",
        status: "ACTIVE",
      });
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.emergency.initiateAlert({
          schoolId: "school-1",
          type: "LOCKDOWN",
        }),
      ).rejects.toThrow();
    });
  });

  describe("getActiveAlert", () => {
    it("returns null when no active alert", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emergency.getActiveAlert({
        schoolId: "school-1",
      });

      expect(result).toBeNull();
    });
  });

  describe("resolveAlert", () => {
    it("resolves an active alert", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.emergency.resolveAlert({
        schoolId: "school-1",
        alertId: "alert-1",
        status: "ALL_CLEAR",
      });

      expect(result.status).toBe("ALL_CLEAR");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/emergency.test.ts`
Expected: FAIL.

**Step 3: Write the emergency router**

Create `apps/api/src/router/emergency.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { logger } from "../lib/logger";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

const EMERGENCY_TITLES: Record<string, string> = {
  LOCKDOWN: "Lockdown in Effect",
  EVACUATION: "Evacuation in Progress",
  SHELTER_IN_PLACE: "Shelter in Place",
  MEDICAL: "Medical Emergency",
  OTHER: "Emergency Alert",
};

export const emergencyRouter = router({
  initiateAlert: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        type: z.enum([
          "LOCKDOWN",
          "EVACUATION",
          "SHELTER_IN_PLACE",
          "MEDICAL",
          "OTHER",
        ]),
        message: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "emergencyComms");

      // Check no active alert exists
      const activeAlert = await ctx.prisma.emergencyAlert.findFirst({
        where: {
          schoolId: input.schoolId,
          status: "ACTIVE",
        },
      });

      if (activeAlert) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "An emergency alert is already active. Resolve it before creating a new one.",
        });
      }

      const alert = await ctx.prisma.emergencyAlert.create({
        data: {
          schoolId: input.schoolId,
          type: input.type,
          title: EMERGENCY_TITLES[input.type],
          message: input.message ?? null,
          initiatedBy: ctx.user.id,
        },
      });

      logger.warn(
        { alertId: alert.id, schoolId: input.schoolId, type: input.type },
        "Emergency alert initiated",
      );

      // TODO: Fan out push/SMS/email notifications via notificationService
      // This should use the existing NotificationDelivery infrastructure
      // with URGENT priority to bypass quiet hours

      return alert;
    }),

  getActiveAlert: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "emergencyComms");

      return ctx.prisma.emergencyAlert.findFirst({
        where: {
          schoolId: input.schoolId,
          status: "ACTIVE",
        },
        include: {
          updates: {
            orderBy: { createdAt: "asc" },
          },
          initiator: {
            select: { name: true },
          },
        },
      });
    }),

  postUpdate: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        alertId: z.string(),
        message: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "emergencyComms");

      const update = await ctx.prisma.emergencyUpdate.create({
        data: {
          alertId: input.alertId,
          message: input.message,
          postedBy: ctx.user.id,
        },
      });

      logger.info(
        { alertId: input.alertId, updateId: update.id },
        "Emergency update posted",
      );

      // TODO: Send push notification with update to all parents

      return update;
    }),

  resolveAlert: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        alertId: z.string(),
        status: z.enum(["ALL_CLEAR", "CANCELLED"]),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "emergencyComms");

      if (input.status === "CANCELLED" && !input.reason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A reason is required when cancelling an alert.",
        });
      }

      const alert = await ctx.prisma.emergencyAlert.update({
        where: { id: input.alertId },
        data: {
          status: input.status,
          resolvedBy: ctx.user.id,
          resolvedAt: new Date(),
        },
      });

      logger.info(
        {
          alertId: input.alertId,
          status: input.status,
          resolvedBy: ctx.user.id,
        },
        "Emergency alert resolved",
      );

      // TODO: Send "All Clear" / "Cancelled" notification to all parents

      return alert;
    }),

  getAlertHistory: schoolFeatureProcedure
    .input(
      z.object({
        schoolId: z.string(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "emergencyComms");

      const items = await ctx.prisma.emergencyAlert.findMany({
        where: { schoolId: input.schoolId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          initiator: { select: { name: true } },
          resolver: { select: { name: true } },
          _count: { select: { updates: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),
});
```

**Step 4: Register in router index**

Add to `apps/api/src/router/index.ts`:

```typescript
import { emergencyRouter } from "./emergency";
// In router({}):
emergency: emergencyRouter,
```

**Step 5: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/emergency.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/router/emergency.ts apps/api/src/__tests__/emergency.test.ts apps/api/src/router/index.ts
git commit -m "feat: add emergency router with alert initiation, updates, resolution, and history"
```

---

## Task 13: Emergency Dashboard Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/emergency/page.tsx`

**Step 1: Create the emergency page**

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureDisabled } from "@/components/feature-disabled";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";

const EMERGENCY_TYPE_LABELS: Record<string, string> = {
  LOCKDOWN: "Lockdown",
  EVACUATION: "Evacuation",
  SHELTER_IN_PLACE: "Shelter in Place",
  MEDICAL: "Medical Emergency",
  OTHER: "Emergency",
};

function ActiveAlert({ schoolId }: { schoolId: string }) {
  const { data: alert, isLoading } = trpc.emergency.getActiveAlert.useQuery(
    { schoolId },
    { refetchInterval: 10000 }, // Poll every 10s during active alert
  );

  const [updateMessage, setUpdateMessage] = useState("");

  const postUpdateMutation = trpc.emergency.postUpdate.useMutation({
    onSuccess: () => setUpdateMessage(""),
  });

  const resolveMutation = trpc.emergency.resolveAlert.useMutation();

  if (isLoading) return <Skeleton className="h-48" />;

  if (!alert) return null;

  return (
    <Card className="border-red-500 border-2 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-6 w-6 animate-pulse" />
          {alert.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alert.message && (
          <p className="text-sm font-medium">{alert.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Initiated by {alert.initiator.name} at{" "}
          {new Date(alert.createdAt).toLocaleTimeString("en-GB")}
        </p>

        {alert.updates.length > 0 && (
          <div className="space-y-2 border-l-2 border-red-300 pl-3">
            {alert.updates.map((update) => (
              <div key={update.id}>
                <p className="text-sm">{update.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(update.createdAt).toLocaleTimeString("en-GB")}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Post an update..."
            maxLength={500}
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            className="flex-1 rounded-md border p-2 text-sm"
          />
          <button
            type="button"
            onClick={() =>
              postUpdateMutation.mutate({
                schoolId,
                alertId: alert.id,
                message: updateMessage,
              })
            }
            disabled={!updateMessage.trim() || postUpdateMutation.isPending}
            className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            Post
          </button>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={() =>
              resolveMutation.mutate({
                schoolId,
                alertId: alert.id,
                status: "ALL_CLEAR",
              })
            }
            disabled={resolveMutation.isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="inline h-4 w-4 mr-1" />
            All Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const reason = prompt("Reason for cancellation:");
              if (reason) {
                resolveMutation.mutate({
                  schoolId,
                  alertId: alert.id,
                  status: "CANCELLED",
                  reason,
                });
              }
            }}
            disabled={resolveMutation.isPending}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Cancel Alert
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function InitiateAlert({ schoolId }: { schoolId: string }) {
  const [type, setType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  const initiateMutation = trpc.emergency.initiateAlert.useMutation({
    onSuccess: () => {
      setType("");
      setMessage("");
      setConfirming(false);
    },
  });

  const types = [
    "LOCKDOWN",
    "EVACUATION",
    "SHELTER_IN_PLACE",
    "MEDICAL",
    "OTHER",
  ];

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Shield className="h-5 w-5" />
          Initiate Emergency Alert
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md border p-3 text-sm font-medium transition-colors ${
                type === t
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "hover:bg-muted"
              }`}
            >
              {EMERGENCY_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {type && (
          <>
            <textarea
              placeholder="Optional message to parents (max 500 characters)"
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border p-2 text-sm resize-none"
              rows={2}
            />

            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Send Alert
              </button>
            ) : (
              <div className="rounded-md border-2 border-red-500 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700 mb-3">
                  This will immediately notify ALL parents at the school via
                  push, SMS, and email. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      initiateMutation.mutate({
                        schoolId,
                        type: type as "LOCKDOWN" | "EVACUATION" | "SHELTER_IN_PLACE" | "MEDICAL" | "OTHER",
                        message: message || undefined,
                      })
                    }
                    disabled={initiateMutation.isPending}
                    className="rounded-md bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {initiateMutation.isPending
                      ? "Sending..."
                      : "CONFIRM — Send Alert Now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AlertHistory({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = trpc.emergency.getAlertHistory.useQuery({
    schoolId,
    limit: 10,
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-red-100 text-red-800",
    ALL_CLEAR: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Alert History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No previous emergency alerts.
          </p>
        )}
        <div className="space-y-2">
          {data?.items.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {EMERGENCY_TYPE_LABELS[alert.type]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.createdAt).toLocaleDateString("en-GB")}{" "}
                  {new Date(alert.createdAt).toLocaleTimeString("en-GB")} ·{" "}
                  {alert.initiator.name} · {alert._count.updates} updates
                </p>
              </div>
              <Badge className={statusColors[alert.status]}>
                {alert.status.replace("_", " ").toLowerCase()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmergencyPage() {
  const features = useFeatureToggles();
  const { data: session } = trpc.auth.getSession.useQuery();
  const isStaff = !!session?.staffRole && !!session?.schoolId;

  if (!features.emergencyCommsEnabled) {
    return <FeatureDisabled featureName="Emergency Communications" />;
  }

  if (!isStaff || !session?.schoolId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Emergency communications is only available to staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Emergency Communications</h1>
        <p className="text-muted-foreground">
          Alert all parents immediately during critical incidents
        </p>
      </div>

      <ActiveAlert schoolId={session.schoolId} />
      <InitiateAlert schoolId={session.schoolId} />
      <AlertHistory schoolId={session.schoolId} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/emergency/page.tsx
git commit -m "feat: add emergency communications page with alert initiation, updates, and history"
```

---

## Task 14: Add Nav Links for New Pages

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx`

**Step 1: Add navigation items for new features**

Add these nav items to the staff navigation section in the dashboard layout. The nav items should be conditionally shown based on feature toggles:

For **staff** navigation, add:
```typescript
// After existing staff nav items, conditionally:
{ name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
{ name: "Wellbeing", href: "/dashboard/wellbeing", icon: Heart },
{ name: "Emergency", href: "/dashboard/emergency", icon: Shield },
```

For **parent** navigation, add:
```typescript
// Wellbeing check-in for parents:
{ name: "Wellbeing", href: "/dashboard/wellbeing", icon: Heart },
```

Import the new icons from `lucide-react`:
```typescript
import { BarChart3, Heart, Shield } from "lucide-react";
```

Wrap each in a feature toggle check using the `useFeatureToggles` hook — only show the nav item if the corresponding toggle is enabled.

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: add nav links for analytics, wellbeing, and emergency pages"
```

---

## Task 15: Update Admin Settings — Feature Toggles UI

**Files:**
- Modify: `apps/web/src/app/dashboard/admin/page.tsx` (or relevant admin settings component)

**Step 1: Add toggle controls for new features**

In the admin page's feature management section, add toggle switches for:
- `wellbeingEnabled` — "Wellbeing Check-ins"
- `emergencyCommsEnabled` — "Emergency Communications"
- `analyticsEnabled` — "Admin Analytics" (may already exist)

Follow the existing toggle pattern used for `messagingEnabled`, `paymentsEnabled`, etc.

**Step 2: Add branding section**

Add a "School Branding" card to admin settings with:
- Logo upload (file input, max 2MB PNG/JPG)
- Brand colour picker (hex input with colour preview)
- Secondary colour picker
- School motto text input
- Font dropdown (DEFAULT, ARIAL, TIMES_NEW_ROMAN, GEORGIA, VERDANA, COMIC_SANS, OPEN_SANS, ROBOTO, LATO, MONTSERRAT)

Create a tRPC mutation `settings.updateBranding` to save these fields.

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/admin/page.tsx apps/api/src/router/settings.ts
git commit -m "feat: add Phase 3A feature toggles and branding settings to admin page"
```

---

## Task 16: Update Seed Data

**Files:**
- Modify: `packages/db/prisma/seed.ts`

**Step 1: Add Phase 3A seed data**

Add to the school upsert:
```typescript
wellbeingEnabled: true,
emergencyCommsEnabled: true,
analyticsEnabled: true,
brandColor: "#1E3A5F",
brandFont: "DEFAULT",
```

Add sample wellbeing check-ins:
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

for (const child of [child1, child2]) {
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const moods = ["GREAT", "GOOD", "OK", "LOW", "GOOD"];
    await prisma.wellbeingCheckIn.upsert({
      where: {
        childId_date: { childId: child.id, date },
      },
      update: {},
      create: {
        childId: child.id,
        schoolId: school.id,
        mood: moods[i] as any,
        checkedInBy: "PARENT",
        date,
      },
    });
  }
}
```

**Step 2: Test seed**

Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:seed`
Expected: "Seed data created successfully"

**Step 3: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat: add Phase 3A seed data for wellbeing check-ins and feature toggles"
```

---

## Task 17: Run Full Test Suite

**Step 1: Run API tests**

Run: `cd apps/api && npx vitest run`
Expected: All tests pass (including new analytics, wellbeing, emergency tests).

**Step 2: Run lint**

Run: `npx pnpm lint`
Expected: No errors (fix any Biome issues).

**Step 3: Run build**

Run: `npx pnpm build`
Expected: Build succeeds for all packages.

**Step 4: Fix any failures and commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from Phase 3A implementation"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Feature toggles + branding on School | schema.prisma |
| 2 | AnalyticsSnapshot model | schema.prisma |
| 3 | Wellbeing models + enums | schema.prisma |
| 4 | Emergency models + enums | schema.prisma |
| 5 | Feature guards update | feature-guards.ts, trpc.ts |
| 6 | Web feature toggles update | feature-toggles.tsx |
| 7 | Analytics router + tests | analytics.ts, analytics.test.ts |
| 8 | Analytics dashboard page | analytics/page.tsx |
| 9 | Wellbeing router + tests | wellbeing.ts, wellbeing.test.ts |
| 10 | Wellbeing alert cron | wellbeing-alerts.ts, index.ts |
| 11 | Wellbeing dashboard page | wellbeing/page.tsx |
| 12 | Emergency router + tests | emergency.ts, emergency.test.ts |
| 13 | Emergency dashboard page | emergency/page.tsx |
| 14 | Nav links for new pages | layout.tsx |
| 15 | Admin settings toggles + branding | admin/page.tsx, settings.ts |
| 16 | Seed data | seed.ts |
| 17 | Full test suite + build | All |
