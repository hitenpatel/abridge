# My Child's Day - Living Feed with Class Updates

## Problem

The current parent home screen is functional but transactional. Parents open the app to complete a task then leave. There's no emotional connection to their child's school day, no reason to check in regularly, and common actions require navigating to separate pages.

## Solution

Replace the parent home screen with a living, chronological activity feed that tells the story of a child's school day. Teachers post photos and videos of class activities. Parents react with emoji to show engagement. Outstanding action items (payments, forms, urgent messages) are pinned at the top so nothing gets missed.

## New Data Models

### ClassPost

Teacher shares a class update with photos/videos.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| schoolId | String | FK to School |
| authorId | String | FK to User (staff) |
| body | String? | Optional text caption |
| yearGroup | String | Scoping - matches Child.yearGroup |
| className | String | Scoping - matches Child.className |
| mediaUrls | Json | Array of image/video URLs |
| createdAt | DateTime | |

- Index: `[schoolId, yearGroup, className, createdAt]`
- Relations: belongs to School, belongs to User (author), has many ClassPostReaction

### ClassPostReaction

Parent reacts to a class post.

| Field | Type | Notes |
|---|---|---|
| id | String (CUID) | PK |
| postId | String | FK to ClassPost |
| userId | String | FK to User |
| emoji | ClassPostEmoji | Enum |
| createdAt | DateTime | |

- Unique constraint: `[postId, userId]` (one reaction per parent per post)

### ClassPostEmoji Enum

`HEART`, `THUMBS_UP`, `CLAP`, `LAUGH`, `WOW`

## API Design

### New Router: `classPost`

**Staff procedures (schoolStaffProcedure):**

| Procedure | Type | Input | Description |
|---|---|---|---|
| create | mutation | schoolId, body?, yearGroup, className, mediaUrls[] | Create a class post |
| delete | mutation | schoolId, postId | Delete own post |
| listByClass | query | schoolId, yearGroup, className, cursor? | Posts for a class with reaction counts |

**Parent procedures (protectedProcedure):**

| Procedure | Type | Input | Description |
|---|---|---|---|
| feed | query | childId, cursor? | Posts for child's class, paginated. Includes own reaction |
| react | mutation | postId, emoji | Add or change reaction |
| removeReaction | mutation | postId | Remove own reaction |

### Modified Endpoints

| Router | Procedure | Description |
|---|---|---|
| dashboard.getFeed | query | Unified feed. Takes childId, cursor?. Merges class posts, messages, attendance, payments, calendar events. Returns typed cards sorted by time, cursor-paginated |
| dashboard.getActionItems | query | Takes childId. Returns outstanding payments, pending forms, unacknowledged urgent messages |

### Media Upload

New non-tRPC route: `POST /api/media/upload`
- Accepts multipart form data
- Uploads to S3/R2 object storage
- Returns URL
- Images resized server-side: max 1200px width + 400px thumbnail
- Signed upload URLs as alternative for mobile (presigned S3 PUT)

## UI Design

### Parent Home Screen (Web + Mobile)

**A. Header - Child Switcher**
- Child avatar + name + class (e.g. "Emily - Class 2B")
- Horizontal swipeable pills for multi-child parents
- Tapping avatar links to child profile

**B. Pinned Action Items**
- Compact horizontally scrollable row of cards
- Each card: icon + label + action button
  - Payment: "Science Museum Trip - £15.00" → Pay Now
  - Form: "Photo Consent Form" → Sign Now
  - Urgent message: "School Closure Tomorrow" → Read
- Colour-coded left border: red (urgent), amber (payments), blue (forms)
- Cards dismiss with animation when actioned
- Section hidden when no action items exist

**C. Activity Feed**
- Chronological, newest first, infinite scroll
- Card types:
  1. **Class Post** - Teacher photo/video + caption. Photo grid (1-4 images, tap to expand). Video thumbnail with play button. Emoji reaction bar with counts. Instagram-like feel.
  2. **Message** - Subject + preview + category badge. Tap to expand/read.
  3. **Attendance** - "Emily marked present at 8:50am". Compact with status dot.
  4. **Payment reminder** - "Trip payment due in 3 days - £15.00" with inline Pay button.
  5. **Calendar event** - "Sports Day - Friday 20 June" with category badge.

**D. Quick Action**
- Floating action button or sticky bar with "Report Absence"

### Staff: Post to Class

**Compose flow:**
- Prominent "Post to Class" button on staff home screen
- Class selector dropdown (their classes, or "All Classes")
- Photo/video picker: multi-select up to 10 images or 1 video
- Camera capture option for in-the-moment photos
- Optional caption text field
- Post button with confirmation toast

**Staff feed view:**
- Same feed scoped to school, own posts highlighted
- Reaction counts + "seen by X of Y parents" per post
- Can delete own posts

## Scoping Decisions

- **No parent comments** - reactions only. Keeps moderation simple and safe.
- **One reaction per parent per post** (like LinkedIn) - simple, counts are meaningful.
- **Feature toggle**: gated behind existing `messagingEnabled` toggle. Could get its own toggle later.
- **No analytics integration in v1** - data model supports it for future.
- **No push notifications for class posts in v1** - parents discover them in the feed.

## Feed Assembly

Server-side merge of multiple data sources:
1. Query each source (class posts, messages, attendance, payments, events) for the time window
2. Merge into a single sorted list by timestamp
3. Tag each item with type discriminator
4. Cursor-based pagination using timestamp + id for stable ordering
5. Child-scoped: attendance/payments for the child, messages sent to the child, class posts matching child's yearGroup + className
