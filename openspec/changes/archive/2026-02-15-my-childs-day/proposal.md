## Why

The parent home screen is transactional - parents open the app to complete a task then leave. There's no emotional connection to their child's school day, no engagement loop that brings parents back, and common actions (payments, forms, absences) require navigating to separate pages. Teachers have no way to share classroom moments with parents, missing a key opportunity for school-home connection.

## What Changes

- **New parent home screen**: Replace the current static dashboard with a chronological activity feed that merges class posts, messages, attendance events, payment reminders, and calendar events into one stream
- **Class posts**: Teachers can share photos, videos, and text updates scoped to a class (yearGroup + className), visible to all parents in that class
- **Emoji reactions**: Parents react to class posts with emoji (heart, thumbs up, clap, laugh, wow) - one reaction per parent per post
- **Pinned action items**: Outstanding payments, unsigned forms, and unacknowledged urgent messages pinned at the top of the home screen until actioned
- **Child switcher**: Prominent child selector at top of home screen for multi-child parents
- **Media upload**: New upload infrastructure for teacher photos/videos (S3/R2 storage with image resizing)
- **Staff compose flow**: "Post to Class" interface for teachers with photo/video picker and class selector

## Capabilities

### New Capabilities

- `class-posts`: Teacher class updates with photos/videos, scoped to yearGroup + className. Includes creation, deletion, listing, and parent feed queries.
- `post-reactions`: Emoji reactions on class posts. One reaction per parent per post. Reaction counts returned with posts.
- `activity-feed`: Unified chronological feed merging class posts, messages, attendance, payments, and calendar events. Cursor-paginated, child-scoped.
- `action-items`: Computed view of outstanding parent actions (unpaid payments, pending forms, unread urgent messages). Pinned at top of home screen.
- `media-upload`: File upload endpoint for images/videos. S3/R2 storage with server-side resizing (1200px + 400px thumbnail).

### Modified Capabilities

_(none - existing specs are unaffected)_

## Impact

- **Database**: New `ClassPost`, `ClassPostReaction` models, new `ClassPostEmoji` enum
- **API**: New `classPost` tRPC router (6 procedures), modified `dashboard` router (2 new procedures: `getFeed`, `getActionItems`)
- **Web**: Redesigned parent home screen with feed, action items, child switcher. New staff compose flow.
- **Mobile**: Matching home screen redesign with feed and compose flow
- **Infrastructure**: S3/R2 bucket for media storage, image processing dependency (sharp or similar)
- **Dependencies**: AWS SDK or Cloudflare R2 client, image resizing library
