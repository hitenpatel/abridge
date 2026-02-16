## Context

SchoolConnect's parent home screen currently serves a summary dashboard (`dashboard.getSummary`) that returns metrics (unread messages, payment counts, attendance alerts), today's attendance, upcoming events, and attendance percentages. This is consumed by both the web and mobile apps.

The change introduces a fundamentally different home screen model: a chronological activity feed with class posts, pinned action items, and inline interactions. This is a cross-cutting change touching the database, API, web, mobile, and introducing new infrastructure (media storage).

The existing `dashboard.getSummary` endpoint will be preserved for backward compatibility during migration but eventually replaced by `dashboard.getFeed` + `dashboard.getActionItems`.

## Goals / Non-Goals

**Goals:**
- Unified activity feed that merges 5 data sources into a single paginated stream
- Class post creation with photo/video upload for teachers
- Emoji reactions on class posts for parents
- Pinned action items that surface outstanding parent tasks
- Child-scoped views for multi-child parents
- Works on both web and mobile with the same API

**Non-Goals:**
- Parent-to-parent messaging or comments on posts
- Push notifications for class posts (can be added later)
- Analytics integration for class post engagement metrics
- Video transcoding or streaming (videos served as-is)
- Moderation tools (only staff can post, parents can only react)
- Real-time updates via WebSockets (feed refreshes on pull/navigation)

## Decisions

### 1. Feed assembly: server-side merge vs client-side merge

**Decision: Server-side merge in `dashboard.getFeed`**

The feed combines 5 data sources (class posts, messages, attendance records, payment items, calendar events) into a single chronological stream. Two options:

- *Client-side*: Return each source separately, merge in React. Simpler API but duplicates sorting/pagination logic across web and mobile, and makes cursor-based pagination very difficult.
- *Server-side*: Single endpoint returns a typed union of feed cards, sorted and paginated. One implementation, consistent behavior.

Server-side wins because cursor pagination across heterogeneous sources must be centralized. The endpoint queries each source for the time window, merges into a sorted array, and returns a page with a cursor (timestamp + id + type) for stable ordering.

### 2. Feed pagination: cursor-based vs offset

**Decision: Cursor-based pagination**

Offset pagination breaks when new items are inserted (duplicates, missed items on subsequent pages). Cursor-based using `(createdAt, id)` is stable regardless of new posts appearing. The cursor encodes the timestamp and id of the last item on the current page.

### 3. Class post scoping: class-level vs school-level vs child-level

**Decision: Class-level scoping using `yearGroup` + `className`**

Posts are scoped to a class by matching `Child.yearGroup` and `Child.className`. This matches how schools naturally organize: a teacher posts about "Year 2, Class 2B" activities. Parents see posts for their child's class.

Alternative considered: school-wide posts. Rejected because parents only care about their child's class, and school-wide announcements already exist via messages.

Alternative considered: per-child targeting (like messages). Rejected because class posts are about shared class activities, not individual children.

### 4. Media storage: S3 vs Cloudflare R2 vs local

**Decision: S3-compatible storage (works with both AWS S3 and Cloudflare R2)**

Use the `@aws-sdk/client-s3` package which is compatible with both S3 and R2. Configuration via environment variables (`S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). This keeps deployment flexible.

Images resized server-side using `sharp`:
- Original stored as-is (for future use)
- Display version: max 1200px width
- Thumbnail: 400px width

Videos stored as-is with no server-side processing. Mobile apps and browsers handle playback natively.

### 5. Upload flow: direct upload vs presigned URLs

**Decision: Presigned URLs for upload**

The API generates a presigned S3 PUT URL. The client uploads directly to S3/R2. This avoids routing large files through the API server and works well for both web (fetch) and mobile (expo-file-system).

Flow:
1. Client calls `classPost.getUploadUrl` with filename and content type
2. API returns a presigned PUT URL + the final public URL
3. Client uploads directly to storage
4. Client calls `classPost.create` with the public URLs in `mediaUrls`

### 6. Reaction model: one per user vs multiple per user

**Decision: One reaction per user per post**

Unique constraint on `[postId, userId]`. If a parent taps a different emoji, it replaces their previous reaction. Simple, clean counts, familiar (LinkedIn model). Slack-style multiple reactions adds complexity without clear value for this use case.

### 7. Feature gating: new toggle vs existing toggle

**Decision: Gate behind `messagingEnabled`**

Class posts are a communication feature. Adding a separate toggle adds schema migration and UI complexity for little value in v1. If schools want to disable class posts specifically, a dedicated `classPostsEnabled` toggle can be added later without breaking changes.

### 8. Action items: separate endpoint vs feed integration

**Decision: Separate `dashboard.getActionItems` endpoint**

Action items (outstanding payments, pending forms, unread urgent messages) are pinned at the top of the screen and persist until resolved. They have different query patterns than the feed (no pagination, no chronological ordering, status-driven). Keeping them separate means:
- Independent refresh cycles (action items refresh on every load, feed paginates)
- Simpler caching strategy
- Cleaner component separation on the frontend

### 9. Parent authorization for feed: how to verify parent can see a child's feed

**Decision: Verify via `ParentChild` join table**

For `dashboard.getFeed` and `dashboard.getActionItems`, the parent passes `childId`. The endpoint verifies the parent has a `ParentChild` record linking them to that child. This is consistent with how `attendance.getAttendanceForChild` works today.

### 10. Existing dashboard endpoint: replace vs preserve

**Decision: Preserve `dashboard.getSummary`, add new endpoints alongside**

The existing `getSummary` endpoint powers the current home screens on both web and mobile. Rather than modifying it (breaking mobile if web ships first), add `getFeed` and `getActionItems` as new endpoints. The home screen components switch to the new endpoints. `getSummary` can be deprecated once both platforms have migrated.

## Risks / Trade-offs

**Feed query performance** → The feed merges 5 queries. For parents with multiple children across different classes, this could be slow. Mitigation: each sub-query is indexed (class posts by `[schoolId, yearGroup, className, createdAt]`, messages by `[schoolId, createdAt]`, etc.). Monitor query times and add Redis caching if needed.

**Media storage costs** → Photos and videos consume storage. Mitigation: enforce file size limits (10MB images, 50MB video), limit to 10 images per post, set lifecycle policies to move old media to cold storage.

**Class post spam** → Teachers could post excessively. Mitigation: not a v1 concern since teachers are trusted staff. Rate limiting or daily post limits can be added if needed.

**Feed staleness** → No real-time updates means parents might miss time-sensitive items. Mitigation: action items (pinned section) refresh on every screen load. Urgent messages still trigger push notifications through the existing notification system.

**Mobile parity** → Both web and mobile need to ship the new home screen. Risk of one platform lagging. Mitigation: API-first approach means both platforms consume the same endpoints. Implement web first, mobile follows with the same data contracts.

## Open Questions

- **Video file size limit**: 50MB is proposed but may need adjustment based on school internet speeds. Could start lower (20MB) and increase.
- **Media retention policy**: How long to keep class post media? Suggest keeping current academic year, archiving after that.
- **Notification for class posts**: Explicitly excluded from v1, but should we add a lightweight "new post" badge/indicator so parents know to check?
