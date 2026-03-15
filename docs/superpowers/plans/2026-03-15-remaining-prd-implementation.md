# Remaining PRD Items — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining PRD items — Event RSVPs, Achievement System, Photo/Video Sharing, MIS SIMS Adapter, API Documentation, Frontend Component Tests, and PRD Checklist Update.

**Architecture:** Seven independent feature modules added to the existing SchoolConnect monorepo. Each follows established patterns: Prisma schema → feature toggle → tRPC router → Next.js page → tests. Photo/Video adds a shared media upload service backed by Cloudflare R2.

**Tech Stack:** Prisma (schema), tRPC (routers), Zod (validation), Next.js App Router (pages), Tailwind + shadcn/ui (UI), Vitest (API + component tests), Playwright (E2E), @aws-sdk/client-s3 (R2), @fastify/swagger + @fastify/swagger-ui (API docs).

**Build Order:** Event RSVPs → Achievements → Photo/Video → MIS SIMS → API Docs → Component Tests → PRD Update

**Spec:** `docs/superpowers/specs/2026-03-15-remaining-prd-items-design.md`

---

## Chunk 1: Event RSVPs

### Task 1: Schema — EventRsvp model

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add RsvpResponse enum and EventRsvp model**

After the Event model (around line 496), add:

```prisma
enum RsvpResponse {
  YES
  NO
  MAYBE
}

model EventRsvp {
  id        String       @id @default(cuid())
  eventId   String
  event     Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  childId   String
  child     Child        @relation(fields: [childId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation("EventRsvpUser", fields: [userId], references: [id])
  response  RsvpResponse
  note      String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([eventId, childId])
  @@index([eventId])
  @@index([childId])
  @@map("event_rsvp")
}
```

- [ ] **Step 2: Add fields to Event model**

In the Event model, add before `createdAt`:

```prisma
  maxCapacity   Int?
  rsvpRequired  Boolean  @default(false)
  rsvps         EventRsvp[]
```

- [ ] **Step 3: Add relations to Child and User**

In Child model, add: `eventRsvps EventRsvp[]`
In User model, add: `eventRsvps EventRsvp[] @relation("EventRsvpUser")`

- [ ] **Step 4: Generate Prisma client**

Run: `npx pnpm --filter @schoolconnect/db db:generate`

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "schema: add EventRsvp model with capacity support"
```

---

### Task 2: RSVP Router procedures + tests

**Files:**
- Modify: `apps/api/src/router/calendar.ts`
- Create: `apps/api/src/__tests__/event-rsvp.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/__tests__/event-rsvp.test.ts` with tests for:
- `rsvpToEvent` — creates/updates RSVP for a child
- `rsvpToEvent` — rejects when at capacity
- `getRsvps` — returns RSVPs for parent's children
- `getRsvpSummary` — returns headcount by response

Follow the mock pattern from `apps/api/src/__tests__/meal-booking.test.ts`. Mock `../lib/redis`. Include all feature toggles in the school mock.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/__tests__/event-rsvp.test.ts`

- [ ] **Step 3: Add RSVP procedures to calendar router**

In `apps/api/src/router/calendar.ts`, add three new procedures:

`rsvpToEvent` — `protectedProcedure`. Input: `{ eventId: string, childId: string, response: "YES" | "NO" | "MAYBE", note?: string }`. Verify parentChild. Check event.maxCapacity — if set and response is YES, count existing YES RSVPs, reject if at capacity. Upsert EventRsvp.

`getRsvps` — `protectedProcedure`. Input: `{ eventId: string }`. Get parent's children IDs, return RSVPs for those children on this event.

`getRsvpSummary` — `schoolFeatureProcedure` with `assertFeatureEnabled(ctx, "calendar")`. Input: `{ schoolId: string, eventId: string }`. Group RSVPs by response, return counts + attendee list + remaining capacity.

- [ ] **Step 4: Run tests, verify pass**

Run: `cd apps/api && npx vitest run src/__tests__/event-rsvp.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/router/calendar.ts apps/api/src/__tests__/event-rsvp.test.ts
git commit -m "feat: add event RSVP procedures with capacity enforcement"
```

---

### Task 3: RSVP Web UI updates

**Files:**
- Modify: `apps/web/src/app/dashboard/calendar/page.tsx`

- [ ] **Step 1: Add RSVP buttons to event detail (parent view)**

In the calendar page's event detail section, add:
- Three buttons: Yes / No / Maybe (highlighted when selected)
- Optional note field
- Show current RSVP status if already responded
- "X/Y attending" badge if rsvpRequired is true

Use: `trpc.calendar.rsvpToEvent.useMutation()`, `trpc.calendar.getRsvps.useQuery({ eventId })`

- [ ] **Step 2: Add headcount badge to event list (staff view)**

For events with `rsvpRequired: true`, show a badge with attendee count.
Use: `trpc.calendar.getRsvpSummary.useQuery({ schoolId, eventId })`

- [ ] **Step 3: Add rsvpRequired + maxCapacity to createEvent form (staff)**

Add checkbox "Require RSVP" and optional "Max capacity" number input to the create event form.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/calendar/page.tsx
git commit -m "feat: add RSVP UI to calendar page with capacity display"
```

---

### Task 4: RSVP seed data + E2E tests

**Files:**
- Modify: `e2e/helpers/seed-data.ts`
- Modify: `packages/db/prisma/seed.ts`
- Create: `e2e/event-rsvp-journey.test.ts`

- [ ] **Step 1: Add seed helpers**

In `e2e/helpers/seed-data.ts`, add `seedEventWithRsvp()` that creates an Event with `rsvpRequired: true` and optional `maxCapacity`.

- [ ] **Step 2: Add seed data**

In `packages/db/prisma/seed.ts`, add an event with `rsvpRequired: true, maxCapacity: 30`.

- [ ] **Step 3: Write E2E tests**

Create `e2e/event-rsvp-journey.test.ts` with:
1. "parent should RSVP to an event" — setup school, seed event with rsvpRequired, navigate to calendar, click event, click Yes, verify response shown
2. "staff should see RSVP headcount" — login as staff, seed event + RSVPs, verify headcount badge

- [ ] **Step 4: Commit**

```bash
git add e2e/helpers/seed-data.ts packages/db/prisma/seed.ts e2e/event-rsvp-journey.test.ts
git commit -m "test: add event RSVP E2E tests and seed data"
```

---

## Chunk 2: Achievement/Reward System

### Task 5: Schema — Achievement models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add feature toggle to School model**

```prisma
  achievementsEnabled       Boolean  @default(false)
```

- [ ] **Step 2: Add enums and models**

After the last model in schema.prisma, add:

```prisma
// ─── Achievements ──────────────────────────────────────────

enum AchievementType {
  POINTS
  BADGE
}

model AchievementCategory {
  id         String          @id @default(cuid())
  schoolId   String
  school     School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name       String
  icon       String?
  pointValue Int             @default(1)
  type       AchievementType @default(POINTS)
  isActive   Boolean         @default(true)
  createdAt  DateTime        @default(now())

  awards     Achievement[]

  @@unique([schoolId, name])
  @@map("achievement_category")
}

model Achievement {
  id         String              @id @default(cuid())
  schoolId   String
  school     School              @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  childId    String
  child      Child               @relation(fields: [childId], references: [id], onDelete: Cascade)
  categoryId String
  category   AchievementCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  awardedBy  String
  awarder    User                @relation("AchievementAwarder", fields: [awardedBy], references: [id])
  points     Int                 @default(1)
  reason     String?
  createdAt  DateTime            @default(now())

  @@index([childId, createdAt])
  @@index([schoolId, createdAt])
  @@map("achievement")
}
```

- [ ] **Step 3: Add relations**

School: `achievementCategories AchievementCategory[]`, `achievements Achievement[]`
Child: `achievements Achievement[]`
User: `achievementsAwarded Achievement[] @relation("AchievementAwarder")`

- [ ] **Step 4: Generate and commit**

```bash
npx pnpm --filter @schoolconnect/db db:generate
git add packages/db/prisma/schema.prisma
git commit -m "schema: add AchievementCategory and Achievement models"
```

---

### Task 6: Feature toggle registration

**Files:**
- Modify: `apps/api/src/lib/feature-guards.ts`
- Modify: `apps/api/src/trpc.ts`
- Modify: `apps/api/src/router/settings.ts`
- Modify: `apps/web/src/lib/feature-toggles.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add "achievements" to feature-guards.ts**

Add to FeatureName type, SchoolFeatures interface, featureFieldMap, and featureLabel.

- [ ] **Step 2: Add to trpc.ts select clause**

Add `achievementsEnabled: true` to the school select in schoolFeatureProcedure.

- [ ] **Step 3: Add to settings.ts**

Add to the feature toggle select constant and the Zod schema in updateFeatureToggles.

- [ ] **Step 4: Add to feature-toggles.tsx**

Add `achievementsEnabled: boolean` to FeatureToggles interface and `achievementsEnabled: false` to defaults.

- [ ] **Step 5: Add nav items to layout.tsx**

Parent nav: `{ name: "Achievements", href: "/dashboard/achievements", icon: "emoji_events", featureKey: "achievementsEnabled" }`
Staff nav: `{ name: "Awards", href: "/dashboard/achievements", icon: "emoji_events", featureKey: "achievementsEnabled" }`
Add `"achievementsEnabled"` to the featureKey type union.

- [ ] **Step 6: Add toggle to settings page**

Add state `const [achievements, setAchievements] = useState(false)`, sync in useEffect, add to mutation, add Toggle component.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts apps/api/src/router/settings.ts apps/web/src/lib/feature-toggles.tsx apps/web/src/app/dashboard/layout.tsx apps/web/src/app/dashboard/settings/page.tsx
git commit -m "feat: register achievements feature toggle across stack"
```

---

### Task 7: Achievement router + tests

**Files:**
- Create: `apps/api/src/router/achievement.ts`
- Create: `apps/api/src/__tests__/achievement.test.ts`
- Modify: `apps/api/src/router/index.ts`

- [ ] **Step 1: Write failing tests**

Tests for: createCategory, awardAchievement (copies points from category), getChildAchievements (with total points + pagination), getClassLeaderboard, deactivateCategory

- [ ] **Step 2: Write the achievement router**

7 procedures:
- `createCategory` — `schoolAdminProcedure` + assertFeatureEnabled("achievements")
- `listCategories` — `schoolFeatureProcedure`, filter isActive
- `awardAchievement` — `schoolFeatureProcedure`, lookup category.pointValue, create Achievement with copied points
- `getChildAchievements` — `protectedProcedure`, verify parentChild, cursor-based pagination, include total points sum
- `getClassLeaderboard` — `schoolFeatureProcedure`, group by childId, sum points, order desc, limit 20
- `getRecentAwards` — `protectedProcedure`, get parent's children, return latest 10 awards
- `deactivateCategory` — `schoolAdminProcedure`, set isActive = false

- [ ] **Step 3: Register in router/index.ts**

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/router/achievement.ts apps/api/src/__tests__/achievement.test.ts apps/api/src/router/index.ts
git commit -m "feat: add achievement router with awards, leaderboard, and category management"
```

---

### Task 8: Achievements web page

**Files:**
- Create: `apps/web/src/app/dashboard/achievements/page.tsx`

- [ ] **Step 1: Create achievements page**

**Parent view:**
- Child selector
- Total points card with large number
- Badge wall — grid of earned badge-type achievements with icon + name
- Recent awards list — date, category icon, category name, points, reason, awarded by

**Staff view:**
- Quick-award form: child selector → category dropdown → optional reason → "Award" button
- Class leaderboard table: rank, child name, total points, last award date
- Categories section: list of categories with "Add Category" form (name, icon, type, pointValue) and deactivate buttons

Feature gate: `achievementsEnabled`

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/achievements/page.tsx
git commit -m "feat: add achievements page with awards, leaderboard, and badge wall"
```

---

### Task 9: Achievement seed + E2E

**Files:**
- Modify: `e2e/helpers/seed-data.ts`
- Modify: `packages/db/prisma/seed.ts`
- Create: `e2e/achievement-journey.test.ts`

- [ ] **Step 1: Add seed helpers + data**

`seedAchievementCategory()`, `seedAchievement()` in seed-data.ts.
Add 3 categories ("Star of the Week", "Reading Champion", "Kindness Award") + sample awards to seed.ts.
Enable `achievementsEnabled: true` in school seed.

- [ ] **Step 2: Write E2E tests**

1. "staff should award an achievement to a student"
2. "parent should see their child's achievements and total points"

- [ ] **Step 3: Commit**

```bash
git add e2e/ packages/db/prisma/seed.ts
git commit -m "test: add achievement E2E tests and seed data"
```

---

## Chunk 3: Photo/Video Sharing

### Task 10: Schema — Media, Gallery, MessageAttachment models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add galleryEnabled toggle to School**

```prisma
  galleryEnabled            Boolean  @default(false)
```

- [ ] **Step 2: Add MediaUpload model**

```prisma
model MediaUpload {
  id           String   @id @default(cuid())
  schoolId     String
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  uploadedBy   String
  uploader     User     @relation("MediaUploader", fields: [uploadedBy], references: [id])
  key          String   @unique
  filename     String
  mimeType     String
  sizeBytes    Int
  width        Int?
  height       Int?
  thumbnailKey String?
  createdAt    DateTime @default(now())

  galleryPhotos      GalleryPhoto[]
  messageAttachments MessageAttachment[]

  @@index([schoolId, createdAt])
  @@map("media_upload")
}
```

- [ ] **Step 3: Add GalleryAlbum + GalleryPhoto models**

```prisma
model GalleryAlbum {
  id          String   @id @default(cuid())
  schoolId    String
  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  createdBy   String
  creator     User     @relation("AlbumCreator", fields: [createdBy], references: [id])
  title       String
  description String?
  yearGroup   String?
  className   String?
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  photos      GalleryPhoto[]

  @@index([schoolId, createdAt])
  @@map("gallery_album")
}

model GalleryPhoto {
  id        String       @id @default(cuid())
  albumId   String
  album     GalleryAlbum @relation(fields: [albumId], references: [id], onDelete: Cascade)
  mediaId   String
  media     MediaUpload  @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  caption   String?
  sortOrder Int          @default(0)
  createdAt DateTime     @default(now())

  @@index([albumId, sortOrder])
  @@map("gallery_photo")
}
```

- [ ] **Step 4: Add MessageAttachment model**

```prisma
model MessageAttachment {
  id        String      @id @default(cuid())
  messageId String
  message   Message     @relation(fields: [messageId], references: [id], onDelete: Cascade)
  mediaId   String
  media     MediaUpload @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())

  @@unique([messageId, mediaId])
  @@map("message_attachment")
}
```

- [ ] **Step 5: Add all relations to School, User, Child, Message**

School: `mediaUploads MediaUpload[]`, `galleryAlbums GalleryAlbum[]`
User: `mediaUploads MediaUpload[] @relation("MediaUploader")`, `galleryAlbums GalleryAlbum[] @relation("AlbumCreator")`
Message: `attachments MessageAttachment[]`

- [ ] **Step 6: Generate and commit**

```bash
npx pnpm --filter @schoolconnect/db db:generate
git add packages/db/prisma/schema.prisma
git commit -m "schema: add MediaUpload, GalleryAlbum, GalleryPhoto, MessageAttachment models"
```

---

### Task 11: Gallery feature toggle registration

Same pattern as Task 6 but for `"gallery"` / `galleryEnabled`. Add nav item "Gallery" with icon `"photo_library"` to parent and staff nav.

- [ ] **Step 1–7: Follow Task 6 pattern for gallery**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: register gallery feature toggle across stack"
```

---

### Task 12: Media upload service

**Files:**
- Create: `apps/api/src/lib/media.ts`

- [ ] **Step 1: Create media service**

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function getPresignedUploadUrl(schoolId: string, filename: string, mimeType: string, sizeBytes: number) {
  // Validate
  if (!ALLOWED_TYPES.includes(mimeType)) throw new Error("File type not allowed");
  const maxSize = mimeType.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (sizeBytes > maxSize) throw new Error("File too large");

  const ext = filename.split(".").pop() || "bin";
  const key = `schools/${schoolId}/media/${createId()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

  return { uploadUrl, key };
}

export function getMediaUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
```

- [ ] **Step 2: Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner**

Run: `npx pnpm --filter @schoolconnect/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/media.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add R2 media upload service with presigned URLs"
```

---

### Task 13: Media + Gallery routers + tests

**Files:**
- Create: `apps/api/src/router/media.ts`
- Create: `apps/api/src/router/gallery.ts`
- Create: `apps/api/src/__tests__/media.test.ts`
- Create: `apps/api/src/__tests__/gallery.test.ts`
- Modify: `apps/api/src/router/index.ts`
- Modify: `apps/api/src/router/messaging.ts` (add attachment support)

- [ ] **Step 1: Write media router**

2 procedures:
- `getUploadUrl` — `schoolFeatureProcedure`, validates type/size, calls `getPresignedUploadUrl()`
- `confirmUpload` — `schoolFeatureProcedure`, verifies key prefix matches schoolId, creates MediaUpload record

- [ ] **Step 2: Write gallery router**

6 procedures:
- `createAlbum` — `schoolStaffProcedure` + assertFeatureEnabled("gallery")
- `addPhotos` — `schoolStaffProcedure`, input: albumId, array of { mediaId, caption? }
- `listAlbums` — `protectedProcedure`, resolve school from parent/staff, check galleryEnabled, parents see only published + matching yearGroup
- `getAlbum` — `protectedProcedure`, verify school membership, parents only see published
- `publishAlbum` — `schoolStaffProcedure`
- `deleteAlbum` — `schoolStaffProcedure`
- `deletePhoto` — `schoolStaffProcedure`

- [ ] **Step 3: Extend messaging router with attachments**

In `messaging.send`, add optional `attachmentIds: z.array(z.string()).default([])` to input. After creating message, create MessageAttachment records. In `listReceived`/`listSent`, include attachments with media URLs.

- [ ] **Step 4: Write tests**

7 API tests across media.test.ts and gallery.test.ts (mock @aws-sdk/client-s3):
- getUploadUrl validates allowed types, rejects disallowed MIME, rejects oversized
- confirmUpload creates record
- createAlbum + addPhotos
- listAlbums filters published-only for parents
- getAlbum rejects cross-school access

- [ ] **Step 5: Register routers and commit**

```bash
git add apps/api/src/router/media.ts apps/api/src/router/gallery.ts apps/api/src/__tests__/media.test.ts apps/api/src/__tests__/gallery.test.ts apps/api/src/router/index.ts apps/api/src/router/messaging.ts
git commit -m "feat: add media upload, gallery, and message attachment routers"
```

---

### Task 14: Gallery web page

**Files:**
- Create: `apps/web/src/app/dashboard/gallery/page.tsx`
- Modify: `apps/web/src/app/dashboard/messages/new/page.tsx` (attachment button)

- [ ] **Step 1: Create gallery page**

**Parent view:**
- Album grid: thumbnail, title, date, photo count. Filtered by child's year group. Only published albums.
- Click album → photo grid with lightbox. Download button per photo.

**Staff view:**
- Create album form: title, description, year group, class
- Multi-file upload area (drag-and-drop or file picker). Upload each file via getUploadUrl → R2 → confirmUpload → addPhotos.
- Album list with publish toggle and delete button.
- Click album → manage photos, add captions, reorder, delete photos.

Feature gate: `galleryEnabled`

- [ ] **Step 2: Add attachment button to message compose**

In `apps/web/src/app/dashboard/messages/new/page.tsx`, add a paperclip button that opens a file picker. Upload via media.getUploadUrl → R2 → media.confirmUpload. Collect mediaIds. Pass as attachmentIds to messaging.send.

In message display (both sent and received), render attached images/videos inline.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/gallery/page.tsx apps/web/src/app/dashboard/messages/new/page.tsx
git commit -m "feat: add gallery page and message attachment support"
```

---

### Task 15: Gallery seed + E2E

**Files:**
- Modify: `e2e/helpers/seed-data.ts`
- Modify: `packages/db/prisma/seed.ts`
- Create: `e2e/gallery-journey.test.ts`

- [ ] **Step 1: Add seed helpers + data**

- [ ] **Step 2: Write 3 E2E tests**

1. "staff should create album with photos" — creates album, uploads photo (mock file), publishes
2. "parent should view gallery albums" — seed published album, navigate, verify visible
3. "user should send message with attachment" — compose message, attach file, send, verify attachment visible

- [ ] **Step 3: Commit**

```bash
git add e2e/ packages/db/prisma/seed.ts
git commit -m "test: add gallery and message attachment E2E tests"
```

---

## Chunk 4: MIS SIMS Adapter

### Task 16: SIMS adapter + adapter factory

**Files:**
- Create: `apps/api/src/lib/mis/sims-adapter.ts`
- Create: `apps/api/src/lib/mis/adapter-factory.ts`
- Modify: `apps/api/src/router/mis.ts`

- [ ] **Step 1: Create adapter factory**

```typescript
import type { MisAdapter } from "./types";
import { CsvAdapter } from "./csv-adapter";
import { SimsAdapter } from "./sims-adapter";

export function getAdapter(provider: string, apiUrl?: string, credentials?: string): MisAdapter {
  switch (provider) {
    case "CSV_MANUAL":
      return new CsvAdapter();
    case "SIMS":
      if (!apiUrl || !credentials) throw new Error("SIMS requires apiUrl and credentials");
      return new SimsAdapter(apiUrl, credentials);
    default:
      throw new Error(`Unsupported MIS provider: ${provider}`);
  }
}
```

- [ ] **Step 2: Create SIMS adapter**

Implements MisAdapter. Uses `fetch()` to call SIMS API endpoints. Maps SIMS fields (forename/surname/dob/reg_group/year) to MisStudentRecord format. For now, operates against documented SIMS REST API format — will work with mock or real credentials.

- [ ] **Step 3: Update mis.ts router to use adapter factory**

Replace hardcoded `new CsvAdapter()` with `getAdapter(connection.provider, connection.apiUrl, connection.credentials)`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/mis/
git commit -m "feat: add SIMS adapter and adapter factory for MIS integration"
```

---

### Task 17: MIS sync cron + tests

**Files:**
- Create: `apps/api/src/lib/mis-sync-cron.ts`
- Create: `apps/api/src/__tests__/mis-adapter.test.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create cron job**

Every 15 minutes, query MisConnections where next sync is due. For each, run adapter sync, log results. Use `lastSyncAt` + `syncFrequency` to determine if due.

- [ ] **Step 2: Wire into Fastify startup**

In `apps/api/src/index.ts`, import and start the cron in the `onReady` hook.

- [ ] **Step 3: Write tests**

3 tests: adapter factory returns correct type, SIMS adapter maps fields (mock fetch), cron identifies due connections.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/mis-sync-cron.ts apps/api/src/__tests__/mis-adapter.test.ts apps/api/src/index.ts
git commit -m "feat: add MIS auto-sync cron job with SIMS support"
```

---

## Chunk 5: API Documentation

### Task 18: Swagger setup

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install dependencies**

Run: `npx pnpm --filter @schoolconnect/api add @fastify/swagger @fastify/swagger-ui`

- [ ] **Step 2: Register Swagger plugins**

In `apps/api/src/index.ts`, before the tRPC plugin registration:

```typescript
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

app.register(swagger, {
  openapi: {
    info: {
      title: "SchoolConnect API",
      description: "School-parent communication platform API",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:4000" }],
  },
});

app.register(swaggerUi, { routePrefix: "/api/docs" });
```

- [ ] **Step 3: Add OpenAPI route that serves the spec as JSON**

```typescript
app.get("/api/docs/json", async () => {
  return app.swagger();
});
```

- [ ] **Step 4: Write test**

In `apps/api/src/__tests__/api-docs.test.ts`: verify GET `/api/docs/json` returns 200 with valid JSON containing `openapi` key.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json apps/api/src/__tests__/api-docs.test.ts pnpm-lock.yaml
git commit -m "feat: add Swagger UI API documentation at /api/docs"
```

---

## Chunk 6: Frontend Component Tests

### Task 19: Component test setup + tests

**Files:**
- Create: `apps/web/vitest.config.ts` (if not exists)
- Create: `apps/web/src/__tests__/feature-toggles.test.tsx`
- Create: `apps/web/src/__tests__/feature-disabled.test.tsx`
- Create: `apps/web/src/__tests__/search-bar.test.tsx`
- Modify: `apps/web/package.json` (add test script if missing)

- [ ] **Step 1: Create vitest config**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `apps/web/src/__tests__/setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 2: Add test script to package.json**

Add `"test": "vitest run"` if not present.

- [ ] **Step 3: Write FeatureToggleProvider test**

Test: provides defaults when no server data, passes server values through context.

- [ ] **Step 4: Write FeatureDisabled test**

Test: renders feature name in heading, shows disabled message.

- [ ] **Step 5: Write SearchBar test**

Test: debounces input, shows results, handles empty state.

- [ ] **Step 6: Run all component tests**

Run: `cd apps/web && npx vitest run`

- [ ] **Step 7: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/__tests__/ apps/web/package.json
git commit -m "test: add frontend component tests for feature toggles, search bar, and disabled state"
```

---

## Chunk 7: Lint, Build, Final Verification

### Task 20: Lint + build + full test suite

- [ ] **Step 1: Run lint**

Run: `npx pnpm lint:fix` then `npx pnpm lint`

- [ ] **Step 2: Run build**

Run: `npx pnpm build`

- [ ] **Step 3: Run API unit tests**

Run: `cd apps/api && npx vitest run`

- [ ] **Step 4: Run web component tests**

Run: `cd apps/web && npx vitest run`

- [ ] **Step 5: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve lint and build issues from remaining PRD implementation"
```

---

### Task 21: PRD Checklist Update

**Files:**
- Modify: `docs/PRD_CHECKLIST.md`

- [ ] **Step 1: Update the checklist**

- Update "Last Updated" date and all test counts
- Add Phase 3C routers (homework, readingDiary, visitor, mis) + new routers (achievement, gallery, media) to section 5.1
- Add all new models to section 5.2
- Mark Event RSVPs (3.6 #9) as ✅
- Mark Achievement system as ✅ in Phase 3
- Mark Photo/Video sharing as ✅ in Phase 3
- Mark MIS integration as ✅ in Phase 2 and 3.5 #8
- Mark API documentation (#14) as ✅
- Mark frontend component tests (#13) as ✅
- Add all new E2E test files to section 10
- Update Phase 2/3 summaries — all complete
- Update section 9 — only Security Audit remains

- [ ] **Step 2: Commit**

```bash
git add docs/PRD_CHECKLIST.md
git commit -m "docs: update PRD checklist — all items complete except security audit"
```

---

## Summary

| Task | Feature | Files Changed | Tests |
|------|---------|---------------|-------|
| 1 | EventRsvp schema | schema.prisma | — |
| 2 | RSVP router + tests | calendar.ts, event-rsvp.test.ts | 4 API |
| 3 | RSVP web UI | calendar/page.tsx | — |
| 4 | RSVP seed + E2E | seed-data.ts, seed.ts, event-rsvp-journey.test.ts | 2 E2E |
| 5 | Achievement schema | schema.prisma | — |
| 6 | Achievement feature toggle | 6 files | — |
| 7 | Achievement router + tests | achievement.ts, achievement.test.ts, index.ts | 4 API |
| 8 | Achievement web page | achievements/page.tsx | — |
| 9 | Achievement seed + E2E | seed-data.ts, seed.ts, achievement-journey.test.ts | 2 E2E |
| 10 | Media/Gallery schema | schema.prisma | — |
| 11 | Gallery feature toggle | 6 files | — |
| 12 | Media upload service | media.ts | — |
| 13 | Media/Gallery routers + tests | media.ts, gallery.ts, messaging.ts, tests | 7 API |
| 14 | Gallery web page | gallery/page.tsx, messages/new/page.tsx | — |
| 15 | Gallery seed + E2E | seed-data.ts, seed.ts, gallery-journey.test.ts | 3 E2E |
| 16 | SIMS adapter + factory | sims-adapter.ts, adapter-factory.ts, mis.ts | — |
| 17 | MIS cron + tests | mis-sync-cron.ts, mis-adapter.test.ts, index.ts | 3 API |
| 18 | API docs (Swagger) | index.ts, api-docs.test.ts | 1 API |
| 19 | Component tests | vitest.config.ts, 3 test files | 12 component |
| 20 | Lint + build | All | — |
| 21 | PRD update | PRD_CHECKLIST.md | — |

**Total: 21 tasks, ~19 API tests, 7 E2E tests, 12 component tests**
