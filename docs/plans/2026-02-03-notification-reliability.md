<file>
00001| # Notification Reliability Implementation Plan
00002| 
00003| > **For AI:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
00004| 
00005| **Goal:** Add SMS/email fallback for push notifications, quiet hours enforcement, and delivery tracking so parents never miss critical messages.
00006| 
00007| **Architecture:**
00008| - Extend `NotificationService` with multi-channel delivery: push first, then SMS (Twilio) and/or email fallback after configurable timeout.
00009| - Add `NotificationDelivery` model to track delivery status per user per message.
00010| - Background job checks for undelivered notifications and triggers fallback.
00011| - Respect user quiet hours (already on User model: `quietStart`, `quietEnd`).
00012| - **Translation:** Detect user language and translate message body before sending.
00013| 
00014| **Tech Stack:** Expo Push SDK, Twilio (SMS), Nodemailer or SES (email), Prisma, date-fns, `google-translate-api-x`.
00015| 
00016| ---
00017| 
00018| ### Task 1: Add NotificationDelivery Model
00019| 
00020| **Files:**
00021| - Modify: `packages/db/prisma/schema.prisma`
00022| 
00023| **Step 1: Add model**
00024| 
00025| ```prisma
00026| // ─── Notification Delivery ──────────────────────────────────
00027| 
00028| model NotificationDelivery {
00029|   id        String              @id @default(cuid())
00030|   messageId String
00031|   userId    String
00032|   channel   NotificationChannel
00033|   status    DeliveryStatus      @default(PENDING)
00034|   sentAt    DateTime?
00035|   openedAt  DateTime?
00036|   error     String?
00037|   createdAt DateTime            @default(now())
00038| 
00039|   message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
00040|   user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
00041| 
00042|   @@unique([messageId, userId, channel])
00043|   @@index([status, createdAt])
00044|   @@map("notification_deliveries")
00045| }
00046| 
00047| enum NotificationChannel {
00048|   PUSH
00049|   SMS
00050|   EMAIL
00051| }
00052| 
00053| enum DeliveryStatus {
00054|   PENDING
00055|   SENT
00056|   DELIVERED
00057|   OPENED
00058|   FAILED
00059| }
00060| ```
00061| 
00062| Also add the relation to `Message` and `User` models:
00063| - `Message`: add `deliveries NotificationDelivery[]`
00064| - `User`: add `notificationDeliveries NotificationDelivery[]`
00065| 
00066| **Step 2: Run migration**
00067| 
00068| ```bash
00069| pnpm --filter @schoolconnect/db db:migrate -- --name add_notification_delivery
00070| ```
00071| 
00072| **Step 3: Commit**
00073| ```bash
00074| git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
00075| git commit -m "feat(notifications): add NotificationDelivery model"
00076| ```
00077| 
00078| ---
00079| 
00080| ### Task 2: Add Twilio SMS Service
00081| 
00081| **Files:**
00082| - Create: `apps/api/src/services/sms.ts`
00083| - Modify: `apps/api/package.json` (add twilio dependency)
00084| 
00085| **Step 1: Install twilio**
00086| 
00087| ```bash
00088| pnpm --filter @schoolconnect/api add twilio
00089| ```
00090| 
00091| **Step 2: Create sms.ts**
00092| 
00093| ```typescript
00094| import Twilio from "twilio";
00095| 
00096| const client = process.env.TWILIO_ACCOUNT_SID
00097|   ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
00098|   : null;
00099| 
00100| const fromNumber = process.env.TWILIO_FROM_NUMBER;
00101| 
00102| export async function sendSms(to: string, body: string): Promise<boolean> {
00103|   if (!client || !fromNumber) {
00104|     console.warn("Twilio not configured, skipping SMS");
00105|     return false;
00106|   }
00107| 
00108|   try {
00109|     await client.messages.create({
00110|       to,
00111|       from: fromNumber,
00112|       body,
00113|     });
00114|     return true;
00115|   } catch (err) {
00116|     console.error("SMS send failed:", err);
00117|     return false;
00118|   }
00119| }
00120| ```
00121| 
00122| **Step 3: Commit**
00123| ```bash
00124| git add apps/api/src/services/sms.ts apps/api/package.json pnpm-lock.yaml
00125| git commit -m "feat(notifications): add Twilio SMS service"
00126| ```
00127| 
00128| ---
00129| 
00130| ### Task 3: Extend NotificationService with Delivery Tracking
00131| 
00132| **Files:**
00133| - Modify: `apps/api/src/services/notification.ts`
00134| - Create: `apps/api/src/__tests__/notification.test.ts`
00135| 
00136| **Step 1: Write failing test**
00137| 
00138| ```typescript
00139| import { describe, expect, it, vi } from "vitest";
00140| import { NotificationService } from "../services/notification";
00141| 
00142| vi.mock("expo-server-sdk", () => ({
00143|   Expo: class {
00144|     static isExpoPushToken(token: string) { return token.startsWith("ExponentPushToken"); }
00145|     chunkPushNotifications(msgs: any[]) { return [msgs]; }
00146|     async sendPushNotificationsAsync() {
00147|       return [{ status: "ok", id: "ticket-1" }];
00148|     }
00149|   },
00150| }));
00151| 
00152| describe("NotificationService", () => {
00153|   it("creates delivery records when sending push", async () => {
00154|     const mockCreate = vi.fn().mockResolvedValue({ id: "del-1" });
00155|     const mockPrisma = {
00156|       user: {
00157|         findMany: vi.fn().mockResolvedValue([
00158|           { id: "user-1", pushToken: "ExponentPushToken[abc]" },
00159|         ]),
00160|       },
00161|       notificationDelivery: {
00162|         create: mockCreate,
00163|         update: vi.fn(),
00164|       },
00165|     };
00166| 
00167|     const svc = new NotificationService(mockPrisma as any);
00168|     await svc.sendPush(
00169|       ["user-1"],
00170|       "Test Title",
00171|       "Test Body",
00172|       { messageId: "msg-1" },
00173|     );
00174| 
00175|     expect(mockCreate).toHaveBeenCalledWith(
00176|       expect.objectContaining({
00177|         data: expect.objectContaining({
00178|           userId: "user-1",
00179|           channel: "PUSH",
00180|           status: "SENT",
00181|         }),
00182|       }),
00183|     );
00184|   });
00185| });
00186| ```
00187| 
00188| **Step 2: Run test to verify it fails**
00189| 
00190| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/notification.test.ts`
00191| Expected: FAIL
00192| 
00193| **Step 3: Update NotificationService**
00194| 
00195| Add delivery tracking to `sendPush`:
00196| 
00197| ```typescript
00198| // After successful push send, for each user:
00199| if (data?.messageId) {
00200|   await this.prisma.notificationDelivery.create({
00201|     data: {
00202|       messageId: data.messageId as string,
00203|       userId: user.id,
00204|       channel: "PUSH",
00205|       status: "SENT",
00206|       sentAt: new Date(),
00207|     },
00208|   }).catch(() => {}); // non-blocking
00209| }
00210| ```
00211| 
00212| Add new method `sendFallback`:
00213| 
00214| ```typescript
00215| async sendFallback(messageId: string, userId: string, title: string, body: string) {
00216|   const user = await this.prisma.user.findUnique({
00217|     where: { id: userId },
00218|     select: { phone: true, email: true },
00219|   });
00220| 
00221|   if (!user) return;
00222| 
00223|   // Try SMS first if phone available
00224|   if (user.phone) {
00225|     const { sendSms } = await import("./sms");
00226|     const sent = await sendSms(user.phone, `${title}: ${body}`);
00227|     if (sent) {
00228|       await this.prisma.notificationDelivery.create({
00229|         data: { messageId, userId, channel: "SMS", status: "SENT", sentAt: new Date() },
00230|       }).catch(() => {});
00231|       return;
00232|     }
00233|   }
00234| 
00235|   // Email fallback (future: integrate with email service)
00236|   // For now, log intent
00237|   console.log(`Email fallback needed for user ${userId}, message ${messageId}`);
00238| }
00239| ```
00240| 
00241| **Step 4: Run tests**
00242| 
00243| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/notification.test.ts`
00244| Expected: PASS
00245| 
00246| **Step 5: Commit**
00247| ```bash
00248| git add apps/api/src/services/notification.ts apps/api/src/__tests__/notification.test.ts
00249| git commit -m "feat(notifications): add delivery tracking and SMS fallback"
00250| ```
00251| 
00252| ---
00253| 
00254| ### Task 4: Implement Quiet Hours Enforcement
00255| 
00256| **Files:**
00257| - Modify: `apps/api/src/services/notification.ts`
00258| 
00259| **Step 1: Add quiet hours check**
00260| 
00261| Add helper method to NotificationService:
00262| 
00263| ```typescript
00264| private isInQuietHours(user: { quietStart: string | null; quietEnd: string | null }): boolean {
00265|   if (!user.quietStart || !user.quietEnd) return false;
00266| 
00267|   const now = new Date();
00268|   const [startH, startM] = user.quietStart.split(":").map(Number);
00269|   const [endH, endM] = user.quietEnd.split(":").map(Number);
00270| 
00271|   const currentMinutes = now.getHours() * 60 + now.getMinutes();
00272|   const startMinutes = startH * 60 + startM;
00273|   const endMinutes = endH * 60 + endM;
00274| 
00275|   if (startMinutes <= endMinutes) {
00276|     return currentMinutes >= startMinutes && currentMinutes < endMinutes;
00277|   }
00278|   // Wraps midnight (e.g., 22:00 - 07:00)
00279|   return currentMinutes >= startMinutes || currentMinutes < endMinutes;
00280| }
00281| ```
00282| 
00283| In `sendPush`, update user query to include quiet hours and message category:
00284| 
00285| ```typescript
00286| // Fetch users with quiet hours
00287| const users = await this.prisma.user.findMany({
00288|   where: { id: { in: userIds }, pushToken: { not: null } },
00289|   select: { id: true, pushToken: true, quietStart: true, quietEnd: true },
00290| });
00291| 
00292| // Filter: skip quiet hours unless URGENT
00293| for (const user of users) {
00294|   if (data?.category !== "URGENT" && this.isInQuietHours(user)) {
00295|     continue; // Queue for later delivery
00296|   }
00297|   // ... send push
00298| }
00299| ```
00300| 
00301| **Step 2: Commit**
00302| ```bash
00303| git add apps/api/src/services/notification.ts
00304| git commit -m "feat(notifications): enforce quiet hours (bypass for URGENT)"
00305| ```
00306| 
00307| ---
00308| 
00309| ### Task 5: Fallback Cron Job
00310| 
00311| **Files:**
00312| - Create: `apps/api/src/jobs/notification-fallback.ts`
00313| - Modify: `apps/api/src/index.ts` (register interval)
00314| 
00315| **Step 1: Create notification-fallback.ts**
00316| 
00317| ```typescript
00318| import type { PrismaClient } from "@schoolconnect/db";
00319| import { notificationService } from "../services/notification";
00320| 
00321| export async function checkUndeliveredNotifications(prisma: PrismaClient) {
00322|   const fallbackDelayMinutes = Number(process.env.NOTIFICATION_FALLBACK_DELAY_MINUTES || 15);
00323|   const cutoff = new Date(Date.now() - fallbackDelayMinutes * 60 * 1000);
00324| 
00325|   // Find PUSH deliveries that were sent but not opened within the timeout
00326|   // and have no SMS/EMAIL fallback yet
00327|   const undelivered = await prisma.notificationDelivery.findMany({
00328|     where: {
00329|       channel: "PUSH",
00330|       status: "SENT",
00331|       sentAt: { lt: cutoff },
00332|       message: {
00333|         category: { in: ["URGENT", "STANDARD"] }, // Don't fallback FYI messages
00334|         deliveries: {
00335|           none: {
00336|             userId: { not: undefined }, // Will be scoped per user below
00337|             channel: { in: ["SMS", "EMAIL"] },
00338|           },
00339|         },
00340|       },
00341|     },
00342|     include: {
00343|       message: { select: { id: true, subject: true, body: true, category: true } },
00344|     },
00345|     take: 100, // Process in batches
00346|   });
00347| 
00348|   const svc = notificationService.getInstance(prisma);
00349| 
00350|   for (const delivery of undelivered) {
00351|     await svc.sendFallback(
00352|       delivery.messageId,
00353|       delivery.userId,
00354|       delivery.message.subject,
00355|       delivery.message.body,
00356|     );
00357|   }
00358| 
00359|   if (undelivered.length > 0) {
00360|     console.log(`Processed ${undelivered.length} notification fallbacks`);
00361|   }
00362| }
00363| ```
00364| 
00365| **Step 2: Register in index.ts**
00366| 
00367| After server start, add:
00368| 
00369| ```typescript
00370| import { checkUndeliveredNotifications } from "./jobs/notification-fallback";
00371| 
00372| // Run every 5 minutes
00373| setInterval(() => {
00374|   checkUndeliveredNotifications(prisma).catch(console.error);
00375| }, 5 * 60 * 1000);
00376| ```
00377| 
00378| **Step 3: Commit**
00379| ```bash
00380| git add apps/api/src/jobs/notification-fallback.ts apps/api/src/index.ts
00381| git commit -m "feat(notifications): add fallback cron for SMS/email after push timeout"
00382| ```
00383| 
00384| ---
00385| 
00386| ### Task 6: Notification Preferences API
00387| 
00388| **Files:**
00389| - Modify: `apps/api/src/router/user.ts`
00390| 
00391| **Step 1: Add updateNotificationPreferences procedure**
00392| 
00393| ```typescript
00394| updateNotificationPreferences: protectedProcedure
00395|   .input(
00396|     z.object({
00397|       quietStart: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
00398|       quietEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
00399|       phone: z.string().nullable().optional(),
00400|       language: z.string().default("en"),
00401|     }),
00402|   )
00403|   .mutation(async ({ ctx, input }) => {
00404|     await ctx.prisma.user.update({
00405|       where: { id: ctx.user.id },
00406|       data: {
00407|         quietStart: input.quietStart,
00408|         quietEnd: input.quietEnd,
00409|         ...(input.phone !== undefined ? { phone: input.phone } : {}),
00410|         // language field to be added to User model first
00411|       },
00412|     });
00413|     return { success: true };
00414|   }),
00415| ```
00416| 
00417| **Step 2: Commit**
00418| ```bash
00419| git add apps/api/src/router/user.ts
00420| git commit -m "feat(notifications): add notification preferences endpoint"
00421| ```
00422| 
00423| ---
00424| 
00425| ### Task 7: Multi-Language Support
00426| 
00427| **Files:**
00428| - Create: `apps/api/src/services/translator.ts`
00429| - Modify: `packages/db/prisma/schema.prisma` (add language to User)
00430| - Modify: `apps/api/src/services/notification.ts`
00431| 
00432| **Step 1: Add language to User model**
00433| 
00434| ```prisma
00435| model User {
00436|   // ... existing fields
00437|   language String @default("en")
00438| }
00439| ```
00440| Run migration.
00441| 
00442| **Step 2: Create translator service**
00443| 
00444| ```typescript
00445| import { translate } from 'google-translate-api-x';
00446| 
00447| export async function translateText(text: string, targetLang: string): Promise<string> {
00448|   if (targetLang === 'en') return text;
00449|   try {
00450|     const res = await translate(text, { to: targetLang });
00451|     return res.text;
00452|   } catch (e) {
00453|     console.error("Translation failed", e);
00454|     return text;
00455|   }
00456| }
00457| ```
00458| 
00459| **Step 3: Integrate with NotificationService**
00460| 
00461| In `sendPush`, group users by language.
00462| Translate `title` and `body` for each language group.
00463| Send tailored notifications.
00464| 
00465| **Step 4: Commit**
00466| ```bash
00467| git add apps/api/src/services/translator.ts packages/db/prisma/schema.prisma apps/api/src/services/notification.ts
00468| git commit -m "feat(notifications): add auto-translation support"
00469| ```
00470| 
