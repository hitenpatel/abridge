# Table-Stakes Features Design: Two-Way Messaging, Parents' Evening, Translation

**Date:** 2026-02-22
**Status:** Approved
**Approach:** Extend existing models (Approach A)
**Implementation order:** Two-Way Messaging → Translation → Parents' Evening

---

## Overview

Three features to close the gap with UK competitors (ParentMail, Arbor, WEDUC, MCAS):

1. **Two-Way Messaging** — Threaded replies on broadcasts + direct 1:1 conversations
2. **Multi-Language Translation** — On-demand server-side translation via Google Translate with caching
3. **Parents' Evening Booking** — Full-featured slot booking with video call links and staff notes

Each feature ships with e2e journey specs as the completion gate.

---

## 1. Two-Way Messaging

### Problem

Messaging is currently one-directional (staff → parent). Every competitor offers two-way communication. Parents cannot reply to messages or contact staff directly.

### Schema Changes

**New enum:**

```prisma
enum MessageType {
  BROADCAST   // existing behaviour (staff → parents via children)
  REPLY       // parent/staff reply to a broadcast thread
  DIRECT      // message within a 1:1 conversation
}
```

**New fields on `Message`:**

```prisma
type           MessageType @default(BROADCAST)
threadId       String?     // self-ref to root BROADCAST message (for REPLY type)
conversationId String?     // links to Conversation (for DIRECT type)
```

**New model:**

```prisma
model Conversation {
  id            String    @id @default(cuid())
  schoolId      String
  parentId      String    // the parent user
  staffId       String    // the staff user
  subject       String?
  lastMessageAt DateTime
  closedAt      DateTime?
  createdAt     DateTime  @default(now())

  school   School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  messages Message[]

  @@unique([schoolId, parentId, staffId])
  @@index([schoolId, lastMessageAt])
  @@map("conversations")
}
```

### Flows

**Threaded replies:**
1. Staff sends a broadcast (existing flow, `type: BROADCAST`)
2. Parent views the message → sees a "Reply" button
3. Parent writes a reply → creates a new `Message` with `type: REPLY`, `threadId: originalMessage.id`, `authorId: parent.userId`
4. Staff views the broadcast → sees reply count, can expand thread
5. Staff can reply back in the thread (also `type: REPLY`)

**Direct conversations:**
1. Parent taps "Message school" → selects a staff member (or school office)
2. Creates a `Conversation` record linking parent ↔ staff
3. Each message in the conversation is a `Message` with `type: DIRECT`, `conversationId`
4. Both sides see the conversation in their inbox
5. Staff can close a conversation when resolved

### New tRPC Procedures

| Procedure | Auth | Description |
|-----------|------|-------------|
| `messaging.reply` | protected | Parent or staff replies to a broadcast thread |
| `messaging.listReplies` | protected | Get replies for a broadcast message |
| `messaging.createConversation` | protected | Parent starts a DM with staff |
| `messaging.sendDirect` | protected | Send a message in a conversation |
| `messaging.listConversations` | protected | List conversations for current user |
| `messaging.getConversation` | protected | Get messages in a conversation |
| `messaging.closeConversation` | schoolStaff | Staff closes a conversation |

### Guards

- Parents can only reply to broadcasts sent to their children
- Parents can only DM staff at their child's school
- Staff see all replies/conversations for their school
- Notifications sent on new replies and direct messages

---

## 2. Multi-Language Translation

### Problem

8 of 10 competitors offer 90–250+ language translation. UK schools serve diverse communities — Polish, Urdu, Bengali, Romanian, Arabic are common. Parents who don't read English fluently miss important messages.

### Architecture

```
Parent requests message → API returns English text
                        → Client detects user.language !== "en"
                        → Client calls translation.translate({ texts, targetLang })
                        → API checks TranslationCache
                            → Hit:  return cached translation
                            → Miss: call Google Translate API, cache result, return
```

Server-side translation (not browser widget) because:
- Consistent across web and mobile
- Caching saves cost — same broadcast to 200 Polish-speaking parents translates once
- Works in push notification previews

### Schema Changes

**New model:**

```prisma
model TranslationCache {
  id         String   @id @default(cuid())
  sourceHash String   // SHA-256 hash of source text
  sourceLang String   @default("en")
  targetLang String   // e.g. "pl", "ur", "ar"
  sourceText String   // original text
  translated String   // translated result
  createdAt  DateTime @default(now())

  @@unique([sourceHash, sourceLang, targetLang])
  @@index([sourceHash, targetLang])
  @@map("translation_cache")
}
```

**New toggle on `School`:**

```prisma
translationEnabled Boolean @default(false)
```

**Existing field used:** `User.language` (already defaults to `"en"`)

### Translation Service

Thin wrapper around Google Cloud Translation API v2 (Basic):
- Batch translate multiple strings in one API call
- Auto-detect source language
- Rate limiting for cost control
- Env var: `GOOGLE_TRANSLATE_API_KEY`

### New tRPC Procedures

| Procedure | Auth | Description |
|-----------|------|-------------|
| `translation.translate` | protected | Translate array of texts to target language (cache-first) |

Input: `{ texts: string[], targetLang: string }`
Output: `{ translations: string[] }`

`settings.updateProfile` extended to include `language` field.

### What Gets Translated

| Content | Mechanism |
|---------|-----------|
| Broadcast messages (subject + body) | Client calls `translate` after fetch |
| Direct messages & replies | Same |
| Class post body | Same |
| Event title + body | Same |
| Form field labels | Same |
| Parents' evening title | Same |
| Push notification text | Translate before sending, based on recipient language |

**Not translated:** UI labels/buttons — handled by standard i18n (next-intl, expo-localization).

### Supported Languages (Top 15 UK school languages)

English, Polish, Urdu, Punjabi, Bengali, Romanian, Arabic, Somali, Portuguese, Tamil, Gujarati, Lithuanian, Turkish, Chinese (Simplified), Spanish

### Cost

- Google Translate v2: ~£20 per 1M characters
- Typical school: ~500 chars/message × 1,000 messages × 5 languages = 2.5M chars ≈ £50/month
- Caching eliminates repeat translations for same content + language

---

## 3. Parents' Evening Booking

### Problem

Parents' evening booking is standard in UK schools. ParentMail, Arbor, and WEDUC all offer it. Schools currently use separate tools (SchoolCloud, etc.) creating fragmentation.

### Schema Changes

**New models:**

```prisma
model ParentsEvening {
  id               String   @id @default(cuid())
  schoolId         String
  title            String
  date             DateTime @db.Date
  slotDurationMin  Int      @default(10)
  breakDurationMin Int      @default(0)
  startTime        String   // "16:00" HH:mm
  endTime          String   // "19:00" HH:mm
  bookingOpensAt   DateTime
  bookingClosesAt  DateTime
  isPublished      Boolean  @default(false)
  allowVideoCall   Boolean  @default(false)
  createdAt        DateTime @default(now())

  school School               @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  slots  ParentsEveningSlot[]

  @@index([schoolId, date])
  @@map("parents_evenings")
}

model ParentsEveningSlot {
  id               String    @id @default(cuid())
  parentsEveningId String
  staffId          String
  startTime        String    // "16:00" HH:mm
  endTime          String    // "16:10" HH:mm
  location         String?   // "Room 4" or null
  videoCallLink    String?   // external Zoom/Teams/Meet link

  parentId         String?   // null = available
  childId          String?
  bookedAt         DateTime?

  staffNotes       String?   // post-meeting notes

  parentsEvening ParentsEvening @relation(fields: [parentsEveningId], references: [id], onDelete: Cascade)

  @@unique([parentsEveningId, staffId, startTime])
  @@index([parentsEveningId, staffId])
  @@map("parents_evening_slots")
}
```

**New toggle on `School`:**

```prisma
parentsEveningEnabled Boolean @default(false)
```

### Flows

**Admin flow:**
1. Create a `ParentsEvening` with date, time range, slot duration, break duration
2. Select participating teachers
3. System auto-generates slots per teacher from time range
4. Optionally add video call links per teacher or per slot
5. Publish → parents notified

**Slot generation:**
```
For each teacher:
  time = startTime
  while time + slotDuration <= endTime:
    create slot(staffId, time, time + slotDuration)
    time += slotDuration + breakDuration
```

**Parent flow:**
1. See upcoming evenings in dashboard/calendar
2. Open booking page → see child's teachers with available slots
3. Book one slot per teacher → confirmation notification
4. Reminders at 24h and 1h before
5. On the day, "Join call" link appears if video enabled

**Post-meeting:**
- Teachers add private notes per completed slot

### New tRPC Procedures

| Procedure | Auth | Description |
|-----------|------|-------------|
| `parentsEvening.create` | schoolAdmin | Create an evening with settings |
| `parentsEvening.addTeachers` | schoolAdmin | Select participating teachers |
| `parentsEvening.publish` | schoolAdmin | Publish evening, generate slots, notify parents |
| `parentsEvening.list` | protected | List evenings (staff: all, parent: their school) |
| `parentsEvening.getSlots` | protected | Get slots (filtered by teacher for parents) |
| `parentsEvening.book` | protected | Parent books a slot |
| `parentsEvening.cancelBooking` | protected | Parent cancels before deadline |
| `parentsEvening.addNotes` | schoolStaff | Teacher adds post-meeting notes |
| `parentsEvening.setVideoLink` | schoolStaff | Set video link per slot or teacher |

### Guards

- Only admins create/publish evenings
- Parents can only book slots with teachers of their children
- One slot per teacher per evening per parent
- Booking only allowed between `bookingOpensAt` and `bookingClosesAt`
- Teachers only see/edit notes for their own slots
- Admins see everything

### Notifications

- Parents notified when evening is published
- Booking confirmation to parent
- Reminders at 24h and 1h before appointment
- Teacher notified when slot booked/cancelled

---

## 4. E2E Testing

Each feature ships with YAML journey specs as the completion gate. Tests use the existing Playwright + YAML infrastructure.

### New Fixtures

| Fixture | Seeds |
|---------|-------|
| `parent-with-conversations` | Parent + staff + school + 2 conversations with messages |
| `staff-with-replies` | Staff + broadcast + 3 parent replies |
| `school-with-parents-evening` | School + published evening + teachers + slots (1 booked) |
| `parent-with-translation` | Parent (language: "pl") + school (translationEnabled) + messages |

### Journey Specs

**Two-Way Messaging (6 journeys):**

```
journeys/messaging/
  reply-to-broadcast-parent.yaml     # Parent replies to broadcast, staff sees reply      [smoke]
  view-replies-staff.yaml            # Staff views reply thread on a broadcast
  start-conversation-parent.yaml     # Parent starts DM with staff member
  direct-message-flow.yaml           # Back-and-forth DM exchange
  close-conversation-staff.yaml      # Staff closes a conversation
  reply-notification.yaml            # Parent receives notification on staff reply
```

**Parents' Evening (5 journeys):**

```
journeys/parents-evening/
  create-evening-admin.yaml          # Admin creates and publishes an evening
  book-slot-parent.yaml              # Parent browses and books a slot                     [smoke]
  cancel-booking-parent.yaml         # Parent cancels before deadline
  add-notes-teacher.yaml             # Teacher adds post-meeting notes
  video-link-booking.yaml            # Slot with video call link visible
```

**Translation (3 journeys):**

```
journeys/translation/
  set-language-parent.yaml           # Parent changes language in settings
  view-translated-message.yaml       # Non-English parent sees translated message          [smoke]
  translated-push-notification.yaml  # Push notification in parent's language
```

### Completion Criteria Per Feature

A feature is done when:
1. All YAML journey specs written
2. `generate:playwright` produces passing tests
3. `test:web` passes locally with 0 failures
4. Contract snapshot updated (`contracts:update`)
5. Coverage matrix shows green for the new domain

---

## Implementation Order

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | Two-Way Messaging | Core product gap. Extends existing model. Highest impact. |
| 2 | Translation | Builds on messaging. Small schema (1 model, 1 procedure). Quick win. |
| 3 | Parents' Evening | Most standalone. New domain. Larger scope but seasonal (termly). |

Translation after messaging makes sense because the primary translation use case is messages — including the new reply and DM content.
