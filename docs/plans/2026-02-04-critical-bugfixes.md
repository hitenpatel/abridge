# Critical Bugfixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 critical issues (Auth Secret validation, CORS, Seed script idempotency) to prepare for production.

**Architecture:** 
- API: Fastify + tRPC
- DB: Prisma + PostgreSQL

---

### Task 1: Fix C1 - Validation for BETTER_AUTH_SECRET

**Files:**
- Modify: `apps/api/src/lib/auth.ts`

**Step 1: Update validation logic**
Add a check to ensure `BETTER_AUTH_SECRET` is at least 32 characters long to prevent weak secrets in production.

```typescript
// apps/api/src/lib/auth.ts
if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET environment variable is required");
}
if (process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long in production");
}
```

**Step 2: Verify locally**
Run `pnpm dev` with a short secret (in `.env.local` or override) and ensure it throws.
Then update `.env` to have a long secret.

### Task 2: Fix C2 - CORS Configuration

**Files:**
- Modify: `apps/api/src/index.ts`

**Step 1: Implement robust origin check**
Replace the simple array-based origin with a function that handles:
1. Mobile app requests (often no Origin header or specific scheme)
2. Web app requests (match `WEB_URL`)
3. Development origins (localhost)

```typescript
// apps/api/src/index.ts

// ... imports

function getCorsOptions() {
    return {
        origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
            // Allow requests with no origin (like mobile apps, curl)
            if (!origin) {
                cb(null, true);
                return;
            }

            const allowedOrigins = [
                process.env.WEB_URL,
                process.env.MOBILE_APP_SCHEME, // e.g., "schoolconnect://"
                process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
                process.env.NODE_ENV === "development" ? "http://localhost:8081" : null, // Expo
            ].filter(Boolean) as string[];

            if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
                cb(null, true);
                return;
            }

            cb(new Error("Not allowed by CORS"), false);
        },
        credentials: true,
    };
}

// ... inside main()
await server.register(cors, getCorsOptions());
```

**Step 2: Verify**
Test with `curl` (no origin) -> should pass.
Test with invalid origin -> should fail.

### Task 3: Fix C3 - Idempotent Seed Script

**Files:**
- Modify: `packages/db/prisma/seed.ts`

**Step 1: Replace deleteMany + create with upsert**
Modify the script to `upsert` all entities based on unique fields (email, URN, etc.).
For entities without natural unique keys (like `AttendanceRecord`), we might need to rely on `deleteMany` but scoped to the specific seed data (e.g., delete only attendance for the seed children).

**Strategy:**
1. Upsert School (URN) -> Get ID
2. Upsert Users (Email) -> Get IDs
3. Upsert StaffMember (Unique `userId_schoolId`)
4. Upsert Children (Assume `firstName_lastName_schoolId` is unique enough for seeding, or find by name first)
5. Link ParentChild (Unique `userId_childId`)
6. Message: Check if message with same subject exists for school, if not create.
7. Attendance: Delete attendance *only for seed children* for the specific date, then create.

```typescript
// packages/db/prisma/seed.ts

// ...
const school = await tx.school.upsert({
    where: { urn: "123456" },
    // ...
});

// ... users ...

// Staff
const staff = await tx.staffMember.findFirst({
    where: { userId: admin.id, schoolId: school.id }
});
if (!staff) {
    await tx.staffMember.create({ ... });
}

// Children - find by name to avoid duplicates
const child1Existing = await tx.child.findFirst({
    where: { firstName: "Emily", lastName: "Johnson", schoolId: school.id }
});
let child1;
if (child1Existing) {
    child1 = await tx.child.update({ where: { id: child1Existing.id }, data: { ... } });
} else {
    child1 = await tx.child.create({ ... });
}

// ... same for child2

// ParentChild
await tx.parentChild.upsert({
    where: { userId_childId: { userId: parent.id, childId: child1.id } },
    create: { userId: parent.id, childId: child1.id, relation: "PARENT" },
    update: {},
});

// ... and so on
```

**Step 2: Verify**
Run `pnpm db:seed` twice. It should succeed both times and not duplicate data.

