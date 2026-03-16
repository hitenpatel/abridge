# Phase 3B Implementation Plan: Daily Engagement

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Meal Booking & Dietary Management, Community Hub, and Digital Report Cards with branded PDF export to Abridge.

**Architecture:** Three new feature modules. Meal Booking links to existing Stripe payment flow (`DINNER_MONEY` category). Community Hub is standalone with post-moderation and volunteer signups. Report Cards use `@react-pdf/renderer` for server-side branded PDF generation using the school branding fields added in Phase 3A.

**Tech Stack:** Prisma (schema), tRPC (routers), Zod (validation), Next.js App Router (pages), Tailwind + shadcn/ui (UI), Vitest (API tests), Playwright (E2E), `@react-pdf/renderer` (PDF generation).

**Build Order:** Meal Booking → Community Hub → Digital Report Cards (payments first since infra exists, standalone features next, PDF complexity last).

**Prerequisite:** Phase 3A must be completed (school branding fields on `School` model required for Report Card PDFs).

---

## Task 1: Schema — Feature Toggles for Phase 3B

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (School model)

**Step 1: Add new feature toggle fields to School model**

```prisma
  // Phase 3B feature toggles
  mealBookingEnabled        Boolean  @default(false)
  reportCardsEnabled        Boolean  @default(false)
  communityHubEnabled       Boolean  @default(false)
```

Also add `communityTags` for custom community tag configuration:

```prisma
  communityTags             String[] @default([])
```

**Step 2: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add Phase 3B feature toggles to School model"
```

---

## Task 2: Schema — Meal Booking Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
}

enum MealCategory {
  HOT_MAIN
  VEGETARIAN
  JACKET_POTATO
  SANDWICH
  DESSERT
}

enum MealBookingStatus {
  BOOKED
  CANCELLED
}

enum DietaryNeed {
  VEGETARIAN
  VEGAN
  HALAL
  KOSHER
  GLUTEN_FREE
  DAIRY_FREE
  OTHER
}
```

**Step 2: Add MealMenu model**

```prisma
model MealMenu {
  id           String       @id @default(cuid())
  schoolId     String
  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  weekStarting DateTime     @db.Date
  publishedAt  DateTime?
  createdBy    String
  creator      User         @relation("MealMenuCreator", fields: [createdBy], references: [id])
  createdAt    DateTime     @default(now())

  options      MealOption[]

  @@unique([schoolId, weekStarting])
  @@index([schoolId, weekStarting])
  @@map("meal_menu")
}
```

**Step 3: Add MealOption model**

```prisma
model MealOption {
  id           String       @id @default(cuid())
  menuId       String
  menu         MealMenu     @relation(fields: [menuId], references: [id], onDelete: Cascade)
  day          DayOfWeek
  name         String
  description  String?
  category     MealCategory
  allergens    String[]
  priceInPence Int
  available    Boolean      @default(true)
  sortOrder    Int          @default(0)
  createdAt    DateTime     @default(now())

  bookings     MealBooking[]

  @@index([menuId, day])
  @@map("meal_option")
}
```

**Step 4: Add MealBooking model**

```prisma
model MealBooking {
  id           String            @id @default(cuid())
  childId      String
  child        Child             @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId     String
  school       School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  mealOptionId String
  mealOption   MealOption        @relation(fields: [mealOptionId], references: [id], onDelete: Cascade)
  date         DateTime          @db.Date
  status       MealBookingStatus @default(BOOKED)
  bookedBy     String
  booker       User              @relation("MealBookingBooker", fields: [bookedBy], references: [id])
  createdAt    DateTime          @default(now())

  @@unique([childId, date])
  @@index([schoolId, date])
  @@map("meal_booking")
}
```

**Step 5: Add DietaryProfile model**

```prisma
model DietaryProfile {
  id           String        @id @default(cuid())
  childId      String        @unique
  child        Child         @relation(fields: [childId], references: [id], onDelete: Cascade)
  allergies    String[]
  dietaryNeeds DietaryNeed[]
  otherNotes   String?
  updatedAt    DateTime      @updatedAt
  createdAt    DateTime      @default(now())

  @@map("dietary_profile")
}
```

**Step 6: Add relations to School, Child, and User**

In `School`:
```prisma
  mealMenus    MealMenu[]
  mealBookings MealBooking[]
```

In `Child`:
```prisma
  mealBookings    MealBooking[]
  dietaryProfile  DietaryProfile?
```

In `User`:
```prisma
  mealMenusCreated  MealMenu[]    @relation("MealMenuCreator")
  mealBookingsMade  MealBooking[] @relation("MealBookingBooker")
```

**Step 7: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 8: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add MealMenu, MealOption, MealBooking, DietaryProfile models"
```

---

## Task 3: Schema — Community Hub Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum CommunityPostType {
  DISCUSSION
  EVENT
  VOLUNTEER_REQUEST
}

enum CommunityPostStatus {
  ACTIVE
  CLOSED
  REMOVED
}

enum CommunityCommentStatus {
  ACTIVE
  REMOVED
}
```

**Step 2: Add CommunityPost model**

```prisma
model CommunityPost {
  id            String               @id @default(cuid())
  schoolId      String
  school        School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  authorId      String
  author        User                 @relation("CommunityPostAuthor", fields: [authorId], references: [id])
  type          CommunityPostType
  title         String
  body          String
  tags          String[]
  imageUrls     String[]
  isPinned      Boolean              @default(false)
  status        CommunityPostStatus  @default(ACTIVE)
  removedBy     String?
  remover       User?                @relation("CommunityPostRemover", fields: [removedBy], references: [id])
  removedReason String?
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  comments       CommunityComment[]
  volunteerSlots VolunteerSlot[]

  @@index([schoolId, status, createdAt(sort: Desc)])
  @@map("community_post")
}
```

**Step 3: Add CommunityComment model**

```prisma
model CommunityComment {
  id       String                 @id @default(cuid())
  postId   String
  post     CommunityPost          @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId String
  author   User                   @relation("CommunityCommentAuthor", fields: [authorId], references: [id])
  body     String
  status   CommunityCommentStatus @default(ACTIVE)
  createdAt DateTime              @default(now())

  @@index([postId, createdAt])
  @@map("community_comment")
}
```

**Step 4: Add VolunteerSlot model**

```prisma
model VolunteerSlot {
  id          String        @id @default(cuid())
  postId      String
  post        CommunityPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  description String
  date        DateTime      @db.Date
  startTime   String
  endTime     String
  spotsTotal  Int
  spotsTaken  Int           @default(0)

  signups     VolunteerSignup[]

  @@index([postId])
  @@map("volunteer_slot")
}
```

**Step 5: Add VolunteerSignup model**

```prisma
model VolunteerSignup {
  id        String        @id @default(cuid())
  slotId    String
  slot      VolunteerSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation("VolunteerSignupUser", fields: [userId], references: [id])
  createdAt DateTime      @default(now())

  @@unique([slotId, userId])
  @@map("volunteer_signup")
}
```

**Step 6: Add relations to School and User**

In `School`:
```prisma
  communityPosts CommunityPost[]
```

In `User`:
```prisma
  communityPosts         CommunityPost[]    @relation("CommunityPostAuthor")
  communityPostsRemoved  CommunityPost[]    @relation("CommunityPostRemover")
  communityComments      CommunityComment[] @relation("CommunityCommentAuthor")
  volunteerSignups       VolunteerSignup[]  @relation("VolunteerSignupUser")
```

**Step 7: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 8: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add CommunityPost, CommunityComment, VolunteerSlot, VolunteerSignup models"
```

---

## Task 4: Schema — Report Card Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add enums**

```prisma
enum ReportCycleType {
  TERMLY
  HALF_TERMLY
  END_OF_YEAR
  MOCK
  CUSTOM
}

enum AssessmentModel {
  PRIMARY_DESCRIPTIVE
  SECONDARY_GRADES
}

enum ReportCycleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum PrimaryLevel {
  EMERGING
  DEVELOPING
  EXPECTED
  EXCEEDING
}

enum EffortLevel {
  OUTSTANDING
  GOOD
  SATISFACTORY
  NEEDS_IMPROVEMENT
}
```

**Step 2: Add ReportCycle model**

```prisma
model ReportCycle {
  id              String            @id @default(cuid())
  schoolId        String
  school          School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name            String
  type            ReportCycleType
  assessmentModel AssessmentModel
  publishDate     DateTime          @db.Date
  status          ReportCycleStatus @default(DRAFT)
  createdBy       String
  creator         User              @relation("ReportCycleCreator", fields: [createdBy], references: [id])
  createdAt       DateTime          @default(now())

  reportCards     ReportCard[]

  @@unique([schoolId, name])
  @@index([schoolId, status])
  @@map("report_cycle")
}
```

**Step 3: Add ReportCard model**

```prisma
model ReportCard {
  id             String      @id @default(cuid())
  cycleId        String
  cycle          ReportCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  childId        String
  child          Child       @relation(fields: [childId], references: [id], onDelete: Cascade)
  schoolId       String
  school         School      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  generalComment String?
  attendancePct  Float?
  createdAt      DateTime    @default(now())

  subjectGrades  SubjectGrade[]

  @@unique([cycleId, childId])
  @@index([childId])
  @@map("report_card")
}
```

**Step 4: Add SubjectGrade model**

```prisma
model SubjectGrade {
  id           String        @id @default(cuid())
  reportCardId String
  reportCard   ReportCard    @relation(fields: [reportCardId], references: [id], onDelete: Cascade)
  subject      String
  sortOrder    Int           @default(0)
  level        PrimaryLevel?
  effort       EffortLevel?
  currentGrade String?
  targetGrade  String?
  comment      String?
  createdAt    DateTime      @default(now())

  @@index([reportCardId])
  @@map("subject_grade")
}
```

**Step 5: Add relations to School, Child, and User**

In `School`:
```prisma
  reportCycles ReportCycle[]
  reportCards  ReportCard[]
```

In `Child`:
```prisma
  reportCards ReportCard[]
```

In `User`:
```prisma
  reportCyclesCreated ReportCycle[] @relation("ReportCycleCreator")
```

**Step 6: Generate and push**

Run: `npx pnpm --filter @schoolconnect/db db:generate`
Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push`

**Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add ReportCycle, ReportCard, SubjectGrade models"
```

---

## Task 5: Update Feature Guards + Web Toggles

**Files:**
- Modify: `apps/api/src/lib/feature-guards.ts`
- Modify: `apps/api/src/trpc.ts`
- Modify: `apps/web/src/lib/feature-toggles.tsx`

**Step 1: Add new feature names to feature-guards.ts**

```typescript
// Add to FeatureName type
| "mealBooking"
| "reportCards"
| "communityHub"

// Add to SchoolFeatures interface
mealBookingEnabled: boolean;
reportCardsEnabled: boolean;
communityHubEnabled: boolean;

// Add to featureFieldMap
mealBooking: "mealBookingEnabled",
reportCards: "reportCardsEnabled",
communityHub: "communityHubEnabled",

// Add to featureLabel
mealBooking: "Meal Booking",
reportCards: "Report Cards",
communityHub: "Community Hub",
```

**Step 2: Update schoolFeatureProcedure select in trpc.ts**

Add to the `select` object:
```typescript
mealBookingEnabled: true,
reportCardsEnabled: true,
communityHubEnabled: true,
```

**Step 3: Update web feature-toggles.tsx**

```typescript
// Add to FeatureToggles interface
mealBookingEnabled: boolean;
reportCardsEnabled: boolean;
communityHubEnabled: boolean;

// Add to defaultToggles
mealBookingEnabled: false,
reportCardsEnabled: false,
communityHubEnabled: false,
```

**Step 4: Commit**

```bash
git add apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts apps/web/src/lib/feature-toggles.tsx
git commit -m "feat: add Phase 3B feature guards for meal booking, report cards, community hub"
```

---

## Task 6: Meal Booking Router + Tests

**Files:**
- Create: `apps/api/src/router/meal-booking.ts`
- Create: `apps/api/src/__tests__/meal-booking.test.ts`

**Step 1: Write failing tests**

Create `apps/api/src/__tests__/meal-booking.test.ts`:

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
          messagingEnabled: true, paymentsEnabled: true, attendanceEnabled: true,
          calendarEnabled: true, formsEnabled: true, translationEnabled: false,
          parentsEveningEnabled: false, wellbeingEnabled: false,
          emergencyCommsEnabled: false, analyticsEnabled: false,
          mealBookingEnabled: true, reportCardsEnabled: false,
          communityHubEnabled: false,
          paymentDinnerMoneyEnabled: true, paymentTripsEnabled: true,
          paymentClubsEnabled: true, paymentUniformEnabled: true,
          paymentOtherEnabled: true,
        }),
      },
      mealMenu: {
        create: vi.fn().mockResolvedValue({ id: "menu-1", weekStarting: new Date("2026-03-02") }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          id: "menu-1", publishedAt: new Date(), options: [],
        }),
        update: vi.fn().mockResolvedValue({ id: "menu-1", publishedAt: new Date() }),
      },
      mealOption: {
        createMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
      mealBooking: {
        upsert: vi.fn().mockResolvedValue({ id: "booking-1", status: "BOOKED" }),
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      dietaryProfile: {
        upsert: vi.fn().mockResolvedValue({ id: "diet-1", allergies: ["Nuts"] }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      parentChild: {
        findFirst: vi.fn().mockResolvedValue({ parentId: "user-1", childId: "child-1" }),
      },
      child: {
        findUnique: vi.fn().mockResolvedValue({ id: "child-1", schoolId: "school-1" }),
      },
      staffMember: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-1", schoolId: "school-1", role: "ADMIN",
        }),
      },
    },
    user: { id: "user-1", name: "Test User" },
    session: { id: "session-1" },
    ...overrides,
  };
}

describe("meal booking router", () => {
  describe("createMenu", () => {
    it("creates a weekly menu", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mealBooking.createMenu({
        schoolId: "school-1",
        weekStarting: new Date("2026-03-02"),
        options: [
          { day: "MONDAY", name: "Chicken Pie", category: "HOT_MAIN", allergens: ["Cereals"], priceInPence: 250 },
          { day: "MONDAY", name: "Veggie Pasta", category: "VEGETARIAN", allergens: ["Cereals"], priceInPence: 250 },
        ],
      });

      expect(result).toHaveProperty("id");
      expect(ctx.prisma.mealMenu.create).toHaveBeenCalled();
    });
  });

  describe("bookMeal", () => {
    it("books a meal for a child", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mealBooking.bookMeal({
        childId: "child-1",
        mealOptionId: "option-1",
        date: new Date("2026-03-02"),
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("BOOKED");
    });
  });

  describe("updateDietaryProfile", () => {
    it("creates or updates a dietary profile", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mealBooking.updateDietaryProfile({
        childId: "child-1",
        allergies: ["Nuts", "Milk"],
        dietaryNeeds: ["VEGETARIAN"],
      });

      expect(result).toHaveProperty("id");
      expect(ctx.prisma.dietaryProfile.upsert).toHaveBeenCalled();
    });
  });

  describe("getKitchenSummary", () => {
    it("returns aggregated booking counts", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mealBooking.getKitchenSummary({
        schoolId: "school-1",
        date: new Date("2026-03-02"),
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/meal-booking.test.ts`
Expected: FAIL.

**Step 3: Write the meal booking router**

Create `apps/api/src/router/meal-booking.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

const UK_ALLERGENS = [
  "Celery", "Cereals", "Crustaceans", "Eggs", "Fish", "Lupin",
  "Milk", "Molluscs", "Mustard", "Nuts", "Peanuts", "Sesame", "Soya", "Sulphites",
] as const;

export const mealBookingRouter = router({
  createMenu: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      weekStarting: z.date(),
      options: z.array(z.object({
        day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
        name: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        category: z.enum(["HOT_MAIN", "VEGETARIAN", "JACKET_POTATO", "SANDWICH", "DESSERT"]),
        allergens: z.array(z.string()).default([]),
        priceInPence: z.number().int().min(0),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "mealBooking");

      const menu = await ctx.prisma.mealMenu.create({
        data: {
          schoolId: input.schoolId,
          weekStarting: input.weekStarting,
          createdBy: ctx.user.id,
        },
      });

      if (input.options.length > 0) {
        await ctx.prisma.mealOption.createMany({
          data: input.options.map((opt, idx) => ({
            menuId: menu.id,
            day: opt.day,
            name: opt.name,
            description: opt.description ?? null,
            category: opt.category,
            allergens: opt.allergens,
            priceInPence: opt.priceInPence,
            sortOrder: idx,
          })),
        });
      }

      return menu;
    }),

  publishMenu: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      menuId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "mealBooking");

      return ctx.prisma.mealMenu.update({
        where: { id: input.menuId },
        data: { publishedAt: new Date() },
      });
    }),

  getMenuForWeek: protectedProcedure
    .input(z.object({
      schoolId: z.string(),
      weekStarting: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.mealMenu.findUnique({
        where: {
          schoolId_weekStarting: {
            schoolId: input.schoolId,
            weekStarting: input.weekStarting,
          },
        },
        include: {
          options: {
            where: { available: true },
            orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
          },
        },
      });
    }),

  listMenus: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "mealBooking");

      return ctx.prisma.mealMenu.findMany({
        where: { schoolId: input.schoolId },
        orderBy: { weekStarting: "desc" },
        take: input.limit,
        include: { _count: { select: { options: true } } },
      });
    }),

  bookMeal: protectedProcedure
    .input(z.object({
      childId: z.string(),
      mealOptionId: z.string(),
      date: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: { parentId: ctx.user.id, childId: input.childId },
      });
      if (!parentChild) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a parent of this child" });
      }

      const child = await ctx.prisma.child.findUnique({ where: { id: input.childId } });
      if (!child) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Child not found" });
      }

      return ctx.prisma.mealBooking.upsert({
        where: { childId_date: { childId: input.childId, date: input.date } },
        update: { mealOptionId: input.mealOptionId, status: "BOOKED" },
        create: {
          childId: input.childId,
          schoolId: child.schoolId,
          mealOptionId: input.mealOptionId,
          date: input.date,
          bookedBy: ctx.user.id,
        },
      });
    }),

  cancelBooking: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.mealBooking.update({
        where: { id: input.bookingId },
        data: { status: "CANCELLED" },
      });
    }),

  getBookingsForChild: protectedProcedure
    .input(z.object({
      childId: z.string(),
      weekStarting: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const weekEnd = new Date(input.weekStarting);
      weekEnd.setDate(weekEnd.getDate() + 5);

      return ctx.prisma.mealBooking.findMany({
        where: {
          childId: input.childId,
          date: { gte: input.weekStarting, lt: weekEnd },
          status: "BOOKED",
        },
        include: { mealOption: true },
        orderBy: { date: "asc" },
      });
    }),

  updateDietaryProfile: protectedProcedure
    .input(z.object({
      childId: z.string(),
      allergies: z.array(z.string()).default([]),
      dietaryNeeds: z.array(z.enum([
        "VEGETARIAN", "VEGAN", "HALAL", "KOSHER", "GLUTEN_FREE", "DAIRY_FREE", "OTHER",
      ])).default([]),
      otherNotes: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: { parentId: ctx.user.id, childId: input.childId },
      });
      if (!parentChild) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a parent of this child" });
      }

      return ctx.prisma.dietaryProfile.upsert({
        where: { childId: input.childId },
        update: {
          allergies: input.allergies,
          dietaryNeeds: input.dietaryNeeds,
          otherNotes: input.otherNotes ?? null,
        },
        create: {
          childId: input.childId,
          allergies: input.allergies,
          dietaryNeeds: input.dietaryNeeds,
          otherNotes: input.otherNotes ?? null,
        },
      });
    }),

  getDietaryProfile: protectedProcedure
    .input(z.object({ childId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.dietaryProfile.findUnique({
        where: { childId: input.childId },
      });
    }),

  getKitchenSummary: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      date: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "mealBooking");

      return ctx.prisma.mealBooking.groupBy({
        by: ["mealOptionId"],
        where: {
          schoolId: input.schoolId,
          date: input.date,
          status: "BOOKED",
        },
        _count: { id: true },
      });
    }),

  toggleOptionAvailability: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      optionId: z.string(),
      available: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "mealBooking");

      return ctx.prisma.mealOption.update({
        where: { id: input.optionId },
        data: { available: input.available },
      });
    }),
});
```

**Step 4: Register in router index**

Add to `apps/api/src/router/index.ts`:

```typescript
import { mealBookingRouter } from "./meal-booking";
// In router({}):
mealBooking: mealBookingRouter,
```

**Step 5: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/meal-booking.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/router/meal-booking.ts apps/api/src/__tests__/meal-booking.test.ts apps/api/src/router/index.ts
git commit -m "feat: add meal booking router with menu CRUD, booking, dietary profiles, kitchen summary"
```

---

## Task 7: Meal Booking Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/meals/page.tsx`

**Step 1: Create the meal booking page**

Build a page with:

**Parent view:**
- Child selector (if multi-child)
- "Dietary Profile" card: form to set allergies (checkboxes for UK 14) + dietary needs + notes. Save via `mealBooking.updateDietaryProfile`.
- "This Week's Menu" card: display published menu grouped by day. Each meal option shows name, category badge, price, allergen warnings (red if child is allergic). "Book" button per option. One meal per child per day enforced.
- "Your Bookings" section: list of booked meals for the week with cancel button.

**Staff view:**
- "Create Menu" form: pick week → add options per day (name, category dropdown, allergens multi-select, price). Save via `mealBooking.createMenu`. Publish button.
- "Kitchen Dashboard" card: for selected date, show aggregated counts per meal option with total allergy flags. Uses `mealBooking.getKitchenSummary`.
- "Manage Menus" list: past menus with edit access.

Follow the existing page pattern: `"use client"`, feature toggle check with `FeatureDisabled`, role-based staff/parent split, `trpc` queries, shadcn/ui components, Skeleton loading states.

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/meals/page.tsx
git commit -m "feat: add meal booking page with parent ordering and staff kitchen dashboard"
```

---

## Task 8: Community Hub Router + Tests

**Files:**
- Create: `apps/api/src/router/community.ts`
- Create: `apps/api/src/__tests__/community.test.ts`

**Step 1: Write failing tests**

Create `apps/api/src/__tests__/community.test.ts`:

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
          messagingEnabled: true, paymentsEnabled: true, attendanceEnabled: true,
          calendarEnabled: true, formsEnabled: true, translationEnabled: false,
          parentsEveningEnabled: false, wellbeingEnabled: false,
          emergencyCommsEnabled: false, analyticsEnabled: false,
          mealBookingEnabled: false, reportCardsEnabled: false,
          communityHubEnabled: true,
          paymentDinnerMoneyEnabled: true, paymentTripsEnabled: true,
          paymentClubsEnabled: true, paymentUniformEnabled: true,
          paymentOtherEnabled: true,
        }),
      },
      communityPost: {
        create: vi.fn().mockResolvedValue({
          id: "post-1", type: "DISCUSSION", title: "Test Post", status: "ACTIVE",
        }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: "post-1", status: "REMOVED" }),
        count: vi.fn().mockResolvedValue(0),
      },
      communityComment: {
        create: vi.fn().mockResolvedValue({ id: "comment-1", body: "Great post!" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      volunteerSlot: {
        findUnique: vi.fn().mockResolvedValue({ id: "slot-1", spotsTotal: 4, spotsTaken: 1 }),
        update: vi.fn().mockResolvedValue({ id: "slot-1", spotsTaken: 2 }),
      },
      volunteerSignup: {
        create: vi.fn().mockResolvedValue({ id: "signup-1" }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      staffMember: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-1", schoolId: "school-1", role: "TEACHER",
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "user-1", createdAt: new Date("2025-01-01") }),
      },
    },
    user: { id: "user-1", name: "Test User", createdAt: new Date("2025-01-01") },
    session: { id: "session-1" },
    ...overrides,
  };
}

describe("community router", () => {
  describe("createPost", () => {
    it("creates a discussion post", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.community.createPost({
        schoolId: "school-1",
        type: "DISCUSSION",
        title: "Book Recommendation",
        body: "Can anyone recommend a good Year 3 maths workbook?",
        tags: ["Year 3", "Maths"],
      });

      expect(result).toHaveProperty("id");
      expect(result.type).toBe("DISCUSSION");
    });
  });

  describe("listPosts", () => {
    it("returns paginated posts", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.community.listPosts({
        schoolId: "school-1",
      });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("nextCursor");
    });
  });

  describe("addComment", () => {
    it("adds a comment to a post", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.community.addComment({
        postId: "post-1",
        body: "Great question! Try CGP books.",
      });

      expect(result).toHaveProperty("id");
    });
  });

  describe("signUpForSlot", () => {
    it("signs up for a volunteer slot", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.community.signUpForSlot({
        slotId: "slot-1",
      });

      expect(result).toHaveProperty("id");
      expect(ctx.prisma.volunteerSlot.update).toHaveBeenCalled();
    });
  });

  describe("removePost", () => {
    it("staff can remove a post with reason", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.community.removePost({
        schoolId: "school-1",
        postId: "post-1",
        reason: "Inappropriate content",
      });

      expect(result.status).toBe("REMOVED");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/community.test.ts`
Expected: FAIL.

**Step 3: Write the community router**

Create `apps/api/src/router/community.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const communityRouter = router({
  createPost: protectedProcedure
    .input(z.object({
      schoolId: z.string(),
      type: z.enum(["DISCUSSION", "EVENT", "VOLUNTEER_REQUEST"]),
      title: z.string().min(1).max(150),
      body: z.string().min(1).max(2000),
      tags: z.array(z.string()).max(3).default([]),
      imageUrls: z.array(z.string()).max(4).default([]),
      volunteerSlots: z.array(z.object({
        description: z.string().min(1),
        date: z.date(),
        startTime: z.string(),
        endTime: z.string(),
        spotsTotal: z.number().int().min(1),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit: new accounts (< 7 days) max 2 posts/day
      const accountAge = Date.now() - new Date(ctx.user.createdAt ?? 0).getTime();
      const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

      if (isNewAccount) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const postsToday = await ctx.prisma.communityPost.count({
          where: {
            authorId: ctx.user.id,
            schoolId: input.schoolId,
            createdAt: { gte: today },
          },
        });
        if (postsToday >= 2) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "New accounts can only create 2 posts per day",
          });
        }
      }

      const post = await ctx.prisma.communityPost.create({
        data: {
          schoolId: input.schoolId,
          authorId: ctx.user.id,
          type: input.type,
          title: input.title,
          body: input.body,
          tags: input.tags,
          imageUrls: input.imageUrls,
          ...(input.type === "VOLUNTEER_REQUEST" && input.volunteerSlots
            ? {
                volunteerSlots: {
                  create: input.volunteerSlots.map((slot) => ({
                    description: slot.description,
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    spotsTotal: slot.spotsTotal,
                  })),
                },
              }
            : {}),
        },
      });

      return post;
    }),

  listPosts: protectedProcedure
    .input(z.object({
      schoolId: z.string(),
      type: z.enum(["DISCUSSION", "EVENT", "VOLUNTEER_REQUEST"]).optional(),
      tag: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.communityPost.findMany({
        where: {
          schoolId: input.schoolId,
          status: "ACTIVE",
          ...(input.type ? { type: input.type } : {}),
          ...(input.tag ? { tags: { has: input.tag } } : {}),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
          volunteerSlots: input.type === "VOLUNTEER_REQUEST" || !input.type
            ? { include: { _count: { select: { signups: true } } } }
            : false,
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.communityPost.findUnique({
        where: { id: input.postId },
        include: {
          author: { select: { id: true, name: true } },
          comments: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
            include: { author: { select: { id: true, name: true } } },
          },
          volunteerSlots: {
            include: {
              signups: { include: { user: { select: { id: true, name: true } } } },
            },
          },
        },
      });
    }),

  addComment: protectedProcedure
    .input(z.object({
      postId: z.string(),
      body: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.communityComment.create({
        data: {
          postId: input.postId,
          authorId: ctx.user.id,
          body: input.body,
        },
      });
    }),

  getComments: protectedProcedure
    .input(z.object({
      postId: z.string(),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.communityComment.findMany({
        where: { postId: input.postId, status: "ACTIVE" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  signUpForSlot: protectedProcedure
    .input(z.object({ slotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.volunteerSlot.findUnique({
        where: { id: input.slotId },
      });

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Volunteer slot not found" });
      }

      if (slot.spotsTaken >= slot.spotsTotal) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This slot is full" });
      }

      const existing = await ctx.prisma.volunteerSignup.findUnique({
        where: { slotId_userId: { slotId: input.slotId, userId: ctx.user.id } },
      });

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already signed up for this slot" });
      }

      const signup = await ctx.prisma.volunteerSignup.create({
        data: { slotId: input.slotId, userId: ctx.user.id },
      });

      await ctx.prisma.volunteerSlot.update({
        where: { id: input.slotId },
        data: { spotsTaken: { increment: 1 } },
      });

      return signup;
    }),

  cancelSignup: protectedProcedure
    .input(z.object({ slotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.volunteerSignup.delete({
        where: { slotId_userId: { slotId: input.slotId, userId: ctx.user.id } },
      });

      await ctx.prisma.volunteerSlot.update({
        where: { id: input.slotId },
        data: { spotsTaken: { decrement: 1 } },
      });

      return { success: true };
    }),

  pinPost: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      postId: z.string(),
      pinned: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "communityHub");

      if (input.pinned) {
        const pinnedCount = await ctx.prisma.communityPost.count({
          where: { schoolId: input.schoolId, isPinned: true },
        });
        if (pinnedCount >= 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum 3 pinned posts allowed",
          });
        }
      }

      return ctx.prisma.communityPost.update({
        where: { id: input.postId },
        data: { isPinned: input.pinned },
      });
    }),

  removePost: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      postId: z.string(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "communityHub");

      return ctx.prisma.communityPost.update({
        where: { id: input.postId },
        data: {
          status: "REMOVED",
          removedBy: ctx.user.id,
          removedReason: input.reason,
        },
      });
    }),
});
```

**Step 4: Register in router index**

Add to `apps/api/src/router/index.ts`:

```typescript
import { communityRouter } from "./community";
// In router({}):
community: communityRouter,
```

**Step 5: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/community.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/router/community.ts apps/api/src/__tests__/community.test.ts apps/api/src/router/index.ts
git commit -m "feat: add community hub router with posts, comments, volunteer signups, moderation"
```

---

## Task 9: Community Hub Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/community/page.tsx`

**Step 1: Create the community hub page**

Build a page with:

**Feed view (all users):**
- Filter bar: horizontal scrollable tag chips + type filter (All / Discussion / Event / Volunteer)
- Post list: cursor-paginated (20/page), pinned posts at top
- Each post card: author name, time ago, type badge, title, body preview (truncated), tags as badges, comment count
- Click post → expanded view with full body + comments + volunteer slots

**Create post (all users):**
- "New Post" button → modal or inline form
- Type selector: Discussion / Event / Volunteer Request
- Title + body fields
- Tag picker: tappable chips from school's `communityTags` + year groups + freeform input (max 3)
- If Volunteer Request: add slot fields (description, date, start/end time, spots)
- Submit button

**Post detail view:**
- Full post with author + time
- Comments section with "Add comment" input at bottom
- If Volunteer Request: slot cards showing description, time, spots remaining, "Sign Up" / "Cancel Signup" button
- If staff: "Pin" / "Unpin" toggle, "Remove" button with reason prompt

**Staff moderation:**
- "Pin" icon on posts (max 3 pinned)
- "Remove" action with required reason

Follow existing page patterns.

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/community/page.tsx
git commit -m "feat: add community hub page with feed, post creation, comments, volunteer signups"
```

---

## Task 10: Report Card Router + Tests

**Files:**
- Create: `apps/api/src/router/report-card.ts`
- Create: `apps/api/src/__tests__/report-card.test.ts`

**Step 1: Write failing tests**

Create `apps/api/src/__tests__/report-card.test.ts`:

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
          messagingEnabled: true, paymentsEnabled: true, attendanceEnabled: true,
          calendarEnabled: true, formsEnabled: true, translationEnabled: false,
          parentsEveningEnabled: false, wellbeingEnabled: false,
          emergencyCommsEnabled: false, analyticsEnabled: false,
          mealBookingEnabled: false, reportCardsEnabled: true,
          communityHubEnabled: false,
          paymentDinnerMoneyEnabled: true, paymentTripsEnabled: true,
          paymentClubsEnabled: true, paymentUniformEnabled: true,
          paymentOtherEnabled: true,
          // Branding fields
          logoUrl: null, brandColor: "#1E3A5F", secondaryColor: null,
          schoolMotto: null, brandFont: "DEFAULT", name: "Test School",
        }),
      },
      reportCycle: {
        create: vi.fn().mockResolvedValue({
          id: "cycle-1", name: "Autumn Term 2026", status: "DRAFT",
        }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          id: "cycle-1", status: "DRAFT", schoolId: "school-1",
        }),
        update: vi.fn().mockResolvedValue({ id: "cycle-1", status: "PUBLISHED" }),
      },
      reportCard: {
        upsert: vi.fn().mockResolvedValue({ id: "card-1" }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          id: "card-1", generalComment: "Good progress",
          subjectGrades: [
            { subject: "Maths", level: "EXPECTED", effort: "GOOD", comment: "Well done" },
          ],
          child: { firstName: "Test", lastName: "Child", yearGroup: "4" },
          cycle: { name: "Autumn 2026", assessmentModel: "PRIMARY_DESCRIPTIVE" },
        }),
      },
      subjectGrade: {
        createMany: vi.fn().mockResolvedValue({ count: 5 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      parentChild: {
        findFirst: vi.fn().mockResolvedValue({ parentId: "user-1", childId: "child-1" }),
      },
      staffMember: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-1", schoolId: "school-1", role: "ADMIN",
        }),
      },
    },
    user: { id: "user-1", name: "Test User" },
    session: { id: "session-1" },
    ...overrides,
  };
}

describe("report card router", () => {
  describe("createCycle", () => {
    it("creates a report cycle", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reportCard.createCycle({
        schoolId: "school-1",
        name: "Autumn Term 2026",
        type: "TERMLY",
        assessmentModel: "PRIMARY_DESCRIPTIVE",
        publishDate: new Date("2026-12-20"),
      });

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("DRAFT");
    });
  });

  describe("saveGrades", () => {
    it("saves subject grades for a child", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reportCard.saveGrades({
        schoolId: "school-1",
        cycleId: "cycle-1",
        childId: "child-1",
        generalComment: "Good term overall",
        grades: [
          { subject: "Mathematics", sortOrder: 1, level: "EXPECTED", effort: "GOOD", comment: "Solid progress" },
          { subject: "English", sortOrder: 2, level: "EXCEEDING", effort: "OUTSTANDING", comment: "Excellent reading" },
        ],
      });

      expect(result).toHaveProperty("id");
      expect(ctx.prisma.subjectGrade.createMany).toHaveBeenCalled();
    });
  });

  describe("publishCycle", () => {
    it("publishes a report cycle", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reportCard.publishCycle({
        schoolId: "school-1",
        cycleId: "cycle-1",
      });

      expect(result.status).toBe("PUBLISHED");
    });
  });

  describe("getReportCard", () => {
    it("returns report card with grades for a child", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reportCard.getReportCard({
        childId: "child-1",
        cycleId: "cycle-1",
      });

      expect(result).toHaveProperty("subjectGrades");
      expect(result?.subjectGrades.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/report-card.test.ts`
Expected: FAIL.

**Step 3: Write the report card router**

Create `apps/api/src/router/report-card.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const reportCardRouter = router({
  createCycle: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      name: z.string().min(1).max(100),
      type: z.enum(["TERMLY", "HALF_TERMLY", "END_OF_YEAR", "MOCK", "CUSTOM"]),
      assessmentModel: z.enum(["PRIMARY_DESCRIPTIVE", "SECONDARY_GRADES"]),
      publishDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "reportCards");

      return ctx.prisma.reportCycle.create({
        data: {
          schoolId: input.schoolId,
          name: input.name,
          type: input.type,
          assessmentModel: input.assessmentModel,
          publishDate: input.publishDate,
          createdBy: ctx.user.id,
        },
      });
    }),

  listCycles: schoolFeatureProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "reportCards");

      return ctx.prisma.reportCycle.findMany({
        where: { schoolId: input.schoolId },
        orderBy: { publishDate: "desc" },
        include: { _count: { select: { reportCards: true } } },
      });
    }),

  publishCycle: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      cycleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "reportCards");

      const cycle = await ctx.prisma.reportCycle.findUnique({
        where: { id: input.cycleId },
      });

      if (!cycle || cycle.schoolId !== input.schoolId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report cycle not found" });
      }

      if (cycle.status === "PUBLISHED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cycle is already published" });
      }

      return ctx.prisma.reportCycle.update({
        where: { id: input.cycleId },
        data: { status: "PUBLISHED" },
      });
    }),

  saveGrades: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      cycleId: z.string(),
      childId: z.string(),
      generalComment: z.string().max(1000).optional(),
      attendancePct: z.number().min(0).max(100).optional(),
      grades: z.array(z.object({
        subject: z.string().min(1),
        sortOrder: z.number().int().default(0),
        level: z.enum(["EMERGING", "DEVELOPING", "EXPECTED", "EXCEEDING"]).optional(),
        effort: z.enum(["OUTSTANDING", "GOOD", "SATISFACTORY", "NEEDS_IMPROVEMENT"]).optional(),
        currentGrade: z.string().max(10).optional(),
        targetGrade: z.string().max(10).optional(),
        comment: z.string().max(500).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "reportCards");

      const reportCard = await ctx.prisma.reportCard.upsert({
        where: {
          cycleId_childId: { cycleId: input.cycleId, childId: input.childId },
        },
        update: {
          generalComment: input.generalComment ?? null,
          attendancePct: input.attendancePct ?? null,
        },
        create: {
          cycleId: input.cycleId,
          childId: input.childId,
          schoolId: input.schoolId,
          generalComment: input.generalComment ?? null,
          attendancePct: input.attendancePct ?? null,
        },
      });

      // Replace all grades (delete + recreate)
      await ctx.prisma.subjectGrade.deleteMany({
        where: { reportCardId: reportCard.id },
      });

      if (input.grades.length > 0) {
        await ctx.prisma.subjectGrade.createMany({
          data: input.grades.map((g) => ({
            reportCardId: reportCard.id,
            subject: g.subject,
            sortOrder: g.sortOrder,
            level: g.level ?? null,
            effort: g.effort ?? null,
            currentGrade: g.currentGrade ?? null,
            targetGrade: g.targetGrade ?? null,
            comment: g.comment ?? null,
          })),
        });
      }

      return reportCard;
    }),

  getReportCard: protectedProcedure
    .input(z.object({
      childId: z.string(),
      cycleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify access
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: { parentId: ctx.user.id, childId: input.childId },
      });

      if (!parentChild) {
        const child = await ctx.prisma.child.findUnique({ where: { id: input.childId } });
        if (child) {
          const staff = await ctx.prisma.staffMember.findUnique({
            where: { userId_schoolId: { userId: ctx.user.id, schoolId: child.schoolId } },
          });
          if (!staff) {
            throw new TRPCError({ code: "FORBIDDEN", message: "No access to this child's reports" });
          }
        }
      }

      return ctx.prisma.reportCard.findUnique({
        where: { cycleId_childId: { cycleId: input.cycleId, childId: input.childId } },
        include: {
          subjectGrades: { orderBy: { sortOrder: "asc" } },
          child: { select: { firstName: true, lastName: true, yearGroup: true, className: true } },
          cycle: { select: { name: true, type: true, assessmentModel: true, publishDate: true } },
        },
      });
    }),

  listReportsForChild: protectedProcedure
    .input(z.object({ childId: z.string() }))
    .query(async ({ ctx, input }) => {
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: { parentId: ctx.user.id, childId: input.childId },
      });

      if (!parentChild) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a parent of this child" });
      }

      return ctx.prisma.reportCard.findMany({
        where: {
          childId: input.childId,
          cycle: { status: "PUBLISHED" },
        },
        orderBy: { cycle: { publishDate: "desc" } },
        include: {
          cycle: { select: { id: true, name: true, type: true, assessmentModel: true, publishDate: true } },
          subjectGrades: { orderBy: { sortOrder: "asc" } },
        },
      });
    }),

  getChildrenForCycle: schoolFeatureProcedure
    .input(z.object({
      schoolId: z.string(),
      cycleId: z.string(),
      yearGroup: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      assertFeatureEnabled(ctx, "reportCards");

      const children = await ctx.prisma.child.findMany({
        where: {
          schoolId: input.schoolId,
          ...(input.yearGroup ? { yearGroup: input.yearGroup } : {}),
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          reportCards: {
            where: { cycleId: input.cycleId },
            include: { _count: { select: { subjectGrades: true } } },
          },
        },
      });

      return children.map((child) => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        yearGroup: child.yearGroup,
        hasReport: child.reportCards.length > 0,
        gradeCount: child.reportCards[0]?._count.subjectGrades ?? 0,
      }));
    }),
});
```

**Step 4: Register in router index**

Add to `apps/api/src/router/index.ts`:

```typescript
import { reportCardRouter } from "./report-card";
// In router({}):
reportCard: reportCardRouter,
```

**Step 5: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/report-card.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/router/report-card.ts apps/api/src/__tests__/report-card.test.ts apps/api/src/router/index.ts
git commit -m "feat: add report card router with cycle management, grade entry, and parent access"
```

---

## Task 11: PDF Generation for Report Cards

**Files:**
- Install: `@react-pdf/renderer` in `apps/api`
- Create: `apps/api/src/lib/report-pdf.ts`
- Modify: `apps/api/src/router/report-card.ts` (add `generatePdf` procedure)

**Step 1: Install dependency**

Run: `cd apps/api && npx pnpm add @react-pdf/renderer`

**Step 2: Create PDF template**

Create `apps/api/src/lib/report-pdf.ts`:

```typescript
import ReactPDF, { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

interface ReportPdfData {
  schoolName: string;
  schoolMotto: string | null;
  brandColor: string;
  secondaryColor: string | null;
  brandFont: string;
  childName: string;
  yearGroup: string;
  className: string | null;
  cycleName: string;
  publishDate: string;
  attendancePct: number | null;
  assessmentModel: "PRIMARY_DESCRIPTIVE" | "SECONDARY_GRADES";
  generalComment: string | null;
  grades: Array<{
    subject: string;
    level: string | null;
    effort: string | null;
    currentGrade: string | null;
    targetGrade: string | null;
    comment: string | null;
  }>;
}

const LEVEL_COLORS: Record<string, string> = {
  EMERGING: "#ef4444",
  DEVELOPING: "#f59e0b",
  EXPECTED: "#22c55e",
  EXCEEDING: "#3b82f6",
};

function createStyles(brandColor: string) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
    header: {
      backgroundColor: brandColor,
      padding: 16,
      marginBottom: 20,
      marginHorizontal: -40,
      marginTop: -40,
      paddingHorizontal: 40,
    },
    schoolName: { fontSize: 18, color: "white", fontWeight: "bold" },
    motto: { fontSize: 9, color: "white", marginTop: 2, opacity: 0.9 },
    childInfo: { marginBottom: 16 },
    childName: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
    metaText: { fontSize: 9, color: "#666", marginBottom: 2 },
    attendanceBadge: {
      backgroundColor: "#f0fdf4",
      borderRadius: 4,
      padding: "4 8",
      alignSelf: "flex-start",
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#f3f4f6",
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
      fontWeight: "bold",
      fontSize: 9,
    },
    tableRow: {
      flexDirection: "row",
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#f3f4f6",
      fontSize: 9,
    },
    tableRowAlt: { backgroundColor: "#fafafa" },
    colSubject: { width: "20%" },
    colGrade: { width: "15%" },
    colEffort: { width: "15%" },
    colComment: { width: "50%" },
    generalComment: {
      marginTop: 16,
      padding: 12,
      backgroundColor: "#f9fafb",
      borderRadius: 4,
    },
    commentLabel: { fontWeight: "bold", marginBottom: 4, fontSize: 10 },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      fontSize: 8,
      color: "#999",
      textAlign: "center",
    },
  });
}

function ReportPdf({ data }: { data: ReportPdfData }) {
  const styles = createStyles(data.brandColor);

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.schoolName }, data.schoolName),
        data.schoolMotto
          ? React.createElement(Text, { style: styles.motto }, data.schoolMotto)
          : null,
      ),
      // Child info
      React.createElement(
        View,
        { style: styles.childInfo },
        React.createElement(Text, { style: styles.childName }, data.childName),
        React.createElement(
          Text,
          { style: styles.metaText },
          `${data.yearGroup}${data.className ? ` · ${data.className}` : ""} · ${data.cycleName}`,
        ),
        React.createElement(Text, { style: styles.metaText }, `Published: ${data.publishDate}`),
        data.attendancePct !== null
          ? React.createElement(
              View,
              { style: styles.attendanceBadge },
              React.createElement(Text, null, `Attendance: ${data.attendancePct}%`),
            )
          : null,
      ),
      // Table header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: styles.colSubject }, "Subject"),
        data.assessmentModel === "PRIMARY_DESCRIPTIVE"
          ? React.createElement(Text, { style: styles.colGrade }, "Level")
          : React.createElement(Text, { style: styles.colGrade }, "Grade"),
        data.assessmentModel === "PRIMARY_DESCRIPTIVE"
          ? React.createElement(Text, { style: styles.colEffort }, "Effort")
          : React.createElement(Text, { style: styles.colEffort }, "Target"),
        React.createElement(Text, { style: styles.colComment }, "Comment"),
      ),
      // Table rows
      ...data.grades.map((grade, idx) =>
        React.createElement(
          View,
          { key: grade.subject, style: { ...styles.tableRow, ...(idx % 2 === 1 ? styles.tableRowAlt : {}) } },
          React.createElement(Text, { style: styles.colSubject }, grade.subject),
          data.assessmentModel === "PRIMARY_DESCRIPTIVE"
            ? React.createElement(Text, { style: styles.colGrade }, grade.level ?? "—")
            : React.createElement(Text, { style: styles.colGrade }, grade.currentGrade ?? "—"),
          data.assessmentModel === "PRIMARY_DESCRIPTIVE"
            ? React.createElement(Text, { style: styles.colEffort }, grade.effort ?? "—")
            : React.createElement(Text, { style: styles.colEffort }, grade.targetGrade ?? "—"),
          React.createElement(Text, { style: styles.colComment }, grade.comment ?? ""),
        ),
      ),
      // General comment
      data.generalComment
        ? React.createElement(
            View,
            { style: styles.generalComment },
            React.createElement(Text, { style: styles.commentLabel }, "General Comment"),
            React.createElement(Text, null, data.generalComment),
          )
        : null,
      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `${data.schoolName} · Generated from Abridge on ${new Date().toLocaleDateString("en-GB")}`,
      ),
    ),
  );
}

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  const element = React.createElement(ReportPdf, { data });
  const stream = await ReactPDF.renderToStream(element);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
```

**Step 3: Add PDF generation procedure to report-card router**

Add to `apps/api/src/router/report-card.ts`:

```typescript
import { generateReportPdf } from "../lib/report-pdf";

// Add this procedure to the router:
generatePdf: protectedProcedure
  .input(z.object({
    childId: z.string(),
    cycleId: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify access (same as getReportCard)
    const parentChild = await ctx.prisma.parentChild.findFirst({
      where: { parentId: ctx.user.id, childId: input.childId },
    });

    if (!parentChild) {
      const child = await ctx.prisma.child.findUnique({ where: { id: input.childId } });
      if (child) {
        const staff = await ctx.prisma.staffMember.findUnique({
          where: { userId_schoolId: { userId: ctx.user.id, schoolId: child.schoolId } },
        });
        if (!staff) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No access" });
        }
      }
    }

    const reportCard = await ctx.prisma.reportCard.findUnique({
      where: { cycleId_childId: { cycleId: input.cycleId, childId: input.childId } },
      include: {
        subjectGrades: { orderBy: { sortOrder: "asc" } },
        child: { select: { firstName: true, lastName: true, yearGroup: true, className: true } },
        cycle: { select: { name: true, assessmentModel: true, publishDate: true } },
        school: {
          select: {
            name: true, brandColor: true, secondaryColor: true,
            schoolMotto: true, brandFont: true,
          },
        },
      },
    });

    if (!reportCard) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Report card not found" });
    }

    const pdfBuffer = await generateReportPdf({
      schoolName: reportCard.school.name,
      schoolMotto: reportCard.school.schoolMotto,
      brandColor: reportCard.school.brandColor ?? "#1E3A5F",
      secondaryColor: reportCard.school.secondaryColor,
      brandFont: reportCard.school.brandFont ?? "DEFAULT",
      childName: `${reportCard.child.firstName} ${reportCard.child.lastName}`,
      yearGroup: reportCard.child.yearGroup,
      className: reportCard.child.className,
      cycleName: reportCard.cycle.name,
      publishDate: reportCard.cycle.publishDate.toLocaleDateString("en-GB"),
      attendancePct: reportCard.attendancePct,
      assessmentModel: reportCard.cycle.assessmentModel,
      generalComment: reportCard.generalComment,
      grades: reportCard.subjectGrades.map((g) => ({
        subject: g.subject,
        level: g.level,
        effort: g.effort,
        currentGrade: g.currentGrade,
        targetGrade: g.targetGrade,
        comment: g.comment,
      })),
    });

    // Return as base64 for client to download
    return {
      pdf: pdfBuffer.toString("base64"),
      filename: `Report-${reportCard.child.firstName}-${reportCard.child.lastName}-${reportCard.cycle.name.replace(/\s+/g, "-")}.pdf`,
    };
  }),
```

**Step 4: Commit**

```bash
git add apps/api/src/lib/report-pdf.ts apps/api/src/router/report-card.ts apps/api/package.json
git commit -m "feat: add server-side PDF generation for branded report cards"
```

---

## Task 12: Report Card Web Page

**Files:**
- Create: `apps/web/src/app/dashboard/reports/page.tsx`

**Step 1: Create the report card page**

Build a page with:

**Parent view:**
- Child selector (multi-child)
- List of published report cycles for child (from `reportCard.listReportsForChild`)
- Click cycle → report card view:
  - Header: child name, year group, cycle name, attendance %
  - Subject table: Primary shows Level (colour badges) + Effort + Comment. Secondary shows Current Grade + Target + Gap indicator + Comment.
  - General comment section
  - "Download Report" button → calls `reportCard.generatePdf`, decodes base64, triggers browser download

**Staff view:**
- "Report Cycles" list with status badges (DRAFT/PUBLISHED/ARCHIVED)
- "Create Cycle" button → form: name, type, assessment model, publish date
- Click cycle → child list with completion status
- Click child → grade entry form:
  - Primary: subject dropdown, level picker, effort picker, comment
  - Secondary: subject, current grade, target grade, comment
  - General comment textarea
  - "Save" button (upserts via `reportCard.saveGrades`)
- "Publish" button on cycle (admin only)

**PDF download handler:**

```typescript
const downloadMutation = trpc.reportCard.generatePdf.useMutation({
  onSuccess: (data) => {
    const blob = new Blob(
      [Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))],
      { type: "application/pdf" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  },
});
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/reports/page.tsx
git commit -m "feat: add report card page with parent view, staff grade entry, and PDF download"
```

---

## Task 13: Add Nav Links for Phase 3B Pages

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx`

**Step 1: Add navigation items**

For **parent** navigation (conditional on feature toggles):
```typescript
{ name: "Meals", href: "/dashboard/meals", icon: UtensilsCrossed },
{ name: "Reports", href: "/dashboard/reports", icon: FileText },
{ name: "Community", href: "/dashboard/community", icon: Users },
```

For **staff** navigation:
```typescript
{ name: "Meals", href: "/dashboard/meals", icon: UtensilsCrossed },
{ name: "Reports", href: "/dashboard/reports", icon: FileText },
{ name: "Community", href: "/dashboard/community", icon: Users },
```

Import icons from `lucide-react`: `UtensilsCrossed`.

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: add nav links for meals, reports, and community pages"
```

---

## Task 14: Update Admin Settings + Seed Data

**Files:**
- Modify: `apps/web/src/app/dashboard/admin/page.tsx`
- Modify: `packages/db/prisma/seed.ts`

**Step 1: Add toggle controls for Phase 3B features**

Add toggle switches to admin settings for:
- `mealBookingEnabled` — "Meal Booking"
- `reportCardsEnabled` — "Report Cards"
- `communityHubEnabled` — "Community Hub"

**Step 2: Add seed data**

In `packages/db/prisma/seed.ts`, add to school upsert:

```typescript
mealBookingEnabled: true,
reportCardsEnabled: true,
communityHubEnabled: true,
communityTags: ["PTA", "After-school Clubs", "Sports", "Music", "Trips", "General"],
```

Add sample meal menu, community post, and report cycle:

```typescript
// Sample meal menu
const monday = new Date();
monday.setDate(monday.getDate() - monday.getDay() + 1); // This Monday
monday.setHours(0, 0, 0, 0);

const menu = await prisma.mealMenu.upsert({
  where: { schoolId_weekStarting: { schoolId: school.id, weekStarting: monday } },
  update: {},
  create: {
    schoolId: school.id,
    weekStarting: monday,
    publishedAt: new Date(),
    createdBy: adminUser.id,
  },
});

await prisma.mealOption.createMany({
  data: [
    { menuId: menu.id, day: "MONDAY", name: "Chicken Pie", category: "HOT_MAIN", allergens: ["Cereals", "Milk"], priceInPence: 250, sortOrder: 0 },
    { menuId: menu.id, day: "MONDAY", name: "Veggie Pasta", category: "VEGETARIAN", allergens: ["Cereals"], priceInPence: 250, sortOrder: 1 },
    { menuId: menu.id, day: "TUESDAY", name: "Fish Fingers", category: "HOT_MAIN", allergens: ["Fish", "Cereals"], priceInPence: 250, sortOrder: 0 },
  ],
  skipDuplicates: true,
});

// Sample community post
await prisma.communityPost.create({
  data: {
    schoolId: school.id,
    authorId: adminUser.id,
    type: "DISCUSSION",
    title: "Welcome to the Community Hub!",
    body: "This is a space for parents to discuss, share, and connect.",
    tags: ["General"],
    isPinned: true,
  },
});
```

**Step 3: Test seed**

Run: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:seed`

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/admin/page.tsx packages/db/prisma/seed.ts
git commit -m "feat: add Phase 3B feature toggles to admin and seed data"
```

---

## Task 15: Run Unit Tests + Lint + Build

**Step 1: Run API tests**

Run: `cd apps/api && npx vitest run`
Expected: All pass.

**Step 2: Run lint**

Run: `npx pnpm lint`
Expected: No errors.

**Step 3: Run build**

Run: `npx pnpm build`
Expected: Build succeeds.

**Step 4: Fix and commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from Phase 3B implementation"
```

---

## Task 16: E2E Seed Helpers for Phase 3B

**Files:**
- Modify: `e2e/helpers/seed-data.ts`

**Step 1: Add meal booking seeders**

```typescript
export async function seedMealMenu(params: {
  schoolId: string;
  createdBy: string;
  weekStarting?: Date;
  options?: Array<{
    day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
    name: string;
    category: "HOT_MAIN" | "VEGETARIAN" | "JACKET_POTATO" | "SANDWICH" | "DESSERT";
    allergens?: string[];
    priceInPence?: number;
  }>;
}): Promise<{ id: string; weekStarting: Date }> {
  const monday = params.weekStarting || (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const menu = await prisma.mealMenu.create({
    data: {
      schoolId: params.schoolId,
      weekStarting: monday,
      publishedAt: new Date(),
      createdBy: params.createdBy,
    },
  });

  const defaultOptions = params.options || [
    { day: "MONDAY" as const, name: "Chicken Pie", category: "HOT_MAIN" as const, allergens: ["Cereals", "Milk"], priceInPence: 250 },
    { day: "MONDAY" as const, name: "Veggie Pasta", category: "VEGETARIAN" as const, allergens: ["Cereals"], priceInPence: 250 },
    { day: "TUESDAY" as const, name: "Fish Fingers", category: "HOT_MAIN" as const, allergens: ["Fish", "Cereals"], priceInPence: 250 },
  ];

  await prisma.mealOption.createMany({
    data: defaultOptions.map((opt, idx) => ({
      menuId: menu.id,
      day: opt.day,
      name: opt.name,
      category: opt.category,
      allergens: opt.allergens || [],
      priceInPence: opt.priceInPence || 250,
      sortOrder: idx,
    })),
  });

  return { id: menu.id, weekStarting: monday };
}

export async function seedDietaryProfile(params: {
  childId: string;
  allergies?: string[];
  dietaryNeeds?: string[];
}): Promise<{ id: string }> {
  const profile = await prisma.dietaryProfile.upsert({
    where: { childId: params.childId },
    update: { allergies: params.allergies || [], dietaryNeeds: params.dietaryNeeds || [] },
    create: {
      childId: params.childId,
      allergies: params.allergies || [],
      dietaryNeeds: params.dietaryNeeds || [],
    },
  });
  return { id: profile.id };
}
```

**Step 2: Add community seeders**

```typescript
export async function seedCommunityPost(params: {
  schoolId: string;
  authorId: string;
  type?: "DISCUSSION" | "EVENT" | "VOLUNTEER_REQUEST";
  title?: string;
  body?: string;
  tags?: string[];
  isPinned?: boolean;
}): Promise<{ id: string; title: string }> {
  const post = await prisma.communityPost.create({
    data: {
      schoolId: params.schoolId,
      authorId: params.authorId,
      type: params.type || "DISCUSSION",
      title: params.title || "Test Discussion",
      body: params.body || "This is a test community post.",
      tags: params.tags || [],
      isPinned: params.isPinned || false,
    },
  });
  return { id: post.id, title: post.title };
}

export async function seedVolunteerPost(params: {
  schoolId: string;
  authorId: string;
  title?: string;
  slots?: Array<{ description: string; date: Date; startTime: string; endTime: string; spotsTotal: number }>;
}): Promise<{ id: string; slotIds: string[] }> {
  const post = await prisma.communityPost.create({
    data: {
      schoolId: params.schoolId,
      authorId: params.authorId,
      type: "VOLUNTEER_REQUEST",
      title: params.title || "Volunteers Needed for Sports Day",
      body: "We need help setting up and running stalls.",
      tags: ["Sports"],
      volunteerSlots: {
        create: (params.slots || [
          { description: "Set up chairs 2-3pm", date: new Date(), startTime: "14:00", endTime: "15:00", spotsTotal: 4 },
        ]).map((s) => ({
          description: s.description,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          spotsTotal: s.spotsTotal,
        })),
      },
    },
    include: { volunteerSlots: true },
  });
  return { id: post.id, slotIds: post.volunteerSlots.map((s) => s.id) };
}
```

**Step 3: Add report card seeders**

```typescript
export async function seedReportCycle(params: {
  schoolId: string;
  createdBy: string;
  name?: string;
  assessmentModel?: "PRIMARY_DESCRIPTIVE" | "SECONDARY_GRADES";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}): Promise<{ id: string; name: string }> {
  const name = params.name || "Autumn Term 2026";
  const cycle = await prisma.reportCycle.create({
    data: {
      schoolId: params.schoolId,
      name,
      type: "TERMLY",
      assessmentModel: params.assessmentModel || "PRIMARY_DESCRIPTIVE",
      publishDate: new Date(),
      status: params.status || "PUBLISHED",
      createdBy: params.createdBy,
    },
  });
  return { id: cycle.id, name: cycle.name };
}

export async function seedReportCard(params: {
  cycleId: string;
  childId: string;
  schoolId: string;
  generalComment?: string;
  grades?: Array<{
    subject: string;
    level?: "EMERGING" | "DEVELOPING" | "EXPECTED" | "EXCEEDING";
    effort?: "OUTSTANDING" | "GOOD" | "SATISFACTORY" | "NEEDS_IMPROVEMENT";
    comment?: string;
  }>;
}): Promise<{ id: string }> {
  const card = await prisma.reportCard.create({
    data: {
      cycleId: params.cycleId,
      childId: params.childId,
      schoolId: params.schoolId,
      generalComment: params.generalComment || "Good progress this term.",
      attendancePct: 95.5,
      subjectGrades: {
        create: (params.grades || [
          { subject: "Mathematics", level: "EXPECTED", effort: "GOOD", comment: "Solid progress in number work." },
          { subject: "English", level: "EXCEEDING", effort: "OUTSTANDING", comment: "Excellent reader." },
          { subject: "Science", level: "EXPECTED", effort: "GOOD", comment: "Enjoys experiments." },
        ]).map((g, idx) => ({
          subject: g.subject,
          sortOrder: idx,
          level: g.level || null,
          effort: g.effort || null,
          comment: g.comment || null,
        })),
      },
    },
  });
  return { id: card.id };
}
```

**Step 4: Commit**

```bash
git add e2e/helpers/seed-data.ts
git commit -m "test: add E2E seed helpers for meals, community, and report cards"
```

---

## Task 17: E2E — Meal Booking Parent Journey

**Files:**
- Create: `e2e/parent-meal-booking-journey.test.ts`

**Step 1: Write E2E tests**

Tests to cover:
1. **Parent views weekly menu and books a meal** — setup school, register, seed menu + child, navigate to meals, verify menu options visible, book a meal, verify booking appears
2. **Parent sets dietary profile and sees allergen warnings** — seed profile with nut allergy, navigate to meals, verify allergen warning shown on meals containing Nuts
3. **Parent cancels a meal booking** — book a meal, then cancel it, verify cancellation
4. **Meal booking page shows empty state when no menu published** — navigate to meals with no menu, verify "no menu" message
5. **Feature disabled state** — navigate without `mealBookingEnabled`, verify disabled message

Follow the exact patterns from Phase 3A E2E tests: unique URN, setup → register → seed → navigate → assert.

**Step 2: Run tests**

Run: `npx playwright test e2e/parent-meal-booking-journey.test.ts`

**Step 3: Commit**

```bash
git add e2e/parent-meal-booking-journey.test.ts
git commit -m "test: add E2E tests for parent meal booking journey (5 tests)"
```

---

## Task 18: E2E — Staff Meal Management Journey

**Files:**
- Create: `e2e/staff-meal-management-journey.test.ts`

**Step 1: Write E2E tests**

Tests to cover:
1. **Staff creates and publishes a weekly menu** — navigate to meals as staff, create menu with options, publish, verify published
2. **Staff views kitchen summary** — seed bookings, navigate to kitchen dashboard, verify aggregated counts
3. **Staff toggles meal option availability** — toggle a meal off, verify it shows as unavailable

Follow staff setup pattern: setup school → register with admin email → wait for role sync → navigate.

**Step 2: Run tests**

Run: `npx playwright test e2e/staff-meal-management-journey.test.ts`

**Step 3: Commit**

```bash
git add e2e/staff-meal-management-journey.test.ts
git commit -m "test: add E2E tests for staff meal management journey (3 tests)"
```

---

## Task 19: E2E — Community Hub Journey

**Files:**
- Create: `e2e/community-hub-journey.test.ts`

**Step 1: Write E2E tests**

Tests to cover:
1. **Parent creates a discussion post** — navigate to community, create discussion with tags, verify post appears in feed
2. **Parent adds a comment to a post** — seed a post, navigate, add comment, verify comment visible
3. **Parent signs up for a volunteer slot** — seed volunteer post with slots, navigate, sign up, verify signup confirmed and spots decremented
4. **Staff pins a post** — seed a post, navigate as staff, pin it, verify pinned badge
5. **Staff removes a post with reason** — seed a post, navigate as staff, remove with reason, verify post no longer visible
6. **Feed filters by type and tag** — seed posts with different types/tags, filter by type, verify only matching posts shown
7. **Community page shows disabled state** — navigate without `communityHubEnabled`, verify disabled message

**Step 2: Run tests**

Run: `npx playwright test e2e/community-hub-journey.test.ts`

**Step 3: Commit**

```bash
git add e2e/community-hub-journey.test.ts
git commit -m "test: add E2E tests for community hub journey (7 tests)"
```

---

## Task 20: E2E — Report Card Parent Journey

**Files:**
- Create: `e2e/parent-report-card-journey.test.ts`

**Step 1: Write E2E tests**

Tests to cover:
1. **Parent views a published report card** — seed cycle + report card with grades, navigate to reports, verify child name, cycle name, subject grades visible with level badges (primary) or grade values (secondary)
2. **Parent downloads report card as branded PDF** — seed report + school branding, click download, verify PDF mutation called (check download starts)
3. **Parent sees historical reports across terms** — seed 2 report cycles with cards, navigate, verify both cycles listed
4. **Report page shows empty state with no reports** — navigate with child but no reports, verify "no reports" message
5. **Feature disabled state** — navigate without `reportCardsEnabled`, verify disabled message

**Step 2: Run tests**

Run: `npx playwright test e2e/parent-report-card-journey.test.ts`

**Step 3: Commit**

```bash
git add e2e/parent-report-card-journey.test.ts
git commit -m "test: add E2E tests for parent report card journey (5 tests)"
```

---

## Task 21: E2E — Staff Report Card Management Journey

**Files:**
- Create: `e2e/staff-report-card-journey.test.ts`

**Step 1: Write E2E tests**

Tests to cover:
1. **Staff creates a report cycle** — navigate as admin, create cycle with name, type, assessment model, publish date, verify cycle appears in list
2. **Staff enters grades for a child** — seed cycle + child, navigate to grade entry, fill in subject grades and general comment, save, verify saved
3. **Staff publishes a report cycle** — create cycle, add grades, publish, verify status changes to PUBLISHED
4. **Staff sees completion tracking for children** — seed cycle + multiple children, verify list shows which have reports and which don't

**Step 2: Run tests**

Run: `npx playwright test e2e/staff-report-card-journey.test.ts`

**Step 3: Commit**

```bash
git add e2e/staff-report-card-journey.test.ts
git commit -m "test: add E2E tests for staff report card management journey (4 tests)"
```

---

## Task 22: Run Full E2E Suite + Final Verification

**Step 1: Run all E2E tests**

Run: `npx playwright test`
Expected: All tests pass (Phase 3A + Phase 3B).

**Step 2: Run API unit tests**

Run: `cd apps/api && npx vitest run`
Expected: All pass.

**Step 3: Run lint + build**

Run: `npx pnpm lint && npx pnpm build`
Expected: Clean.

**Step 4: Fix and commit**

```bash
git add -A
git commit -m "fix: resolve any issues from Phase 3B E2E test suite"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Feature toggles for Phase 3B | schema.prisma |
| 2 | Meal booking models + enums | schema.prisma |
| 3 | Community hub models + enums | schema.prisma |
| 4 | Report card models + enums | schema.prisma |
| 5 | Feature guards + web toggles | feature-guards.ts, trpc.ts, feature-toggles.tsx |
| 6 | Meal booking router + unit tests | meal-booking.ts, meal-booking.test.ts |
| 7 | Meal booking web page | meals/page.tsx |
| 8 | Community hub router + unit tests | community.ts, community.test.ts |
| 9 | Community hub web page | community/page.tsx |
| 10 | Report card router + unit tests | report-card.ts, report-card.test.ts |
| 11 | PDF generation for report cards | report-pdf.ts, @react-pdf/renderer |
| 12 | Report card web page | reports/page.tsx |
| 13 | Nav links for Phase 3B pages | layout.tsx |
| 14 | Admin settings + seed data | admin/page.tsx, seed.ts |
| 15 | Full unit test suite + build | All |
| **16** | **E2E seed helpers** | **seed-data.ts** |
| **17** | **E2E: Parent meal booking (5 tests)** | **parent-meal-booking-journey.test.ts** |
| **18** | **E2E: Staff meal management (3 tests)** | **staff-meal-management-journey.test.ts** |
| **19** | **E2E: Community hub (7 tests)** | **community-hub-journey.test.ts** |
| **20** | **E2E: Parent report card (5 tests)** | **parent-report-card-journey.test.ts** |
| **21** | **E2E: Staff report card (4 tests)** | **staff-report-card-journey.test.ts** |
| **22** | **Full E2E suite + final verification** | **All** |

### E2E Test Coverage Matrix — Phase 3B

| Feature | Happy Path | Empty State | Feature Disabled | Multi-User | Moderation | Error Cases |
|---------|-----------|-------------|-----------------|------------|-----------|-------------|
| Meal Booking (Parent) | ✅ Book meal | ✅ No menu | ✅ Feature off | ✅ Multi-child | — | ✅ Allergen warnings, Cancel |
| Meal Booking (Staff) | ✅ Create + publish menu | — | — | — | — | ✅ Toggle availability |
| Community Hub | ✅ Create post + comment | — | ✅ Feature off | ✅ Volunteer signup | ✅ Pin + Remove | ✅ Filter by type/tag |
| Report Cards (Parent) | ✅ View report | ✅ No reports | ✅ Feature off | ✅ Multi-term history | — | ✅ PDF download |
| Report Cards (Staff) | ✅ Create cycle + grades | — | — | ✅ Completion tracking | — | ✅ Publish flow |

**Total new E2E tests: 24 across 5 test files**
**Combined Phase 3A + 3B: 40 E2E tests across 10 test files**
