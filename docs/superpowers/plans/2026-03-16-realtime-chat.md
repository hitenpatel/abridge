# Real-time Parent-Teacher Chat — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GDPR-compliant, school-moderated real-time 1:1 chat between parents and staff, replacing illegal WhatsApp groups. WebSocket-based with push notification fallback.

**Architecture:** `@fastify/websocket` for real-time delivery, `ChatConversation` + `ChatMessage` models separate from existing async messaging, connection manager tracking online users in-memory, session-based auth on WebSocket upgrade. Push notification fallback for offline users.

**Tech Stack:** @fastify/websocket (WebSocket), Prisma (schema), tRPC (REST endpoints), Zod (validation), Next.js (chat page), Vitest (tests), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-03-16-abridge-v2-prd.md` — Phase 1 section.

---

## Chunk 1: Schema + Feature Toggle + WebSocket Infrastructure

### Task 1: Schema — ChatConversation + ChatMessage

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add feature toggle**

Add to School model: `liveChatEnabled Boolean @default(false)`

- [ ] **Step 2: Add ChatConversation model**

```prisma
// ─── Live Chat ─────────────────────────────────────────────

model ChatConversation {
  id            String    @id @default(cuid())
  schoolId      String
  school        School    @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  parentId      String
  parent        User      @relation("ChatParent", fields: [parentId], references: [id], onDelete: Cascade)
  staffId       String
  staff         User      @relation("ChatStaff", fields: [staffId], references: [id], onDelete: Cascade)
  subject       String?
  lastMessageAt DateTime  @default(now())
  closedAt      DateTime?
  createdAt     DateTime  @default(now())

  messages      ChatMessage[]

  @@unique([schoolId, parentId, staffId])
  @@index([schoolId, lastMessageAt])
  @@map("chat_conversation")
}

model ChatMessage {
  id               String           @id @default(cuid())
  conversationId   String
  conversation     ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId         String
  sender           User             @relation("ChatMessageSender", fields: [senderId], references: [id])
  body             String
  readAt           DateTime?
  createdAt        DateTime         @default(now())

  @@index([conversationId, createdAt])
  @@map("chat_message")
}
```

- [ ] **Step 3: Add relations**

School: `chatConversations ChatConversation[]`
User: `chatConversationsAsParent ChatConversation[] @relation("ChatParent")`, `chatConversationsAsStaff ChatConversation[] @relation("ChatStaff")`, `chatMessagesSent ChatMessage[] @relation("ChatMessageSender")`

- [ ] **Step 4: Generate Prisma + create migration**

```bash
npx pnpm --filter @schoolconnect/db db:generate
npx pnpm --filter @schoolconnect/db db:migrate:dev -- --name add_live_chat
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/
git commit -m "schema: add ChatConversation and ChatMessage models for live chat"
```

---

### Task 2: Feature toggle registration

**Files:**
- Modify: `apps/api/src/lib/feature-guards.ts`
- Modify: `apps/api/src/trpc.ts`
- Modify: `apps/api/src/router/settings.ts`
- Modify: `apps/web/src/lib/feature-toggles.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add "liveChat" to all 6 files**

Same pattern as progressSummaries. Feature name: `"liveChat"`, field: `liveChatEnabled`, label: `"Live Chat"`.

Nav item for parent + staff: `{ name: "Chat", href: "/dashboard/chat", icon: "chat", featureKey: "liveChatEnabled" }`

- [ ] **Step 2: Update feature-guards test**

Add `liveChatEnabled: true/false` to both toggle fixtures in `apps/api/src/__tests__/feature-guards.test.ts`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: register liveChat feature toggle across stack"
```

---

### Task 3: Install @fastify/websocket + connection manager

**Files:**
- Create: `apps/api/src/lib/chat/connection-manager.ts`
- Create: `apps/api/src/lib/chat/ws-handler.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install**

```bash
npx pnpm --filter @schoolconnect/api add @fastify/websocket
```

- [ ] **Step 2: Create connection manager**

`apps/api/src/lib/chat/connection-manager.ts`:

```typescript
import type { WebSocket } from "ws";

class ConnectionManager {
  private connections = new Map<string, Set<WebSocket>>();

  add(userId: string, ws: WebSocket): void
  remove(userId: string, ws: WebSocket): void
  isOnline(userId: string): boolean
  getConnections(userId: string): Set<WebSocket> | undefined
  broadcast(userId: string, message: object): void
}

export const connectionManager = new ConnectionManager();
```

Supports multiple connections per user (multiple tabs/devices). Heartbeat ping every 30s, disconnect after 3 missed pongs.

- [ ] **Step 3: Create WebSocket handler**

`apps/api/src/lib/chat/ws-handler.ts`:

```typescript
import type { FastifyInstance } from "fastify";

export function registerChatWebSocket(app: FastifyInstance, prisma: PrismaClient): void {
  app.get("/ws/chat", { websocket: true }, async (socket, req) => {
    // 1. Auth: extract session token from query string, validate via better-auth
    // 2. Add to connection manager
    // 3. Handle incoming messages: chat:message, chat:typing, chat:read
    // 4. On disconnect: remove from manager, broadcast offline status
  });
}
```

Message types handled:
- `chat:message` → validate participant, create ChatMessage, broadcast to recipient, push notify if offline
- `chat:typing` → broadcast to other participant (transient, not persisted)
- `chat:read` → update ChatMessage.readAt, broadcast read receipt

- [ ] **Step 4: Register in Fastify**

In `apps/api/src/index.ts`, add after other plugins:
```typescript
import websocket from "@fastify/websocket";
import { registerChatWebSocket } from "./lib/chat/ws-handler";

await server.register(websocket);
registerChatWebSocket(server, prisma);
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/chat/ apps/api/src/index.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add WebSocket infrastructure with connection manager and chat handler"
```

---

## Chunk 2: Chat Router + Tests

### Task 4: Chat tRPC router

**Files:**
- Create: `apps/api/src/router/chat.ts`
- Modify: `apps/api/src/router/index.ts`

- [ ] **Step 1: Create chat router**

7 procedures:

`startConversation` — `protectedProcedure`. Input: `{ staffId, subject? }`. Verify parent has child at staff's school. Upsert ChatConversation (reopen if closed). Return conversation.

`sendMessage` — `protectedProcedure`. Input: `{ conversationId, body: z.string().min(1).max(2000) }`. Verify participant. Create ChatMessage. Broadcast via WebSocket. Push notify if offline.

`getMessages` — `protectedProcedure`. Input: `{ conversationId, limit?, cursor? }`. Verify participant. Cursor-based pagination, ordered by createdAt asc.

`markRead` — `protectedProcedure`. Input: `{ conversationId }`. Update all unread messages in conversation where senderId !== currentUser. Set readAt = now().

`getConversations` — `protectedProcedure`. List user's conversations with unread counts. Sorted by lastMessageAt desc.

`closeConversation` — `schoolFeatureProcedure` + assertFeatureEnabled("liveChat"). Staff-only close.

`adminGetConversation` — `schoolAdminProcedure` + assertFeatureEnabled("liveChat"). Admin views any conversation in school for safeguarding.

- [ ] **Step 2: Register in index.ts**

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/router/chat.ts apps/api/src/router/index.ts
git commit -m "feat: add chat router with conversations, messages, and admin safeguarding"
```

---

### Task 5: Chat router tests

**Files:**
- Create: `apps/api/src/__tests__/chat.test.ts`

- [ ] **Step 1: Write 6 tests**

1. `startConversation` creates a new conversation between parent and staff
2. `startConversation` reopens closed conversation (same parent+staff)
3. `sendMessage` creates message and updates lastMessageAt
4. `getMessages` returns paginated messages for participant
5. `sendMessage` rejects non-participant
6. `adminGetConversation` allows admin to view any school conversation

Follow mock pattern from meal-booking.test.ts. Include all feature toggles including `liveChatEnabled: true`.

- [ ] **Step 2: Run tests**

Run: `cd apps/api && npx vitest run src/__tests__/chat.test.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/chat.test.ts
git commit -m "test: add chat router tests for conversations, messages, and admin access"
```

---

## Chunk 3: Web Page + Seed + E2E

### Task 6: Chat web page

**Files:**
- Create: `apps/web/src/app/dashboard/chat/page.tsx`

- [ ] **Step 1: Create chat page**

Feature gate on `liveChatEnabled`.

**Parent view:**
- Left panel: conversation list with staff name, last message preview, unread badge, online dot
- "New Chat" button → staff selector (lists staff at child's school)
- Right panel: message thread
  - Messages: own messages right-aligned (blue), received left-aligned (grey)
  - Input bar at bottom: text input + send button
  - Typing indicator: "Sarah is typing..."
  - Scroll to bottom on new message

**Staff view:**
- Left panel: inbox of all conversations, sorted by lastMessageAt, unread count badge
- Right panel: same message thread
- "Close conversation" button in header

**Admin view:**
- Toggle "View all school conversations" — shows all conversations, read-only

**WebSocket client:**
```typescript
const ws = new WebSocket(`ws://localhost:4000/ws/chat?token=${sessionToken}`);
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // Handle: chat:message, chat:typing, chat:read, chat:online
};
```

Reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/chat/page.tsx
git commit -m "feat: add real-time chat page with WebSocket, typing indicators, and admin view"
```

---

### Task 7: Seed data + E2E tests

**Files:**
- Modify: `packages/db/prisma/seed.ts`
- Modify: `e2e/helpers/seed-data.ts`
- Create: `e2e/chat-journey.test.ts`

- [ ] **Step 1: Add seed data**

Enable `liveChatEnabled: true` on seed school. Create sample ChatConversation + ChatMessages between parent and teacher.

- [ ] **Step 2: Add seed helpers**

`seedChatConversation({ schoolId, parentId, staffId })`, `seedChatMessage({ conversationId, senderId, body })`

- [ ] **Step 3: Write 3 E2E tests**

1. "parent should start a chat with staff" — setup school, register parent + staff, enable liveChat, navigate to /dashboard/chat, start new conversation, verify chat view opens
2. "parent should send and receive messages" — seed conversation + messages, navigate, verify messages visible, send new message, verify it appears
3. "chat page should show disabled state" — navigate without enabling, verify disabled heading

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts e2e/
git commit -m "test: add chat E2E tests and seed data"
```

---

## Chunk 4: Verification + Polish

### Task 8: Lint + build + tests

- [ ] **Step 1: Update feature-guards test fixtures**

Add `liveChatEnabled` to both `allTogglesEnabled()` and `allTogglesDisabled()`, and to any router that does its own school feature select (achievement.ts, gallery.ts).

- [ ] **Step 2: Run lint**

```bash
npx pnpm lint
```

- [ ] **Step 3: Run build**

```bash
npx pnpm build
```

- [ ] **Step 4: Run all API tests**

```bash
cd apps/api && npx vitest run
```

- [ ] **Step 5: Fix any issues and commit**

```bash
git commit -m "fix: resolve lint and build issues from chat implementation"
```

---

### Task 9: Ralph Loop — WebSocket reliability (post-merge, requires running server)

```
/ralph-loop "Test WebSocket chat reliability with running server.
1. Start API: npx pnpm --filter @schoolconnect/api dev
2. Connect WebSocket as parent (use curl or wscat)
3. Send message, verify delivery
4. Close connection, reconnect, verify missed messages
5. Test concurrent connections (simulate 2 tabs)
6. Test heartbeat timeout (wait 90s idle)
Fix any issues found in ws-handler.ts or connection-manager.ts.
Output <promise>CHAT RELIABLE</promise> when all edge cases pass." --max-iterations 10
```

---

## Summary

| Task | What | Files | Tests |
|------|------|-------|-------|
| 1 | Schema + migration | schema.prisma | — |
| 2 | Feature toggle | 6 files + test fixture | — |
| 3 | WebSocket infra | connection-manager.ts, ws-handler.ts, index.ts | — |
| 4 | Chat router | chat.ts, index.ts | — |
| 5 | Router tests | chat.test.ts | 6 tests |
| 6 | Chat web page | chat/page.tsx | — |
| 7 | Seed + E2E | seed.ts, seed-data.ts, chat-journey.test.ts | 3 E2E |
| 8 | Verification | feature-guards.test.ts, lint, build | — |
| 9 | Ralph Loop | ws-handler.ts, connection-manager.ts | iterative |

**Total: 9 tasks, 6 API tests, 3 E2E tests**
