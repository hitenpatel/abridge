## 1. Database Schema

- [x] 1.1 Add ClassPostEmoji enum (HEART, THUMBS_UP, CLAP, LAUGH, WOW) to Prisma schema
- [x] 1.2 Add ClassPost model with id, schoolId, authorId, body, yearGroup, className, mediaUrls (Json), createdAt. Index on [schoolId, yearGroup, className, createdAt]
- [x] 1.3 Add ClassPostReaction model with id, postId, userId, emoji (ClassPostEmoji), createdAt. Unique constraint on [postId, userId]
- [x] 1.4 Run db:generate and db:push to apply schema changes
- [x] 1.5 Add seed data: sample class posts with reactions for Oakwood Primary

## 2. Media Upload Infrastructure

- [x] 2.1 Add S3 environment variables to apps/api/.env (S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)
- [x] 2.2 Create S3 client utility at apps/api/src/lib/s3.ts using @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
- [x] 2.3 Implement getPresignedUploadUrl function: generates PUT URL with content-length conditions (10MB images, 50MB videos), validates allowed content types
- [x] 2.4 Implement image resize utility using sharp: generates 1200px display and 400px thumbnail variants, stores at structured paths ({schoolId}/{yearMonth}/{postId}/{filename})

## 3. Class Post Router

- [x] 3.1 Create apps/api/src/router/class-post.ts with the classPost router
- [x] 3.2 Implement classPost.getUploadUrl (schoolStaffProcedure): validates content type, returns presigned URL and public URL
- [x] 3.3 Implement classPost.create (schoolFeatureProcedure): validates at least one of body/mediaUrls, enforces max 10 mediaUrls, asserts messagingEnabled, creates ClassPost record
- [x] 3.4 Implement classPost.delete (schoolStaffProcedure): verifies author ownership, deletes post and cascading reactions
- [x] 3.5 Implement classPost.listByClass (schoolStaffProcedure): paginated query with reaction counts grouped by emoji, cursor-based
- [x] 3.6 Implement classPost.feed (protectedProcedure): verifies ParentChild link, queries posts matching child's yearGroup/className, includes parent's own reaction and reaction counts
- [x] 3.7 Implement classPost.react (protectedProcedure): verifies parent can see the post's class, upserts reaction on [postId, userId]
- [x] 3.8 Implement classPost.removeReaction (protectedProcedure): deletes reaction if exists, idempotent
- [x] 3.9 Register classPost router in apps/api/src/router/index.ts

## 4. Dashboard Feed & Action Items

- [x] 4.1 Add dashboard.getFeed (protectedProcedure): takes childId and optional cursor, verifies ParentChild link
- [x] 4.2 Implement feed assembly: query class posts, messages, attendance, payments, and events for the child's scope, merge and sort by timestamp descending
- [x] 4.3 Implement cursor-based pagination for the merged feed using (timestamp, id) composite cursor
- [x] 4.4 Define typed feed card union (classPost | message | attendance | payment | event) with type discriminator and timestamp
- [x] 4.5 Add dashboard.getActionItems (protectedProcedure): takes childId, verifies ParentChild link, returns outstanding payments (with remaining balance), pending forms, and unread urgent messages

## 5. API Tests

- [x] 5.1 Write tests for classPost.create: text-only, with media, both, empty rejected, media limit enforced, feature gate
- [x] 5.2 Write tests for classPost.delete: own post, other staff's post rejected
- [x] 5.3 Write tests for classPost.feed: returns posts for child's class, unauthorized child rejected, includes own reaction
- [x] 5.4 Write tests for classPost.react and removeReaction: add, change, remove, idempotent remove, unauthorized class rejected
- [x] 5.5 Write tests for dashboard.getFeed: returns mixed card types, pagination, child-scoped, unauthorized rejected
- [x] 5.6 Write tests for dashboard.getActionItems: outstanding payments, pending forms, unread urgent messages, empty case, unauthorized rejected

## 6. Web - Parent Home Screen Redesign

- [x] 6.1 Create child switcher component: horizontal pills with avatar, name, class label, active state
- [x] 6.2 Create action item card component: icon, label, action button, colour-coded left border (red/amber/blue), dismiss animation
- [x] 6.3 Create action items row component: horizontally scrollable container, hides when empty
- [x] 6.4 Create class post feed card: photo grid (1-4 images with tap-to-expand), video thumbnail with play button, author name, timestamp, caption text
- [x] 6.5 Create emoji reaction bar component: row of 5 emoji buttons with counts, highlighted state for own reaction, tap to toggle
- [x] 6.6 Create message feed card: subject, body preview, category badge, read/unread state
- [x] 6.7 Create attendance feed card: compact card with child name, time, session, colour-coded status dot
- [x] 6.8 Create payment reminder feed card: title, amount, due date, inline Pay button
- [x] 6.9 Create calendar event feed card: title, date, category badge
- [x] 6.10 Create activity feed container: infinite scroll, renders typed cards via type discriminator, loading skeleton
- [x] 6.11 Redesign ParentHomeScreen: child switcher at top, action items row, activity feed below, floating Report Absence button
- [x] 6.12 Wire up tRPC calls: dashboard.getFeed, dashboard.getActionItems, classPost.react, classPost.removeReaction

## 7. Web - Staff Compose Flow

- [x] 7.1 Create class selector component: dropdown of yearGroup + className combinations from the school's children
- [x] 7.2 Create photo/video picker component: file input with multi-select (max 10 images or 1 video), preview thumbnails, remove button
- [x] 7.3 Create post composer page/modal: class selector, media picker, caption text area, post button with loading state
- [x] 7.4 Implement upload flow: call getUploadUrl per file, upload to presigned URL, collect public URLs, call classPost.create
- [x] 7.5 Add "Post to Class" button to StaffHomeScreen, link to composer
- [x] 7.6 Add reaction counts and "seen by" display to staff's view of class posts

## 8. Mobile - Parent Home Screen

- [x] 8.1 Create child switcher component (React Native): horizontal ScrollView with avatar pills
- [x] 8.2 Create action items row (React Native): horizontal FlatList with action cards
- [x] 8.3 Create class post feed card (React Native): image grid, video thumbnail, reaction bar
- [x] 8.4 Create message, attendance, payment, event feed cards (React Native)
- [x] 8.5 Create activity feed with FlatList: infinite scroll via onEndReached, pull-to-refresh
- [x] 8.6 Redesign ParentHomeScreen.tsx: child switcher, action items, feed, Report Absence FAB
- [x] 8.7 Wire up tRPC calls for feed, action items, and reactions

## 9. Mobile - Staff Compose Flow

- [x] 9.1 Create class selector component (React Native)
- [x] 9.2 Create photo/video picker using expo-image-picker: multi-select, preview grid
- [x] 9.3 Create post composer screen: class selector, media picker, caption input, post button
- [x] 9.4 Implement upload flow using expo-file-system: upload to presigned URLs
- [x] 9.5 Add "Post to Class" button to StaffHomeScreen.tsx
