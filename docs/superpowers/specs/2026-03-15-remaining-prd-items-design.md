# Remaining PRD Items — Batch Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Scope:** 7 features/improvements to complete the Abridge PRD

After this work, only the external security audit remains before production readiness.

---

## Build Order

1. Event RSVPs
2. Achievement/Reward System
3. Photo/Video Sharing (Gallery + Message Attachments)
4. MIS SIMS Adapter
5. API Documentation
6. Frontend Component Tests
7. PRD Checklist Update

---

## 1. Event RSVPs

**Goal:** Parents RSVP to school events per child. Staff see headcount.

### Schema

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

Add to Event model:
```prisma
  maxCapacity   Int?
  rsvpRequired  Boolean  @default(false)
  rsvps         EventRsvp[]
```

Add relations to Child and User for EventRsvp.

### Router

Extend `calendar` router with:

- `rsvpToEvent` — `protectedProcedure`. Input: eventId, childId, response (YES/NO/MAYBE), optional note. Verify parentChild relationship. Upsert EventRsvp.
- `getRsvps` — `protectedProcedure`. Input: eventId. Returns RSVPs for parent's children on that event.
- `getRsvpSummary` — `schoolFeatureProcedure` with `assertFeatureEnabled(ctx, "calendar")`. Input: schoolId, eventId. Returns headcount grouped by response (yes/no/maybe counts), list of attendees, capacity remaining. Enforce maxCapacity in `rsvpToEvent` — reject YES responses when at capacity.

### Web

- Parent: RSVP buttons (Yes/No/Maybe) on event detail in calendar page. Show current response. Note field.
- Staff: Headcount badge on events list (e.g. "12/30 attending"). Click event → RSVP summary table.

### Tests

- 4 API tests: rsvpToEvent creates/updates RSVP, getRsvps returns child RSVPs, getRsvpSummary returns counts, rsvpToEvent rejects when at capacity
- 2 E2E tests: parent RSVPs to event, staff sees headcount

---

## 2. Achievement/Reward System

**Goal:** Staff award points/badges to children. Parents see awards on dashboard.

### Schema

```prisma
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

Feature toggle: `achievementsEnabled Boolean @default(false)` on School.

Add relations to School, Child, User.

### Router (`achievement`)

- `createCategory` — `schoolStaffProcedure`. Create award category for school.
- `listCategories` — `schoolStaffProcedure`. List school's active categories.
- `awardAchievement` — `schoolStaffProcedure`. Award to child with category + optional reason.
- `getChildAchievements` — `protectedProcedure`. Parent views child's awards + total points.
- `getClassLeaderboard` — `schoolStaffProcedure`. Top children by points for a year group.
- `getRecentAwards` — `protectedProcedure`. Dashboard widget showing latest awards for parent's children.
- `deactivateCategory` — `schoolAdminProcedure`. Sets `isActive = false` on a category.

Note: `Achievement.points` is copied from `category.pointValue` at award time (snapshot). `awardAchievement` does not accept a points override. `getChildAchievements` and `getClassLeaderboard` use cursor-based pagination (matching homework pattern). `createCategory` uses `schoolAdminProcedure` (admin-level, not regular staff).

### Web

- Parent: "Achievements" page — child selector, total points card, badge wall (grid of earned badges), recent awards list with date/reason/category.
- Staff: "Awards" page — quick-award form (select child → select category → optional reason → award button), class leaderboard table, create/manage categories section.

Feature gate: `achievementsEnabled`.

### Tests

- 4 API tests: createCategory, awardAchievement, getChildAchievements with total, getClassLeaderboard
- 2 E2E tests: staff awards achievement, parent views achievements

---

## 3. Photo/Video Sharing

**Goal:** (A) Class gallery — teachers upload photos from school activities, parents view. (B) Media attachments on messages.

### Shared Media Service

**Storage:** Cloudflare R2 (S3-compatible, no egress fees).

**Environment variables:**
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

**File:** `apps/api/src/lib/media.ts`

```typescript
// Presigned URL for direct browser → R2 upload
getPresignedUploadUrl(schoolId, filename, mimeType): { uploadUrl, key }

// Public/signed URL for viewing
getMediaUrl(key): string

// Constraints
MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  // 50MB
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]
```

Object key pattern: `schools/{schoolId}/media/{cuid}.{ext}`

### Schema

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

  galleryPhotos GalleryPhoto[]

  @@index([schoolId, createdAt])
  @@map("media_upload")
}

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

Feature toggle: `galleryEnabled Boolean @default(false)` on School.

Add a join model for message attachments (maintains referential integrity and cascade behavior, consistent with MessageChild pattern):

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

Add `attachments MessageAttachment[]` relation to Message and `messageAttachments MessageAttachment[]` to MediaUpload.

### Router (`media`)

- `getUploadUrl` — `schoolFeatureProcedure` (requires schoolId). Input: schoolId, filename, mimeType, sizeBytes. Validates type/size against allowed list. Returns presigned R2 upload URL + key. Presigned URL expires after 5 minutes. Enforces Content-Type and Content-Length conditions on the presigned URL (prevents uploading executables with fake MIME type). Max 10MB images, 50MB video.
- `confirmUpload` — `schoolFeatureProcedure` (requires schoolId). Input: schoolId, key, filename, mimeType, sizeBytes, width?, height?. Verifies the key matches `schools/{schoolId}/media/` prefix. Creates MediaUpload record.

R2 bucket should have a lifecycle rule to expire objects older than 24 hours that have no corresponding MediaUpload record (handles abandoned uploads).

### Router (`gallery`)

- `createAlbum` — `schoolStaffProcedure`. Create album with title, description, year group, class.
- `addPhotos` — `schoolStaffProcedure`. Add mediaIds to album with optional captions.
- `listAlbums` — `protectedProcedure`. Resolves schoolId from parent's child link or staff membership. Checks `galleryEnabled` feature toggle. Parent: only published albums filtered by child's year group (null yearGroup = visible to all). Staff: all albums for the school.
- `getAlbum` — `protectedProcedure`. Verifies user belongs to the album's school (via child or staff link). Parents can only see published albums. Returns album with photos + media URLs.
- `publishAlbum` — `schoolStaffProcedure`. Sets isPublished = true.
- `deleteAlbum` — `schoolStaffProcedure`. Deletes album and all photos.
- `deletePhoto` — `schoolStaffProcedure`. Removes photo from album.

### Message Attachments

Extend `messaging.send` to accept optional `attachmentIds: string[]`. Store on Message model. Extend message display to render images/video inline using `getMediaUrl()`.

### Web

- Parent: "Gallery" page — album grid filtered by child's year group. Click album → photo grid with lightbox viewer. Download button per photo.
- Staff: "Gallery" page — create album form, multi-file upload (drag-and-drop), add captions, publish toggle. Manage/delete existing albums.
- Messages: attachment button in compose form (opens file picker, uploads to R2, attaches). Inline media rendering in message view.

### Tests

- 7 API tests: getUploadUrl validates types + rejects disallowed MIME, getUploadUrl rejects oversized files, confirmUpload creates record, createAlbum + addPhotos, listAlbums filters published-only for parents, getAlbum rejects cross-school access, message with attachments
- 3 E2E tests: staff creates album with photos, parent views gallery, message with attachment

---

## 4. MIS SIMS Adapter

**Goal:** Extend MIS integration with a SIMS adapter. Build against SIMS API format, stub with mock responses until pilot provides real credentials.

### Files

**Refactor `MisAdapter` interface** (`apps/api/src/lib/mis/types.ts`) to support both push (CSV) and pull (API) modes:
```typescript
interface MisAdapter {
  // Push mode: parse provided data (CSV adapter)
  syncStudents(data: string | Buffer): Promise<MisSyncResult<MisStudentRecord>>;
  syncAttendance(data: string | Buffer): Promise<MisSyncResult<MisAttendanceRecord>>;
  // Pull mode: fetch from remote API (SIMS adapter) — data param ignored
  testConnection(): Promise<boolean>;
}
```
The SIMS adapter ignores the `data` parameter and fetches from the API instead. The CSV adapter ignores the API URL. This avoids breaking the interface while supporting both modes.

**`apps/api/src/lib/mis/sims-adapter.ts`** — Implements `MisAdapter` interface:

- `syncStudents(data)` — calls SIMS REST API `GET /api/school/students`. Maps SIMS fields: `forename` → `firstName`, `surname` → `lastName`, `dob` → `dateOfBirth`, `reg_group` → `className`, `year` → `yearGroup`.
- `syncAttendance(data)` — calls SIMS `GET /api/school/attendance`. Maps SIMS attendance codes to our AttendanceMark enum.
- `testConnection()` — calls SIMS `GET /api/ping` with Basic auth from stored credentials. Returns true if 200.

**`apps/api/src/lib/mis/adapter-factory.ts`** — Factory function:

```typescript
function getAdapter(provider: MisProvider, apiUrl?: string, credentials?: string): MisAdapter {
  switch (provider) {
    case "CSV_MANUAL": return new CsvAdapter();
    case "SIMS": return new SimsAdapter(apiUrl!, credentials!);
    default: throw new Error(`Unsupported MIS provider: ${provider}`);
  }
}
```

Update `mis.ts` router to use `getAdapter()` instead of hardcoded `CsvAdapter`.

**`apps/api/src/lib/mis-sync-cron.ts`** — Scheduled sync job:

- On API startup, register a setInterval based on school sync frequencies
- Every 15 minutes: query MisConnections where next sync is due (based on syncFrequency + lastSyncAt)
- For each due connection: instantiate adapter, run syncStudents + syncAttendance, log results to MisSyncLog, update lastSyncAt

Note: `setInterval` cron is acceptable for single-instance deployment. For horizontal scaling, add a Postgres advisory lock or `lastSyncAt` check to prevent duplicate syncs. The existing upsert pattern in attendance sync provides idempotency.

### Tests

- 3 API tests: adapter factory returns correct adapter, SIMS adapter maps fields correctly (with mocked HTTP via `vi.mock`), cron identifies due connections

---

## Cross-Cutting: Feature Toggle Registration

For achievements and gallery, update these files (same as Phase 3C pattern):
- `apps/api/src/lib/feature-guards.ts` — add `"achievements"` and `"gallery"` to FeatureName, SchoolFeatures, featureFieldMap, featureLabel
- `apps/api/src/trpc.ts` — add `achievementsEnabled: true` and `galleryEnabled: true` to schoolFeatureProcedure select
- `apps/api/src/router/settings.ts` — add to toggle select and Zod schema
- `apps/web/src/lib/feature-toggles.tsx` — add to interface + defaults
- `apps/web/src/app/dashboard/layout.tsx` — add nav items with featureKey
- `apps/web/src/app/dashboard/settings/page.tsx` — add toggle switches

## Mobile

Mobile screens (Expo React Native) for these features are **out of scope** for this batch. The web pages come first; mobile screens can be added in a follow-up pass.

---

## 5. API Documentation

**Goal:** Auto-generate OpenAPI 3.0 docs from tRPC routers. Serve Swagger UI at `/api/docs`.

### Implementation

Install: `trpc-openapi`, `@fastify/swagger`, `@fastify/swagger-ui`

Add `.meta()` to each router procedure with:
- `openapi.method` (GET for queries, POST for mutations)
- `openapi.path` (e.g. `/api/messaging/send`)
- `openapi.summary` (one-line description)
- `openapi.tags` (grouping)

Register Swagger plugin in `apps/api/src/index.ts`:
```typescript
app.register(swagger, { openapi: { info: { title: "Abridge API", version: "1.0.0" } } });
app.register(swaggerUi, { routePrefix: "/api/docs" });
```

**Tag groups** (~12 tags for 30+ routers):
- Auth & Setup
- Users & Settings
- Messaging
- Attendance & Calendar
- Forms
- Payments
- Homework & Reading
- Visitors & MIS
- Community & Wellbeing
- Achievements & Gallery
- Analytics & Emergency
- System (health, search, dashboard)

### Tests

- 1 API test: GET `/api/docs/json` returns valid OpenAPI spec with status 200

---

## 6. Frontend Component Tests

**Goal:** Add Vitest + React Testing Library tests for critical web components.

### Setup

Add to `apps/web` devDependencies:
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

Create `apps/web/vitest.config.ts` with jsdom environment.
Add `"test": "vitest run"` to `apps/web/package.json`.
Mock tRPC client via `vi.mock("@/lib/trpc")`.

### Test Files (6 files, ~12 tests)

| File | Component | Tests |
|------|-----------|-------|
| `feature-toggles.test.tsx` | `FeatureToggleProvider` | Provides defaults when no data; passes server values to consumers |
| `layout.test.tsx` | Dashboard NavContent | Renders parent nav (6+ items); renders staff nav; renders admin nav with extra items; filters by feature toggles |
| `dashboard.test.tsx` | Dashboard page | Renders summary cards; handles empty children; shows loading skeleton |
| `form-renderer.test.tsx` | FormRenderer | Renders text/textarea/checkbox/select from JSON schema; validates required fields on submit |
| `search-bar.test.tsx` | SearchBar | Debounces input; shows results; handles empty state |
| `feature-disabled.test.tsx` | FeatureDisabled | Renders feature name in heading; shows correct disabled message |

### Not Testing

- Feature pages (homework, reading, etc.) — covered by E2E
- Styling/layout — visual, not logic
- Exhaustive edge cases — diminishing returns

---

## 7. PRD Checklist Update

**Goal:** Update `docs/PRD_CHECKLIST.md` to reflect all completed work.

### Changes

- Update "Last Updated" date and test counts (E2E + unit)
- Add Phase 3C routers to section 5.1: homework, readingDiary, visitor, mis, achievement, gallery, media
- Add Phase 3C + new models to section 5.2
- Mark Event RSVPs (3.6 #9) as ✅
- Mark Achievement system (Phase 3) as ✅
- Mark Photo/Video sharing (Phase 3) as ✅
- Mark MIS integration (Phase 2 and 3.5 #8) as ✅
- Mark API documentation (9 #14) as ✅
- Mark frontend component tests (9 #13) as ✅
- Add new E2E test files to section 10
- Update Phase 2/3 summary — all complete
- Update section 9 — only Security Audit remains

Done last, after everything ships.

---

## Summary

| # | Feature | Models | Router Procs | Pages | API Tests | E2E Tests | Component Tests |
|---|---------|--------|-------------|-------|-----------|-----------|-----------------|
| 1 | Event RSVPs | 1 + 1 enum | 3 (extend calendar) | Update calendar | 4 | 2 | — |
| 2 | Achievements | 2 + 1 enum | 7 (new router) | 2 new pages | 4 | 2 | — |
| 3 | Photo/Video | 4 + media service | 9 (media + gallery) | Gallery page + msg attachments | 7 | 3 | — |
| 4 | MIS SIMS | 0 | 0 (refactor) | 0 | 3 | 0 | — |
| 5 | API Docs | 0 | 0 | Swagger UI | 1 | 0 | — |
| 6 | Component Tests | 0 | 0 | 0 | 0 | 0 | 12 |
| 7 | PRD Update | 0 | 0 | 0 | 0 | 0 | — |
| **Total** | | **7 models, 3 enums** | **19 procs** | **3 pages + updates** | **19** | **7** | **12** |

**New env vars:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

**After completion:** Only the external security audit remains before production.
