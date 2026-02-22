# Table-Stakes Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two-way messaging, multi-language translation, and parents' evening booking to SchoolConnect.

**Architecture:** Extend existing Message model with type/threadId/conversationId for two-way messaging. Add TranslationCache model with Google Translate API wrapper. Add ParentsEvening + ParentsEveningSlot models for booking. Each feature gets its own e2e journey specs.

**Tech Stack:** Prisma, tRPC, Zod, Next.js App Router, Tailwind CSS, Google Cloud Translation API v2, Playwright

**Design doc:** `docs/plans/2026-02-22-table-stakes-features-design.md`

---

## Feature 1: Two-Way Messaging

### Task 1: Schema — Add MessageType enum and Conversation model

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add the new enum and fields to Message model**

Add after the existing `MessageCategory` enum:

```prisma
enum MessageType {
  BROADCAST
  REPLY
  DIRECT
}
```

Add new fields to the `Message` model:

```prisma
model Message {
  // ... existing fields ...
  type           MessageType @default(BROADCAST)
  threadId       String?     // self-ref to root BROADCAST message (for REPLY type)
  conversationId String?     // links to Conversation (for DIRECT type)

  thread       Message?       @relation("MessageThread", fields: [threadId], references: [id])
  replies      Message[]      @relation("MessageThread")
  conversation Conversation?  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  // ... existing relations ...
}
```

**Step 2: Add the Conversation model**

Add after the Message-related models:

```prisma
model Conversation {
  id            String    @id @default(cuid())
  schoolId      String
  parentId      String
  staffId       String
  subject       String?
  lastMessageAt DateTime  @default(now())
  closedAt      DateTime?
  createdAt     DateTime  @default(now())

  school   School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  parent   User      @relation("ConversationParent", fields: [parentId], references: [id], onDelete: Cascade)
  staff    User      @relation("ConversationStaff", fields: [staffId], references: [id], onDelete: Cascade)
  messages Message[]

  @@unique([schoolId, parentId, staffId])
  @@index([schoolId, lastMessageAt])
  @@map("conversations")
}
```

Add relation fields to `User`:

```prisma
conversationsAsParent Conversation[] @relation("ConversationParent")
conversationsAsStaff  Conversation[] @relation("ConversationStaff")
```

Add relation to `School`:

```prisma
conversations Conversation[]
```

**Step 3: Push schema and generate client**

Run:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push
npx pnpm --filter @schoolconnect/db db:generate
```

Expected: Schema pushed successfully, Prisma client generated.

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add MessageType enum and Conversation model for two-way messaging"
```

---

### Task 2: Router — Add reply procedures to messaging router

**Files:**
- Modify: `apps/api/src/router/messaging.ts`

**Step 1: Add `messaging.reply` mutation**

Add to the messaging router after the `markRead` procedure:

```typescript
reply: protectedProcedure
  .input(
    z.object({
      messageId: z.string(), // the root broadcast message to reply to
      body: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Verify the root message exists and is a BROADCAST
    const rootMessage = await ctx.prisma.message.findUnique({
      where: { id: input.messageId },
      include: {
        children: {
          select: { childId: true },
        },
      },
    });

    if (!rootMessage || rootMessage.type !== "BROADCAST") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Message not found",
      });
    }

    // Check if user is staff at this school OR a parent of a child who received this message
    const isStaff = await ctx.prisma.staffMember.findFirst({
      where: { userId: ctx.user.id, schoolId: rootMessage.schoolId },
    });

    if (!isStaff) {
      const childIds = rootMessage.children.map((c) => c.childId);
      const isParent = await ctx.prisma.parentChild.findFirst({
        where: {
          userId: ctx.user.id,
          childId: { in: childIds },
        },
      });

      if (!isParent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorised to reply to this message",
        });
      }
    }

    const reply = await ctx.prisma.message.create({
      data: {
        schoolId: rootMessage.schoolId,
        subject: `Re: ${rootMessage.subject}`,
        body: input.body,
        category: rootMessage.category,
        type: "REPLY",
        threadId: rootMessage.id,
        authorId: ctx.user.id,
      },
    });

    return { success: true, replyId: reply.id };
  }),
```

**Step 2: Add `messaging.listReplies` query**

```typescript
listReplies: protectedProcedure
  .input(
    z.object({
      messageId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const rootMessage = await ctx.prisma.message.findUnique({
      where: { id: input.messageId },
      select: { id: true, schoolId: true, children: { select: { childId: true } } },
    });

    if (!rootMessage) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
    }

    // Verify access (staff at school or parent of recipient child)
    const isStaff = await ctx.prisma.staffMember.findFirst({
      where: { userId: ctx.user.id, schoolId: rootMessage.schoolId },
    });

    if (!isStaff) {
      const childIds = rootMessage.children.map((c) => c.childId);
      const isParent = await ctx.prisma.parentChild.findFirst({
        where: { userId: ctx.user.id, childId: { in: childIds } },
      });
      if (!isParent) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised" });
      }
    }

    const replies = await ctx.prisma.message.findMany({
      where: { threadId: input.messageId, type: "REPLY" },
      orderBy: { createdAt: "asc" },
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      select: {
        id: true,
        body: true,
        authorId: true,
        createdAt: true,
      },
    });

    let nextCursor: string | undefined;
    if (replies.length > input.limit) {
      const next = replies.pop();
      nextCursor = next?.id;
    }

    // Resolve author names
    const authorIds = [...new Set(replies.map((r) => r.authorId).filter(Boolean))] as string[];
    const authors = await ctx.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a.name]));

    return {
      items: replies.map((r) => ({
        id: r.id,
        body: r.body,
        authorId: r.authorId,
        authorName: r.authorId ? authorMap.get(r.authorId) ?? "Unknown" : "Unknown",
        createdAt: r.createdAt,
      })),
      nextCursor,
    };
  }),
```

**Step 3: Update `listSent` to include reply count**

In the `listSent` query, update the `_count` select to include replies:

```typescript
_count: {
  select: {
    children: true,
    reads: true,
    replies: true,
  },
},
```

And add `replyCount: m._count.replies` to the mapped output.

**Step 4: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

Expected: Build succeeds with no type errors.

**Step 5: Commit**

```bash
git add apps/api/src/router/messaging.ts
git commit -m "feat: add reply and listReplies procedures to messaging router"
```

---

### Task 3: Router — Add conversation (direct messaging) procedures

**Files:**
- Modify: `apps/api/src/router/messaging.ts`

**Step 1: Add `messaging.createConversation` mutation**

```typescript
createConversation: protectedProcedure
  .input(
    z.object({
      staffId: z.string(),
      subject: z.string().optional(),
      body: z.string().min(1), // first message in conversation
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Verify caller is a parent
    const parentLink = await ctx.prisma.parentChild.findFirst({
      where: { userId: ctx.user.id },
      include: { child: { select: { schoolId: true } } },
    });

    if (!parentLink) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only parents can start conversations",
      });
    }

    const schoolId = parentLink.child.schoolId;

    // Verify target is staff at the same school
    const staffMember = await ctx.prisma.staffMember.findFirst({
      where: { userId: input.staffId, schoolId },
    });

    if (!staffMember) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Staff member not found at your child's school",
      });
    }

    // Create or find existing conversation
    const conversation = await ctx.prisma.conversation.upsert({
      where: {
        schoolId_parentId_staffId: {
          schoolId,
          parentId: ctx.user.id,
          staffId: input.staffId,
        },
      },
      update: {
        closedAt: null, // reopen if closed
        lastMessageAt: new Date(),
      },
      create: {
        schoolId,
        parentId: ctx.user.id,
        staffId: input.staffId,
        subject: input.subject,
        lastMessageAt: new Date(),
      },
    });

    // Create the first message
    const message = await ctx.prisma.message.create({
      data: {
        schoolId,
        subject: input.subject ?? "Direct Message",
        body: input.body,
        category: "STANDARD",
        type: "DIRECT",
        conversationId: conversation.id,
        authorId: ctx.user.id,
      },
    });

    return { conversationId: conversation.id, messageId: message.id };
  }),
```

**Step 2: Add `messaging.sendDirect` mutation**

```typescript
sendDirect: protectedProcedure
  .input(
    z.object({
      conversationId: z.string(),
      body: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const conversation = await ctx.prisma.conversation.findUnique({
      where: { id: input.conversationId },
    });

    if (!conversation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }

    // Verify caller is part of this conversation
    if (conversation.parentId !== ctx.user.id && conversation.staffId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
    }

    if (conversation.closedAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Conversation is closed" });
    }

    const [message] = await ctx.prisma.$transaction([
      ctx.prisma.message.create({
        data: {
          schoolId: conversation.schoolId,
          subject: conversation.subject ?? "Direct Message",
          body: input.body,
          category: "STANDARD",
          type: "DIRECT",
          conversationId: conversation.id,
          authorId: ctx.user.id,
        },
      }),
      ctx.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return { success: true, messageId: message.id };
  }),
```

**Step 3: Add `messaging.listConversations` query**

```typescript
listConversations: protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().nullish(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const conversations = await ctx.prisma.conversation.findMany({
      where: {
        OR: [
          { parentId: ctx.user.id },
          { staffId: ctx.user.id },
        ],
      },
      orderBy: { lastMessageAt: "desc" },
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      include: {
        parent: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, authorId: true },
        },
      },
    });

    let nextCursor: string | undefined;
    if (conversations.length > input.limit) {
      const next = conversations.pop();
      nextCursor = next?.id;
    }

    return {
      items: conversations.map((c) => ({
        id: c.id,
        subject: c.subject,
        parent: c.parent,
        staff: c.staff,
        lastMessage: c.messages[0] ?? null,
        closedAt: c.closedAt,
        lastMessageAt: c.lastMessageAt,
      })),
      nextCursor,
    };
  }),
```

**Step 4: Add `messaging.getConversation` query**

```typescript
getConversation: protectedProcedure
  .input(
    z.object({
      conversationId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const conversation = await ctx.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: {
        parent: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    if (!conversation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }

    if (conversation.parentId !== ctx.user.id && conversation.staffId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant" });
    }

    const messages = await ctx.prisma.message.findMany({
      where: { conversationId: input.conversationId, type: "DIRECT" },
      orderBy: { createdAt: "asc" },
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      select: {
        id: true,
        body: true,
        authorId: true,
        createdAt: true,
      },
    });

    let nextCursor: string | undefined;
    if (messages.length > input.limit) {
      const next = messages.pop();
      nextCursor = next?.id;
    }

    return {
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        parent: conversation.parent,
        staff: conversation.staff,
        closedAt: conversation.closedAt,
      },
      items: messages,
      nextCursor,
    };
  }),
```

**Step 5: Add `messaging.closeConversation` mutation**

```typescript
closeConversation: protectedProcedure
  .input(z.object({ conversationId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const conversation = await ctx.prisma.conversation.findUnique({
      where: { id: input.conversationId },
    });

    if (!conversation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }

    // Only staff can close conversations
    const isStaff = await ctx.prisma.staffMember.findFirst({
      where: { userId: ctx.user.id, schoolId: conversation.schoolId },
    });

    if (!isStaff) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only staff can close conversations" });
    }

    await ctx.prisma.conversation.update({
      where: { id: input.conversationId },
      data: { closedAt: new Date() },
    });

    return { success: true };
  }),
```

**Step 6: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

**Step 7: Commit**

```bash
git add apps/api/src/router/messaging.ts
git commit -m "feat: add conversation procedures (create, send, list, get, close)"
```

---

### Task 4: Web UI — Reply thread on broadcast messages

**Files:**
- Modify: `apps/web/src/app/dashboard/messages/page.tsx`

**Step 1: Add reply thread UI to the message detail panel**

In the right panel of the messages page, when a broadcast message is selected, add:
- A "Replies" section below the message body showing existing replies via `messaging.listReplies`
- Each reply displays author name, body, and timestamp
- A reply input field at the bottom with a send button
- On submit, call `messaging.reply` mutation
- After successful reply, invalidate the `listReplies` query

Use existing patterns: `data-testid="reply-input"` for the textarea, `data-testid="reply-send-button"` for submit, `data-testid="reply-item"` for each reply.

**Step 2: Update the message list to show reply count badge**

In the left sidebar message list, show a small reply count badge next to messages that have replies (for staff view using `listSent` data which now includes `replyCount`).

**Step 3: Run dev server and manually verify**

```bash
npx pnpm dev
```

Navigate to `/dashboard/messages`, select a message, verify reply thread renders.

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/messages/page.tsx
git commit -m "feat: add reply thread UI to broadcast messages"
```

---

### Task 5: Web UI — Conversations list and direct messaging

**Files:**
- Modify: `apps/web/src/app/dashboard/messages/page.tsx`

**Step 1: Add conversations tab to message sidebar**

In the left sidebar filter tabs (currently "All Chats", "Unread", "Teachers"), replace or add a "Direct" tab that:
- Calls `messaging.listConversations`
- Shows each conversation with the other participant's name, last message preview, and timestamp
- Indicates closed conversations with a visual marker
- Add a "New Message" button (`data-testid="new-conversation-button"`) that opens a staff picker modal

**Step 2: Add staff picker for new conversations**

When "New Message" is clicked (parent role only):
- Fetch staff list for the parent's child's school (use existing staff data or add a new query)
- Show a modal/dropdown with staff names
- On selection, call `messaging.createConversation`
- Navigate to the new conversation

**Step 3: Add conversation message view**

When a conversation is selected from the list:
- Right panel shows conversation messages via `messaging.getConversation`
- Messages displayed as chat bubbles (own messages right-aligned, other's left-aligned)
- Input field at bottom (`data-testid="dm-input"`) with send button (`data-testid="dm-send-button"`)
- On submit, call `messaging.sendDirect`
- If conversation is closed, show "Conversation closed" and disable input
- Staff see a "Close" button (`data-testid="close-conversation-button"`)

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/messages/page.tsx
git commit -m "feat: add conversations list and direct messaging UI"
```

---

### Task 6: Fixtures and E2E — Two-way messaging journeys

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`
- Modify: `packages/e2e/fixtures/factories.d.ts`
- Create: `packages/e2e/journeys/messaging/reply-to-broadcast-parent.yaml`
- Create: `packages/e2e/journeys/messaging/view-replies-staff.yaml`
- Create: `packages/e2e/journeys/messaging/start-conversation-parent.yaml`
- Create: `packages/e2e/journeys/messaging/direct-message-flow.yaml`
- Create: `packages/e2e/journeys/messaging/close-conversation-staff.yaml`

**Step 1: Add fixtures to factories.ts**

Add `"parent-with-conversations"` and `"staff-with-replies"` to the `FixtureName` type and switch statement.

`staff-with-replies` fixture:
```typescript
async function createStaffWithReplies() {
  const base = await createStaffWithMessages();

  // Create 3 parent replies on the first broadcast
  for (let i = 0; i < 3; i++) {
    await db.message.create({
      data: {
        schoolId: base.school.id,
        subject: `Re: ${base.messages[0].subject}`,
        body: `Parent reply ${i + 1}`,
        category: "STANDARD",
        type: "REPLY",
        threadId: base.messages[0].id,
        authorId: base.parentUser.id,
      },
    });
  }

  return base;
}
```

`parent-with-conversations` fixture:
```typescript
async function createParentWithConversations() {
  const base = await createStaffWithMessages();

  const conversation = await db.conversation.create({
    data: {
      schoolId: base.school.id,
      parentId: base.parentUser.id,
      staffId: base.user.id,
      subject: "Question about homework",
      lastMessageAt: new Date(),
    },
  });

  await db.message.create({
    data: {
      schoolId: base.school.id,
      subject: "Question about homework",
      body: "Hi, my child needs help with the maths homework.",
      category: "STANDARD",
      type: "DIRECT",
      conversationId: conversation.id,
      authorId: base.parentUser.id,
    },
  });

  await db.message.create({
    data: {
      schoolId: base.school.id,
      subject: "Question about homework",
      body: "Of course! I'll send some extra resources home tomorrow.",
      category: "STANDARD",
      type: "DIRECT",
      conversationId: conversation.id,
      authorId: base.user.id,
    },
  });

  return { ...base, conversation };
}
```

**Step 2: Add `cleanTestData` truncation for new tables**

Add to `cleanTestData()` before the messages truncation:
```typescript
await db.$executeRaw`TRUNCATE TABLE conversations CASCADE`;
```

**Step 3: Write journey YAML files**

`reply-to-broadcast-parent.yaml`:
```yaml
journey:
  id: reply-to-broadcast-parent
  name: Parent Replies to Broadcast
  tags: [smoke, parent, authenticated, messaging]
  role: parent
  preconditions:
    seed: staff-with-messages
    state: authenticated
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Messages"
    - action: tap
      target: first-message
      selectors:
        web: "[data-testid='message-item']:first-child"
        mobile: "Test Message 5"
    - action: fill
      target: reply-input
      selectors:
        web: "[data-testid='reply-input']"
        mobile: "Reply"
      value: "Thank you for letting us know!"
    - action: tap
      target: reply-send-button
      selectors:
        web: "[data-testid='reply-send-button']"
        mobile: "Send"
  assertions:
    - type: visible
      text: "Thank you for letting us know!"
```

`view-replies-staff.yaml`:
```yaml
journey:
  id: view-replies-staff
  name: Staff Views Reply Thread
  tags: [staff, authenticated, messaging]
  role: staff
  preconditions:
    seed: staff-with-replies
    state: authenticated
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Messages"
    - action: tap
      target: first-message
      selectors:
        web: "[data-testid='message-item']:first-child"
        mobile: "Test Message 1"
  assertions:
    - type: visible
      text: "Parent reply 1"
    - type: visible
      text: "Parent reply 2"
    - type: visible
      text: "Parent reply 3"
```

`start-conversation-parent.yaml`:
```yaml
journey:
  id: start-conversation-parent
  name: Parent Starts Direct Conversation
  tags: [parent, authenticated, messaging]
  role: parent
  preconditions:
    seed: staff-with-messages
    state: authenticated
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Messages"
    - action: tap
      target: new-conversation-button
      selectors:
        web: "[data-testid='new-conversation-button']"
        mobile: "New Message"
    - action: tap
      target: staff-picker-item
      selectors:
        web: "[data-testid='staff-picker-item']:first-child"
        mobile: "Test Staff"
    - action: fill
      target: dm-input
      selectors:
        web: "[data-testid='dm-input']"
        mobile: "Message"
      value: "Hello, I have a question about my child."
    - action: tap
      target: dm-send-button
      selectors:
        web: "[data-testid='dm-send-button']"
        mobile: "Send"
  assertions:
    - type: visible
      text: "Hello, I have a question about my child."
```

`direct-message-flow.yaml`:
```yaml
journey:
  id: direct-message-flow
  name: Direct Message Back and Forth
  tags: [parent, authenticated, messaging]
  role: parent
  preconditions:
    seed: parent-with-conversations
    state: authenticated
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Messages"
    - action: tap
      target: conversation-item
      selectors:
        web: "[data-testid='conversation-item']:first-child"
        mobile: "Question about homework"
  assertions:
    - type: visible
      text: "Hi, my child needs help with the maths homework."
    - type: visible
      text: "Of course! I'll send some extra resources home tomorrow."
```

`close-conversation-staff.yaml`:
```yaml
journey:
  id: close-conversation-staff
  name: Staff Closes Conversation
  tags: [staff, authenticated, messaging]
  role: staff
  preconditions:
    seed: parent-with-conversations
    state: authenticated
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Messages"
    - action: tap
      target: conversation-item
      selectors:
        web: "[data-testid='conversation-item']:first-child"
        mobile: "Question about homework"
    - action: tap
      target: close-conversation-button
      selectors:
        web: "[data-testid='close-conversation-button']"
        mobile: "Close"
  assertions:
    - type: visible
      text: "Conversation closed"
```

**Step 4: Generate and run Playwright tests**

```bash
npx pnpm --filter @schoolconnect/e2e generate:playwright
npx pnpm --filter @schoolconnect/e2e test:web
```

Expected: All 5 new messaging journeys pass.

**Step 5: Update contract snapshot**

```bash
npx pnpm --filter @schoolconnect/e2e contracts:update
```

**Step 6: Commit**

```bash
git add packages/e2e/fixtures/ packages/e2e/journeys/messaging/
git commit -m "feat: add e2e fixtures and journey specs for two-way messaging"
```

---

## Feature 2: Multi-Language Translation

### Task 7: Schema — Add TranslationCache model and translationEnabled toggle

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add TranslationCache model**

Add after the NotificationDelivery model:

```prisma
// ─── Translation ──────────────────────────────────────────

model TranslationCache {
  id         String   @id @default(cuid())
  sourceHash String
  sourceLang String   @default("en")
  targetLang String
  sourceText String
  translated String
  createdAt  DateTime @default(now())

  @@unique([sourceHash, sourceLang, targetLang])
  @@index([sourceHash, targetLang])
  @@map("translation_cache")
}
```

**Step 2: Add `translationEnabled` toggle to School**

Add to the School model after the existing feature toggles:

```prisma
translationEnabled Boolean @default(false)
```

**Step 3: Push schema and generate client**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push
npx pnpm --filter @schoolconnect/db db:generate
```

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add TranslationCache model and translationEnabled toggle"
```

---

### Task 8: Translation service — Google Translate wrapper with caching

**Files:**
- Create: `apps/api/src/services/translation.ts`

**Step 1: Create the translation service**

```typescript
import { createHash } from "crypto";
import type { PrismaClient } from "@schoolconnect/db";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function translateTexts(
  prisma: PrismaClient,
  texts: string[],
  targetLang: string,
  sourceLang = "en",
): Promise<string[]> {
  if (targetLang === sourceLang) return texts;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_TRANSLATE_API_KEY not set, returning original texts");
    return texts;
  }

  // Check cache for each text
  const hashes = texts.map((t) => hashText(t));
  const cached = await prisma.translationCache.findMany({
    where: {
      sourceHash: { in: hashes },
      sourceLang,
      targetLang,
    },
  });

  const cacheMap = new Map(cached.map((c) => [c.sourceHash, c.translated]));
  const results: string[] = [];
  const misses: { index: number; text: string; hash: string }[] = [];

  for (let i = 0; i < texts.length; i++) {
    const hit = cacheMap.get(hashes[i]);
    if (hit) {
      results[i] = hit;
    } else {
      misses.push({ index: i, text: texts[i], hash: hashes[i] });
    }
  }

  if (misses.length === 0) return results;

  // Call Google Translate for cache misses (batch)
  const response = await fetch(
    `${GOOGLE_TRANSLATE_URL}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: misses.map((m) => m.text),
        source: sourceLang,
        target: targetLang,
        format: "text",
      }),
    },
  );

  if (!response.ok) {
    console.error("Google Translate API error:", response.status, await response.text());
    // Return original texts on failure
    for (const miss of misses) {
      results[miss.index] = miss.text;
    }
    return results;
  }

  const data = await response.json();
  const translations = data.data.translations as { translatedText: string }[];

  // Cache results and fill in misses
  const cacheData = misses.map((miss, i) => ({
    sourceHash: miss.hash,
    sourceLang,
    targetLang,
    sourceText: miss.text,
    translated: translations[i].translatedText,
  }));

  // Bulk insert cache entries (ignore conflicts)
  await prisma.translationCache.createMany({
    data: cacheData,
    skipDuplicates: true,
  });

  for (let i = 0; i < misses.length; i++) {
    results[misses[i].index] = translations[i].translatedText;
  }

  return results;
}
```

**Step 2: Commit**

```bash
git add apps/api/src/services/translation.ts
git commit -m "feat: add translation service with Google Translate API and caching"
```

---

### Task 9: Router — Add translation router

**Files:**
- Create: `apps/api/src/router/translation.ts`
- Modify: `apps/api/src/router/index.ts`

**Step 1: Create the translation router**

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { translateTexts } from "../services/translation";

export const translationRouter = router({
  translate: protectedProcedure
    .input(
      z.object({
        texts: z.array(z.string()).min(1).max(50),
        targetLang: z.string().min(2).max(5),
        sourceLang: z.string().min(2).max(5).default("en"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const translations = await translateTexts(
        ctx.prisma,
        input.texts,
        input.targetLang,
        input.sourceLang,
      );
      return { translations };
    }),
});
```

**Step 2: Register in router index**

Add import and register in `apps/api/src/router/index.ts`:

```typescript
import { translationRouter } from "./translation";
// ...
translation: translationRouter,
```

**Step 3: Expose language in settings updateProfile**

In `apps/api/src/router/settings.ts`, update `updateProfile` input to accept `language`:

```typescript
.input(
  z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().nullable(),
    language: z.string().min(2).max(5).optional(),
  }),
)
```

And update the mutation data:

```typescript
data: { name: input.name, phone: input.phone, ...(input.language && { language: input.language }) },
```

Also update `getProfile` to return `language`:

```typescript
select: { name: true, email: true, phone: true, language: true },
```

**Step 4: Update feature-guards and settings for translationEnabled toggle**

In `apps/api/src/lib/feature-guards.ts`, add `"translation"` to the FeatureName type and maps:

```typescript
type FeatureName = "messaging" | "payments" | "attendance" | "calendar" | "forms" | "translation";
```

Add to `featureFieldMap`:
```typescript
translation: "translationEnabled",
```

Add to `featureLabel`:
```typescript
translation: "Translation",
```

Update `SchoolFeatures` interface:
```typescript
translationEnabled: boolean;
```

In `apps/api/src/router/settings.ts`, add `translationEnabled` to the `featureToggleSelect` and `updateFeatureToggles` input.

In `apps/api/src/trpc.ts`, add `translationEnabled: true` to the `schoolFeatureProcedure` select.

**Step 5: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

**Step 6: Commit**

```bash
git add apps/api/src/router/translation.ts apps/api/src/router/index.ts apps/api/src/router/settings.ts apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts
git commit -m "feat: add translation router and expose language in settings"
```

---

### Task 10: Web UI — Language picker in settings and translation hook

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`
- Create: `apps/web/src/hooks/use-translation.ts`

**Step 1: Add language picker to settings page**

In the Profile card section of the settings page, add a language dropdown below the phone field:

- Label: "Preferred Language"
- `data-testid="language-select"`
- Options: English (en), Polish (pl), Urdu (ur), Punjabi (pa), Bengali (bn), Romanian (ro), Arabic (ar), Somali (so), Portuguese (pt), Tamil (ta), Gujarati (gu), Lithuanian (lt), Turkish (tr), Chinese Simplified (zh), Spanish (es)
- On change, call `settings.updateProfile` with the new language value

**Step 2: Create `useTranslation` hook**

```typescript
import { useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pl: "Polski",
  ur: "اردو",
  pa: "ਪੰਜਾਬੀ",
  bn: "বাংলা",
  ro: "Română",
  ar: "العربية",
  so: "Soomaali",
  pt: "Português",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
  lt: "Lietuvių",
  tr: "Türkçe",
  zh: "中文",
  es: "Español",
};

export const SUPPORTED_LANGUAGES = Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
  code,
  name,
}));

export function useTranslation() {
  const { data: profile } = trpc.settings.getProfile.useQuery();
  const translateMutation = trpc.translation.translate.useMutation();
  const userLang = profile?.language ?? "en";

  const translate = useCallback(
    async (texts: string[]): Promise<string[]> => {
      if (userLang === "en" || texts.length === 0) return texts;
      const result = await translateMutation.mutateAsync({
        texts,
        targetLang: userLang,
      });
      return result.translations;
    },
    [userLang, translateMutation],
  );

  return { userLang, translate, isTranslating: translateMutation.isPending };
}
```

**Step 3: Integrate translation into messages page**

In `apps/web/src/app/dashboard/messages/page.tsx`, use the `useTranslation` hook to translate message subjects and bodies when `userLang !== "en"`. Show a small "Translated" indicator and a toggle to view original text.

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/settings/page.tsx apps/web/src/hooks/use-translation.ts apps/web/src/app/dashboard/messages/page.tsx
git commit -m "feat: add language picker, translation hook, and translated message display"
```

---

### Task 11: Fixtures and E2E — Translation journeys

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`
- Create: `packages/e2e/journeys/translation/set-language-parent.yaml`
- Create: `packages/e2e/journeys/translation/view-translated-message.yaml`

**Step 1: Add `parent-with-translation` fixture**

```typescript
async function createParentWithTranslation() {
  const base = await createStaffWithMessages();

  // Set parent language to Polish and enable translation
  await db.user.update({
    where: { id: base.parentUser.id },
    data: { language: "pl" },
  });

  await db.school.update({
    where: { id: base.school.id },
    data: { translationEnabled: true },
  });

  return base;
}
```

Add to `FixtureName` type and switch statement.

**Step 2: Write journey YAML files**

`set-language-parent.yaml`:
```yaml
journey:
  id: set-language-parent
  name: Parent Changes Language
  tags: [parent, authenticated, translation]
  role: parent
  preconditions:
    seed: parent-with-school
    state: authenticated
  steps:
    - action: navigate
      target: settings
      selectors:
        web: "/dashboard/settings"
        mobile: "Settings"
    - action: tap
      target: language-select
      selectors:
        web: "[data-testid='language-select']"
        mobile: "Preferred Language"
    - action: tap
      target: polish-option
      selectors:
        web: "[data-testid='language-option-pl']"
        mobile: "Polski"
  assertions:
    - type: visible
      text: "Polski"
```

`view-translated-message.yaml`:
```yaml
journey:
  id: view-translated-message
  name: Parent Views Translated Message
  tags: [smoke, parent, authenticated, translation]
  role: parent
  preconditions:
    seed: parent-with-translation
    state: authenticated
  steps:
    - action: navigate
      target: messages
      selectors:
        web: "/dashboard/messages"
        mobile: "Messages"
    - action: tap
      target: first-message
      selectors:
        web: "[data-testid='message-item']:first-child"
        mobile: "Test Message 5"
  assertions:
    - type: visible
      text: "Translated"
```

Note: The `view-translated-message` test verifies the "Translated" indicator appears. Actual Google Translate output varies, so we assert on the UI indicator rather than specific translated text. In CI, the test will need either a real `GOOGLE_TRANSLATE_API_KEY` env var or a mock translation service.

**Step 3: Generate and run tests**

```bash
npx pnpm --filter @schoolconnect/e2e generate:playwright
npx pnpm --filter @schoolconnect/e2e test:web
```

**Step 4: Update contract snapshot**

```bash
npx pnpm --filter @schoolconnect/e2e contracts:update
```

**Step 5: Commit**

```bash
git add packages/e2e/fixtures/ packages/e2e/journeys/translation/
git commit -m "feat: add e2e fixtures and journey specs for translation"
```

---

## Feature 3: Parents' Evening Booking

### Task 12: Schema — Add ParentsEvening and ParentsEveningSlot models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add ParentsEvening and ParentsEveningSlot models**

Add after the Calendar section:

```prisma
// ─── Parents' Evening ───────────────────────────────────────

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
  location         String?
  videoCallLink    String?

  parentId         String?
  childId          String?
  bookedAt         DateTime?

  staffNotes       String?

  parentsEvening ParentsEvening @relation(fields: [parentsEveningId], references: [id], onDelete: Cascade)

  @@unique([parentsEveningId, staffId, startTime])
  @@index([parentsEveningId, staffId])
  @@map("parents_evening_slots")
}
```

**Step 2: Add relations to School model**

```prisma
parentsEvenings ParentsEvening[]
```

**Step 3: Add `parentsEveningEnabled` toggle to School**

```prisma
parentsEveningEnabled Boolean @default(false)
```

**Step 4: Push schema and generate client**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push
npx pnpm --filter @schoolconnect/db db:generate
```

**Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add ParentsEvening and ParentsEveningSlot models"
```

---

### Task 13: Router — Parents' evening CRUD procedures

**Files:**
- Create: `apps/api/src/router/parents-evening.ts`
- Modify: `apps/api/src/router/index.ts`

**Step 1: Create the parents' evening router with create and publish**

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, schoolAdminProcedure, schoolStaffProcedure } from "../trpc";

function generateSlots(
  startTime: string,
  endTime: string,
  slotDurationMin: number,
  breakDurationMin: number,
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let currentMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  while (currentMin + slotDurationMin <= endMin) {
    const slotStart = `${String(Math.floor(currentMin / 60)).padStart(2, "0")}:${String(currentMin % 60).padStart(2, "0")}`;
    const slotEndMin = currentMin + slotDurationMin;
    const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, "0")}:${String(slotEndMin % 60).padStart(2, "0")}`;
    slots.push({ start: slotStart, end: slotEnd });
    currentMin = slotEndMin + breakDurationMin;
  }

  return slots;
}

export const parentsEveningRouter = router({
  create: schoolAdminProcedure
    .input(
      z.object({
        schoolId: z.string(),
        title: z.string().min(1),
        date: z.date(),
        slotDurationMin: z.number().min(5).max(60).default(10),
        breakDurationMin: z.number().min(0).max(30).default(0),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        bookingOpensAt: z.date(),
        bookingClosesAt: z.date(),
        allowVideoCall: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const evening = await ctx.prisma.parentsEvening.create({
        data: {
          schoolId: input.schoolId,
          title: input.title,
          date: input.date,
          slotDurationMin: input.slotDurationMin,
          breakDurationMin: input.breakDurationMin,
          startTime: input.startTime,
          endTime: input.endTime,
          bookingOpensAt: input.bookingOpensAt,
          bookingClosesAt: input.bookingClosesAt,
          allowVideoCall: input.allowVideoCall,
        },
      });
      return evening;
    }),

  addTeachers: schoolAdminProcedure
    .input(
      z.object({
        schoolId: z.string(),
        parentsEveningId: z.string(),
        staffIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const evening = await ctx.prisma.parentsEvening.findUnique({
        where: { id: input.parentsEveningId },
      });

      if (!evening || evening.schoolId !== ctx.schoolId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parents' evening not found" });
      }

      if (evening.isPublished) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot modify published evening" });
      }

      // Verify all staff belong to this school
      const staffMembers = await ctx.prisma.staffMember.findMany({
        where: { userId: { in: input.staffIds }, schoolId: ctx.schoolId },
        select: { userId: true },
      });
      const validStaffIds = staffMembers.map((s) => s.userId);

      // Generate slots for each teacher
      const timeSlots = generateSlots(
        evening.startTime,
        evening.endTime,
        evening.slotDurationMin,
        evening.breakDurationMin,
      );

      const slotData = validStaffIds.flatMap((staffId) =>
        timeSlots.map((slot) => ({
          parentsEveningId: evening.id,
          staffId,
          startTime: slot.start,
          endTime: slot.end,
        })),
      );

      await ctx.prisma.parentsEveningSlot.createMany({
        data: slotData,
        skipDuplicates: true,
      });

      return { teacherCount: validStaffIds.length, slotsPerTeacher: timeSlots.length };
    }),

  publish: schoolAdminProcedure
    .input(
      z.object({
        schoolId: z.string(),
        parentsEveningId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const evening = await ctx.prisma.parentsEvening.findUnique({
        where: { id: input.parentsEveningId },
        include: { _count: { select: { slots: true } } },
      });

      if (!evening || evening.schoolId !== ctx.schoolId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Parents' evening not found" });
      }

      if (evening._count.slots === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add teachers before publishing" });
      }

      await ctx.prisma.parentsEvening.update({
        where: { id: evening.id },
        data: { isPublished: true },
      });

      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({ schoolId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Determine school ID based on role
      let schoolId = input.schoolId;
      if (!schoolId) {
        const parentLink = await ctx.prisma.parentChild.findFirst({
          where: { userId: ctx.user.id },
          select: { child: { select: { schoolId: true } } },
        });
        schoolId = parentLink?.child.schoolId;
      }

      if (!schoolId) return { items: [] };

      const evenings = await ctx.prisma.parentsEvening.findMany({
        where: { schoolId, isPublished: true },
        orderBy: { date: "desc" },
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          bookingOpensAt: true,
          bookingClosesAt: true,
          allowVideoCall: true,
          _count: { select: { slots: true } },
        },
      });

      return { items: evenings };
    }),

  getSlots: protectedProcedure
    .input(
      z.object({
        parentsEveningId: z.string(),
        staffId: z.string().optional(), // filter by teacher
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        parentsEveningId: input.parentsEveningId,
      };
      if (input.staffId) where.staffId = input.staffId;

      const slots = await ctx.prisma.parentsEveningSlot.findMany({
        where,
        orderBy: [{ staffId: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          staffId: true,
          startTime: true,
          endTime: true,
          location: true,
          videoCallLink: true,
          parentId: true,
          childId: true,
          bookedAt: true,
        },
      });

      // Get staff names
      const staffIds = [...new Set(slots.map((s) => s.staffId))];
      const staffUsers = await ctx.prisma.user.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      });
      const staffMap = new Map(staffUsers.map((s) => [s.id, s.name]));

      return {
        slots: slots.map((s) => ({
          ...s,
          staffName: staffMap.get(s.staffId) ?? "Unknown",
          isBooked: !!s.parentId,
          isOwnBooking: s.parentId === ctx.user.id,
        })),
      };
    }),

  book: protectedProcedure
    .input(
      z.object({
        slotId: z.string(),
        childId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.parentsEveningSlot.findUnique({
        where: { id: input.slotId },
        include: { parentsEvening: true },
      });

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
      }

      if (slot.parentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Slot already booked" });
      }

      const now = new Date();
      if (now < slot.parentsEvening.bookingOpensAt || now > slot.parentsEvening.bookingClosesAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is not open" });
      }

      // Verify parent owns this child
      const parentChild = await ctx.prisma.parentChild.findFirst({
        where: { userId: ctx.user.id, childId: input.childId },
      });
      if (!parentChild) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });
      }

      // Check parent hasn't already booked with this teacher
      const existingBooking = await ctx.prisma.parentsEveningSlot.findFirst({
        where: {
          parentsEveningId: slot.parentsEveningId,
          staffId: slot.staffId,
          parentId: ctx.user.id,
        },
      });
      if (existingBooking) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already booked with this teacher" });
      }

      await ctx.prisma.parentsEveningSlot.update({
        where: { id: slot.id },
        data: {
          parentId: ctx.user.id,
          childId: input.childId,
          bookedAt: new Date(),
        },
      });

      return { success: true };
    }),

  cancelBooking: protectedProcedure
    .input(z.object({ slotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.parentsEveningSlot.findUnique({
        where: { id: input.slotId },
        include: { parentsEvening: true },
      });

      if (!slot || slot.parentId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }

      const now = new Date();
      if (now > slot.parentsEvening.bookingClosesAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking deadline has passed" });
      }

      await ctx.prisma.parentsEveningSlot.update({
        where: { id: slot.id },
        data: { parentId: null, childId: null, bookedAt: null },
      });

      return { success: true };
    }),

  addNotes: schoolStaffProcedure
    .input(
      z.object({
        schoolId: z.string(),
        slotId: z.string(),
        notes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.parentsEveningSlot.findUnique({
        where: { id: input.slotId },
      });

      if (!slot || slot.staffId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your slot" });
      }

      await ctx.prisma.parentsEveningSlot.update({
        where: { id: slot.id },
        data: { staffNotes: input.notes },
      });

      return { success: true };
    }),

  setVideoLink: schoolStaffProcedure
    .input(
      z.object({
        schoolId: z.string(),
        slotId: z.string(),
        videoCallLink: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.prisma.parentsEveningSlot.findUnique({
        where: { id: input.slotId },
      });

      if (!slot || slot.staffId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your slot" });
      }

      await ctx.prisma.parentsEveningSlot.update({
        where: { id: slot.id },
        data: { videoCallLink: input.videoCallLink },
      });

      return { success: true };
    }),
});
```

**Step 2: Register in router index**

In `apps/api/src/router/index.ts`:

```typescript
import { parentsEveningRouter } from "./parents-evening";
// ...
parentsEvening: parentsEveningRouter,
```

**Step 3: Update feature-guards for parentsEvening**

Add `"parentsEvening"` to the feature guard types and maps (same pattern as Task 9 Step 4).

**Step 4: Update settings router for parentsEveningEnabled**

Add `parentsEveningEnabled` to `featureToggleSelect` and `updateFeatureToggles` input in `apps/api/src/router/settings.ts`. Also add to `schoolFeatureProcedure` select in `apps/api/src/trpc.ts`.

**Step 5: Run type check**

```bash
npx pnpm --filter @schoolconnect/api build
```

**Step 6: Commit**

```bash
git add apps/api/src/router/parents-evening.ts apps/api/src/router/index.ts apps/api/src/router/settings.ts apps/api/src/lib/feature-guards.ts apps/api/src/trpc.ts
git commit -m "feat: add parents' evening router with all CRUD procedures"
```

---

### Task 14: Web UI — Parents' evening pages

**Files:**
- Create: `apps/web/src/app/dashboard/parents-evening/page.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`

**Step 1: Add parents' evening to dashboard navigation**

In `apps/web/src/app/dashboard/layout.tsx`, add a nav item for parents' evening:
- Icon: `calendar_month` (material symbol)
- Label: "Parents' Evening"
- Path: `/dashboard/parents-evening`
- Show for both parent and staff roles

**Step 2: Create the parents' evening page**

`apps/web/src/app/dashboard/parents-evening/page.tsx`:

**Parent view:**
- List of upcoming published evenings (`parentsEvening.list`)
- Click an evening to see available slots grouped by teacher (`parentsEvening.getSlots`)
- Each slot shows time, availability, video call indicator
- "Book" button on available slots (`data-testid="book-slot-button"`) → calls `parentsEvening.book`
- "Cancel" button on own bookings (`data-testid="cancel-booking-button"`) → calls `parentsEvening.cancelBooking`
- Booked slots highlighted with confirmation details

**Staff view (admin):**
- List of all evenings (published and draft)
- "Create Evening" button (`data-testid="create-evening-button"`) → form with title, date, times, slot duration, break duration, booking window
- "Add Teachers" step → checkboxes for school staff
- "Publish" button (`data-testid="publish-evening-button"`)
- View slot bookings and add notes post-meeting

**Teacher view:**
- View their own slots with booking status
- Add notes to completed slots (`data-testid="add-notes-button"`)
- Set video links (`data-testid="set-video-link-button"`)

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/parents-evening/ apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: add parents' evening booking pages for parent and staff views"
```

---

### Task 15: Fixtures and E2E — Parents' evening journeys

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`
- Create: `packages/e2e/journeys/parents-evening/create-evening-admin.yaml`
- Create: `packages/e2e/journeys/parents-evening/book-slot-parent.yaml`
- Create: `packages/e2e/journeys/parents-evening/cancel-booking-parent.yaml`
- Create: `packages/e2e/journeys/parents-evening/add-notes-teacher.yaml`
- Create: `packages/e2e/journeys/parents-evening/video-link-booking.yaml`

**Step 1: Add `school-with-parents-evening` fixture**

```typescript
async function createSchoolWithParentsEvening() {
  const base = await createStaffWithMessages(); // gives us school, staff, parent, child

  // Create a second teacher
  const teacher = await db.user.create({
    data: { email: "teacher@test.com", name: "Mrs Smith", emailVerified: true },
  });
  await db.staffMember.create({
    data: { userId: teacher.id, schoolId: base.school.id, role: "TEACHER" },
  });

  await db.school.update({
    where: { id: base.school.id },
    data: { parentsEveningEnabled: true },
  });

  const evening = await db.parentsEvening.create({
    data: {
      schoolId: base.school.id,
      title: "Year 1 Spring Parents' Evening",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      slotDurationMin: 10,
      breakDurationMin: 0,
      startTime: "16:00",
      endTime: "18:00",
      bookingOpensAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // opened yesterday
      bookingClosesAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // closes day before
      isPublished: true,
      allowVideoCall: true,
    },
  });

  // Generate slots for both teachers (16:00-18:00, 10min each = 12 slots per teacher)
  const slots = [];
  for (const staffId of [base.user.id, teacher.id]) {
    for (let i = 0; i < 12; i++) {
      const h = 16 + Math.floor(i * 10 / 60);
      const m = (i * 10) % 60;
      slots.push({
        parentsEveningId: evening.id,
        staffId,
        startTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        endTime: `${String(h + Math.floor((m + 10) / 60)).padStart(2, "0")}:${String((m + 10) % 60).padStart(2, "0")}`,
        videoCallLink: staffId === teacher.id ? "https://meet.google.com/test-link" : null,
      });
    }
  }
  await db.parentsEveningSlot.createMany({ data: slots });

  // Book one slot for the parent (first teacher, 16:00)
  const firstSlot = await db.parentsEveningSlot.findFirst({
    where: { parentsEveningId: evening.id, staffId: base.user.id, startTime: "16:00" },
  });
  if (firstSlot) {
    await db.parentsEveningSlot.update({
      where: { id: firstSlot.id },
      data: { parentId: base.parentUser.id, childId: base.child.id, bookedAt: new Date() },
    });
  }

  return { ...base, teacher, evening };
}
```

Add to `FixtureName` type and switch statement. Add `TRUNCATE TABLE parents_evening_slots CASCADE` and `TRUNCATE TABLE parents_evenings CASCADE` to `cleanTestData()`.

**Step 2: Write journey YAML files**

`create-evening-admin.yaml`:
```yaml
journey:
  id: create-evening-admin
  name: Admin Creates Parents Evening
  tags: [staff, authenticated, parents-evening]
  role: staff
  preconditions:
    seed: admin-with-multiple-staff
    state: authenticated
  steps:
    - action: navigate
      target: parents-evening
      selectors:
        web: "/dashboard/parents-evening"
        mobile: "Parents' Evening"
    - action: tap
      target: create-evening-button
      selectors:
        web: "[data-testid='create-evening-button']"
        mobile: "Create Evening"
    - action: fill
      target: evening-title
      selectors:
        web: "[data-testid='evening-title-input']"
        mobile: "Title"
      value: "Year 1 Spring Parents' Evening"
    - action: tap
      target: publish-evening-button
      selectors:
        web: "[data-testid='publish-evening-button']"
        mobile: "Publish"
  assertions:
    - type: visible
      text: "Year 1 Spring Parents' Evening"
```

`book-slot-parent.yaml`:
```yaml
journey:
  id: book-slot-parent
  name: Parent Books a Slot
  tags: [smoke, parent, authenticated, parents-evening]
  role: parent
  preconditions:
    seed: school-with-parents-evening
    state: authenticated
  steps:
    - action: navigate
      target: parents-evening
      selectors:
        web: "/dashboard/parents-evening"
        mobile: "Parents' Evening"
    - action: tap
      target: evening-item
      selectors:
        web: "[data-testid='evening-item']:first-child"
        mobile: "Year 1 Spring Parents' Evening"
    - action: tap
      target: book-slot-button
      selectors:
        web: "[data-testid='book-slot-button']"
        mobile: "Book"
  assertions:
    - type: visible
      text: "Booked"
```

`cancel-booking-parent.yaml`:
```yaml
journey:
  id: cancel-booking-parent
  name: Parent Cancels Booking
  tags: [parent, authenticated, parents-evening]
  role: parent
  preconditions:
    seed: school-with-parents-evening
    state: authenticated
  steps:
    - action: navigate
      target: parents-evening
      selectors:
        web: "/dashboard/parents-evening"
        mobile: "Parents' Evening"
    - action: tap
      target: evening-item
      selectors:
        web: "[data-testid='evening-item']:first-child"
        mobile: "Year 1 Spring Parents' Evening"
    - action: tap
      target: cancel-booking-button
      selectors:
        web: "[data-testid='cancel-booking-button']"
        mobile: "Cancel"
  assertions:
    - type: visible
      text: "Booking cancelled"
```

`add-notes-teacher.yaml`:
```yaml
journey:
  id: add-notes-teacher
  name: Teacher Adds Meeting Notes
  tags: [staff, authenticated, parents-evening]
  role: staff
  preconditions:
    seed: school-with-parents-evening
    state: authenticated
  steps:
    - action: navigate
      target: parents-evening
      selectors:
        web: "/dashboard/parents-evening"
        mobile: "Parents' Evening"
    - action: tap
      target: evening-item
      selectors:
        web: "[data-testid='evening-item']:first-child"
        mobile: "Year 1 Spring Parents' Evening"
    - action: tap
      target: add-notes-button
      selectors:
        web: "[data-testid='add-notes-button']"
        mobile: "Add Notes"
    - action: fill
      target: notes-input
      selectors:
        web: "[data-testid='notes-input']"
        mobile: "Notes"
      value: "Great progress in reading. Continue practice at home."
    - action: tap
      target: save-notes-button
      selectors:
        web: "[data-testid='save-notes-button']"
        mobile: "Save"
  assertions:
    - type: visible
      text: "Notes saved"
```

`video-link-booking.yaml`:
```yaml
journey:
  id: video-link-booking
  name: Parent Sees Video Call Link
  tags: [parent, authenticated, parents-evening]
  role: parent
  preconditions:
    seed: school-with-parents-evening
    state: authenticated
  steps:
    - action: navigate
      target: parents-evening
      selectors:
        web: "/dashboard/parents-evening"
        mobile: "Parents' Evening"
    - action: tap
      target: evening-item
      selectors:
        web: "[data-testid='evening-item']:first-child"
        mobile: "Year 1 Spring Parents' Evening"
  assertions:
    - type: visible
      text: "Join call"
```

**Step 3: Generate and run tests**

```bash
npx pnpm --filter @schoolconnect/e2e generate:playwright
npx pnpm --filter @schoolconnect/e2e test:web
```

**Step 4: Update contract snapshot**

```bash
npx pnpm --filter @schoolconnect/e2e contracts:update
```

**Step 5: Commit**

```bash
git add packages/e2e/fixtures/ packages/e2e/journeys/parents-evening/
git commit -m "feat: add e2e fixtures and journey specs for parents' evening"
```

---

## Final Task 16: Lint, build, and full test suite

**Step 1: Run linter**

```bash
npx pnpm lint
```

Fix any issues, then:

```bash
npx pnpm lint:fix
```

**Step 2: Run full build**

```bash
npx pnpm build
```

**Step 3: Run all tests**

```bash
npx pnpm test
npx pnpm --filter @schoolconnect/e2e test:web
```

**Step 4: Check coverage matrix**

```bash
npx pnpm --filter @schoolconnect/e2e matrix
```

Verify messaging, translation, and parents-evening domains show green.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: lint fixes and final verification for table-stakes features"
```
