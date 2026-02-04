<file>
00001| # Payment Receipts & Cart Implementation Plan
00002| 
00003| > **For AI:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
00004| 
00005| **Goal:** Add multi-item shopping cart checkout and UC-compliant receipt generation to the existing payments system.
00006| 
00007| **Architecture:**
00008| - Extend the existing `paymentsRouter` with `createCartCheckout` (multi-item Stripe session) and `getPaymentHistory` / `getReceipt` queries.
00009| - Receipt generation returns structured data matching Universal Credit requirements (provider name, Ofsted URN, child name, service, dates, amount, transaction ref).
00010| - Web: Payment history page and receipt download. Mobile: History screen.
00011| - No new Prisma models needed — existing `Payment`, `PaymentLineItem` and `PaymentItem` support multi-line payments already.
00012| - **Instalments:** Support partial payments for high-value items.
00013| - **Auto Top-up:** Recurring payments for meals.
00014| 
00015| **Tech Stack:** Stripe, tRPC, Prisma, Zod, Next.js, React Native.
00016| 
00017| ---
00018| 
00019| ### Task 1: Implement createCartCheckout
00020| 
00021| **Files:**
00022| - Modify: `apps/api/src/router/payments.ts`
00023| - Modify: `apps/api/src/__tests__/payments.test.ts` (create if missing)
00022| 
00023| **Step 1: Write failing test**
00024| 
00025| Create `apps/api/src/__tests__/payments.test.ts`:
00026| 
00027| ```typescript
00028| import { describe, expect, it, vi } from "vitest";
00029| import { appRouter } from "../router";
00030| 
00031| vi.mock("../lib/stripe", () => ({
00032|   stripe: {
00033|     checkout: {
00034|       sessions: {
00035|         create: vi.fn().mockResolvedValue({
00036|           id: "cs_test_123",
00037|           url: "https://checkout.stripe.com/test",
00038|         }),
00039|       },
00040|     },
00041|   },
00042| }));
00043| 
00044| function createTestContext(overrides?: Record<string, any>): any {
00045|   return {
00046|     prisma: {
00047|       parentChild: {
00048|         findMany: vi.fn().mockResolvedValue([{ childId: "child-1" }]),
00049|         findUnique: vi.fn().mockResolvedValue({ userId: "parent-1", childId: "child-1" }),
00050|       },
00051|       paymentItem: {
00052|         findMany: vi.fn().mockResolvedValue([
00053|           {
00054|             id: "item-1",
00055|             title: "Trip Deposit",
00056|             description: "Year 3 trip",
00057|             amount: 2500,
00058|             schoolId: "school-1",
00059|             school: { id: "school-1", stripeAccountId: "acct_123" },
00060|             children: [{ childId: "child-1" }],
00061|           },
00062|           {
00063|             id: "item-2",
00064|             title: "Dinner Money",
00065|             description: null,
00066|             amount: 1200,
00067|             schoolId: "school-1",
00068|             school: { id: "school-1", stripeAccountId: "acct_123" },
00069|             children: [{ childId: "child-1" }],
00070|           },
00071|         ]),
00072|       },
00073|       payment: {
00074|         create: vi.fn().mockResolvedValue({ id: "pay-1" }),
00075|         update: vi.fn().mockResolvedValue({}),
00076|         findFirst: vi.fn().mockResolvedValue(null),
00077|         findMany: vi.fn().mockResolvedValue([]),
00078|       },
00079|     },
00080|     req: {},
00081|     res: {},
00082|     user: { id: "parent-1" },
00083|     session: {},
00084|     ...overrides,
00085|   };
00086| }
00087| 
00088| describe("payments router", () => {
00089|   describe("createCartCheckout", () => {
00090|     it("creates checkout for multiple items", async () => {
00091|       const ctx = createTestContext();
00092|       const caller = appRouter.createCaller(ctx);
00093| 
00094|       const result = await caller.payments.createCartCheckout({
00095|         items: [
00096|           { paymentItemId: "item-1", childId: "child-1" },
00097|           { paymentItemId: "item-2", childId: "child-1" },
00098|         ],
00099|       });
00100| 
00101|       expect(result.url).toBe("https://checkout.stripe.com/test");
00102|       expect(ctx.prisma.payment.create).toHaveBeenCalledWith(
00103|         expect.objectContaining({
00104|           data: expect.objectContaining({
00105|             totalAmount: 3700, // 2500 + 1200
00106|           }),
00107|         }),
00108|       );
00109|     });
00110|   });
00111| });
00112| ```
00113| 
00114| **Step 2: Run test to verify it fails**
00115| 
00116| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/payments.test.ts`
00117| Expected: FAIL — `createCartCheckout` not a function.
00118| 
00119| **Step 3: Implement createCartCheckout**
00120| 
00121| Add to `paymentsRouter` in `payments.ts`:
00122| 
00123| ```typescript
00124| createCartCheckout: protectedProcedure
00125|   .input(
00126|     z.object({
00127|       items: z.array(
00128|         z.object({
00129|           paymentItemId: z.string(),
00130|           childId: z.string(),
00131|         }),
00132|       ).min(1),
00133|     }),
00134|   )
00135|   .mutation(async ({ ctx, input }) => {
00136|     // 1. Fetch all payment items with school info
00137|     const paymentItemIds = [...new Set(input.items.map((i) => i.paymentItemId))];
00138|     const paymentItems = await ctx.prisma.paymentItem.findMany({
00139|       where: { id: { in: paymentItemIds } },
00140|       include: {
00141|         school: { select: { id: true, stripeAccountId: true } },
00142|         children: true,
00143|       },
00144|     });
00145| 
00146|     const itemMap = new Map(paymentItems.map((pi: any) => [pi.id, pi]));
00147| 
00148|     // 2. Validate all items exist and belong to same school
00149|     let stripeAccountId: string | null = null;
00150|     let totalAmount = 0;
00151|     const lineItems: Array<{ price_data: any; quantity: number }> = [];
00152| 
00153|     for (const cartItem of input.items) {
00154|       const pi = itemMap.get(cartItem.paymentItemId);
00155|       if (!pi) {
00156|         throw new TRPCError({
00157|           code: "NOT_FOUND",
00158|           message: `Payment item ${cartItem.paymentItemId} not found`,
00159|         });
00160|       }
00161| 
00162|       const schoolStripe = (pi.school as any).stripeAccountId;
00163|       if (!schoolStripe) {
00164|         throw new TRPCError({
00165|           code: "PRECONDITION_FAILED",
00166|           message: "School has not set up payments",
00167|         });
00168|       }
00169| 
00170|       if (stripeAccountId && stripeAccountId !== schoolStripe) {
00171|         throw new TRPCError({
00172|           code: "BAD_REQUEST",
00173|           message: "All items must be from the same school",
00174|         });
00175|       }
00176|       stripeAccountId = schoolStripe;
00177| 
00178|       totalAmount += pi.amount;
00179|       lineItems.push({
00180|         price_data: {
00181|           currency: "gbp",
00182|           product_data: {
00183|             name: pi.title,
00184|             description: pi.description || undefined,
00185|           },
00186|           unit_amount: pi.amount,
00187|         },
00188|         quantity: 1,
00189|       });
00190|     }
00191| 
00192|     // 3. Create Payment record
00193|     const payment = await ctx.prisma.payment.create({
00194|       data: {
00195|         userId: ctx.user.id,
00196|         totalAmount,
00197|         status: "PENDING",
00198|       },
00199|     });
00200| 
00201|     // 4. Create Stripe session
00202|     const session = await (stripe.checkout.sessions.create as any)({
00203|       payment_method_types: ["card"],
00204|       line_items: lineItems,
00205|       mode: "payment",
00206|       success_url: `${process.env.WEB_URL}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}`,
00207|       cancel_url: `${process.env.WEB_URL}/dashboard/payments`,
00208|       metadata: {
00209|         paymentId: payment.id,
00210|         userId: ctx.user.id,
00211|         // Store cart items as JSON for webhook processing
00212|         cartItems: JSON.stringify(input.items),
00213|       },
00214|       payment_intent_data: {
00215|         transfer_data: {
00216|           destination: stripeAccountId,
00217|         },
00218|       },
00219|     });
00220| 
00221|     await ctx.prisma.payment.update({
00222|       where: { id: payment.id },
00223|       data: { stripeId: (session as any).id },
00224|     });
00225| 
00226|     return { url: (session as any).url };
00227|   }),
00228| ```
00229| 
00230| **Step 4: Run test**
00231| 
00232| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/payments.test.ts`
00233| Expected: PASS
00234| 
00235| **Step 5: Commit**
00236| ```bash
00237| git add apps/api/src/router/payments.ts apps/api/src/__tests__/payments.test.ts
00238| git commit -m "feat(payments): implement multi-item cart checkout"
00239| ```
00240| 
00241| ---
00242| 
00243| ### Task 2: Update Webhook for Cart Payments
00244| 
00245| **Files:**
00246| - Modify: `apps/api/src/routes/webhooks.ts`
00247| 
00248| **Step 1: Update webhook to handle cart metadata**
00249| 
00250| The existing webhook creates a single `PaymentLineItem`. Update it to parse `cartItems` JSON from metadata and create a line item per cart entry:
00251| 
00252| ```typescript
00253| if (metadata?.paymentId) {
00254|   await prisma.$transaction(async (tx: any) => {
00255|     await tx.payment.update({
00256|       where: { id: metadata.paymentId },
00257|       data: {
00258|         status: "COMPLETED",
00259|         completedAt: new Date(),
00260|         receiptNumber: `SC-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`,
00261|       },
00262|     });
00263| 
00264|     // Handle cart (multi-item) or single-item
00265|     if (metadata.cartItems) {
00266|       const cartItems = JSON.parse(metadata.cartItems);
00267|       for (const item of cartItems) {
00268|         // Look up the amount for this specific item
00269|         const paymentItem = await tx.paymentItem.findUnique({
00270|           where: { id: item.paymentItemId },
00271|           select: { amount: true },
00272|         });
00273|         await tx.paymentLineItem.create({
00274|           data: {
00275|             paymentId: metadata.paymentId,
00276|             paymentItemId: item.paymentItemId,
00277|             childId: item.childId,
00278|             amount: paymentItem?.amount || 0,
00279|           },
00280|         });
00281|       }
00282|     } else if (metadata.paymentItemId) {
00283|       await tx.paymentLineItem.create({
00284|         data: {
00285|           paymentId: metadata.paymentId,
00286|           paymentItemId: metadata.paymentItemId,
00287|           childId: metadata.childId,
00288|           amount: session.amount_total,
00289|         },
00290|       });
00291|     }
00292|   });
00293| }
00294| ```
00295| 
00296| **Step 2: Commit**
00297| ```bash
00298| git add apps/api/src/routes/webhooks.ts
00299| git commit -m "feat(payments): handle cart items in stripe webhook"
00300| ```
00301| 
00302| ---
00303| 
00304| ### Task 3: Implement getPaymentHistory and getReceipt
00305| 
00306| **Files:**
00307| - Modify: `apps/api/src/router/payments.ts`
00308| - Modify: `apps/api/src/__tests__/payments.test.ts`
00309| 
00310| **Step 1: Write failing tests**
00311| 
00312| Add to test file:
00313| 
00314| ```typescript
00315| describe("getPaymentHistory", () => {
00316|   it("returns completed payments for parent", async () => {
00317|     const ctx = createTestContext({
00318|       prisma: {
00319|         ...createTestContext().prisma,
00320|         payment: {
00321|           ...createTestContext().prisma.payment,
00322|           findMany: vi.fn().mockResolvedValue([
00323|             {
00324|               id: "pay-1",
00325|               totalAmount: 2500,
00326|               status: "COMPLETED",
00327|               receiptNumber: "SC-2026-00001234",
00328|               completedAt: new Date(),
00329|               createdAt: new Date(),
00330|               lineItems: [
00331|                 {
00332|                   amount: 2500,
00333|                   childId: "child-1",
00334|                   paymentItem: { title: "Trip", category: "TRIP", school: { name: "Oak School", urn: "123456" } },
00335|                 },
00336|               ],
00337|             },
00338|           ]),
00339|           count: vi.fn().mockResolvedValue(1),
00340|         },
00341|       },
00342|     });
00343|     const caller = appRouter.createCaller(ctx);
00344| 
00345|     const result = await caller.payments.getPaymentHistory({
00346|       page: 1,
00347|       limit: 20,
00348|     });
00349| 
00350|     expect(result.data.length).toBe(1);
00351|     expect(result.data[0].receiptNumber).toBe("SC-2026-00001234");
00352|   });
00353| });
00354| ```
00355| 
00356| **Step 2: Implement getPaymentHistory**
00357| 
00358| ```typescript
00359| getPaymentHistory: protectedProcedure
00360|   .input(
00361|     z.object({
00362|       page: z.number().min(1).default(1),
00363|       limit: z.number().min(1).max(100).default(20),
00364|     }),
00365|   )
00366|   .query(async ({ ctx, input }) => {
00367|     const skip = (input.page - 1) * input.limit;
00368| 
00369|     const [payments, total] = await Promise.all([
00370|       ctx.prisma.payment.findMany({
00371|         where: {
00372|           userId: ctx.user.id,
00373|           status: "COMPLETED",
00374|         },
00375|         orderBy: { completedAt: "desc" },
00376|         take: input.limit,
00377|         skip,
00378|         include: {
00379|           lineItems: {
00380|             include: {
00381|               paymentItem: {
00382|                 include: {
00383|                   school: { select: { name: true, urn: true } },
00384|                 },
00385|               },
00386|             },
00387|           },
00388|         },
00389|       }),
00390|       ctx.prisma.payment.count({
00391|         where: { userId: ctx.user.id, status: "COMPLETED" },
00392|       }),
00393|     ]);
00394| 
00395|     return {
00396|       data: payments,
00397|       total,
00398|       totalPages: Math.ceil(total / input.limit),
00399|     };
00400|   }),
00401| ```
00402| 
00403| **Step 3: Implement getReceipt**
00404| 
00405| ```typescript
00406| getReceipt: protectedProcedure
00407|   .input(z.object({ paymentId: z.string() }))
00408|   .query(async ({ ctx, input }) => {
00409|     const payment = await ctx.prisma.payment.findUnique({
00410|       where: { id: input.paymentId },
00411|       include: {
00412|         user: { select: { name: true, email: true } },
00413|         lineItems: {
00414|           include: {
00415|             paymentItem: {
00416|               include: {
00417|                 school: { select: { name: true, urn: true, address: true } },
00418|               },
00419|             },
00420|           },
00421|         },
00422|       },
00423|     });
00424| 
00425|     if (!payment || payment.userId !== ctx.user.id) {
00426|       throw new TRPCError({
00427|         code: "NOT_FOUND",
00428|         message: "Payment not found",
00429|       });
00430|     }
00431| 
00432|     // Build UC-compliant receipt structure
00433|     const school = (payment.lineItems[0]?.paymentItem as any)?.school;
00434| 
00435|     return {
00436|       receiptNumber: payment.receiptNumber,
00437|       providerName: school?.name || "Unknown",
00438|       providerRegistration: school?.urn ? `Ofsted URN: ${school.urn}` : "",
00439|       providerAddress: school?.address || "",
00440|       parentName: (payment.user as any)?.name || "",
00441|       parentEmail: (payment.user as any)?.email || "",
00442|       datePaid: payment.completedAt,
00443|       totalAmount: payment.totalAmount,
00444|       lineItems: payment.lineItems.map((li: any) => ({
00445|         childName: li.childId, // Will resolve in UI or expand query
00446|         service: li.paymentItem?.title || "",
00447|         category: li.paymentItem?.category || "",
00448|         amount: li.amount,
00449|       })),
00450|     };
00451|   }),
00452| ```
00453| 
00454| **Step 4: Run tests**
00455| 
00456| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/payments.test.ts`
00457| Expected: PASS
00458| 
00459| **Step 5: Commit**
00460| ```bash
00461| git add apps/api/src/router/payments.ts apps/api/src/__tests__/payments.test.ts
00462| git commit -m "feat(payments): add payment history and UC-compliant receipt endpoint"
00463| ```
00464| 
00465| ---
00466| 
00467| ### Task 4: Payment History Web UI
00468| 
00469| **Files:**
00470| - Create: `apps/web/src/app/dashboard/payments/history/page.tsx`
00471| - Create: `apps/web/src/components/payments/payment-history.tsx`
00472| - Create: `apps/web/src/components/payments/receipt-view.tsx`
00473| - Modify: `apps/web/src/app/dashboard/payments/page.tsx` (add link)
00474| 
00475| **Step 1: Create payment-history.tsx**
00476| 
00477| - Use `trpc.payments.getPaymentHistory.useQuery` with pagination.
00478| - Table of completed payments: date, receipt number, total, "View Receipt" link.
00479| 
00480| **Step 2: Create receipt-view.tsx**
00481| 
00482| - Use `trpc.payments.getReceipt.useQuery({ paymentId })`.
00483| - Display UC-compliant receipt with: Provider Name, Ofsted URN, Parent Name, Child Name, Service, Dates, Amount, Transaction Ref.
00484| - "Print" button using `window.print()`.
00485| 
00486| **Step 3: Create history/page.tsx**
00487| 
00488| ```typescript
00489| import { PaymentHistory } from "@/components/payments/payment-history";
00490| 
00491| export default function PaymentHistoryPage() {
00492|   return (
00493|     <div className="max-w-4xl mx-auto px-4">
00494|       <h1 className="text-2xl font-bold mb-6">Payment History</h1>
00495|       <PaymentHistory />
00496|     </div>
00497|   );
00498| }
00499| ```
00500| 
00501| **Step 4: Add link from payments page**
00502| 
00503| Add a "View Payment History" link to the parent section of `payments/page.tsx`.
00504| 
00505| **Step 5: Commit**
00506| ```bash
00507| git add apps/web/src/app/dashboard/payments/history/page.tsx apps/web/src/components/payments/payment-history.tsx apps/web/src/components/payments/receipt-view.tsx apps/web/src/app/dashboard/payments/page.tsx
00508| git commit -m "feat(payments): add payment history and receipt web UI"
00509| ```
00510| 
00511| ---
00512| 
00513| ### Task 5: Cart Checkout Web UI
00514| 
00515| **Files:**
00516| - Create: `apps/web/src/components/payments/payment-cart.tsx`
00517| - Modify: `apps/web/src/components/payments/outstanding-payments.tsx`
00518| 
00519| **Step 1: Create payment-cart.tsx**
00520| 
00521| - State: `cartItems: Array<{ paymentItemId: string; childId: string }>`.
00522| - "Add to Cart" buttons on each outstanding item.
00523| - Cart summary showing items, total, "Checkout" button.
00524| - Checkout calls `trpc.payments.createCartCheckout.useMutation`.
00525| - On success, redirect to Stripe URL.
00526| 
00527| **Step 2: Update outstanding-payments.tsx**
00528| 
00529| Replace individual "Pay Now" buttons with "Add to Cart" + a cart summary section. Keep single-item "Pay Now" as a shortcut that adds to cart and immediately checks out.
00530| 
00531| **Step 3: Commit**
00532| ```bash
00533| git add apps/web/src/components/payments/payment-cart.tsx apps/web/src/components/payments/outstanding-payments.tsx
00534| git commit -m "feat(payments): add shopping cart UI for multi-item checkout"
00535| ```
00536| 
00537| ---
00538| 
00539| ### Task 6: Instalments & Auto Top-up
00540| 
00541| **Files:**
00542| - Modify: `packages/db/prisma/schema.prisma`
00543| - Modify: `apps/api/src/router/payments.ts`
00544| 
00545| **Step 1: Schema Updates**
00546| 
00547| Add `allowInstalments` (boolean) and `instalmentPlan` (json) to `PaymentItem`.
00548| Add `isRecurring` to `PaymentItem` for auto top-up.
00549| 
00550| **Step 2: Update createCartCheckout**
00551| 
00552| Allow specifying `amount` for instalment items in the input.
00553| If `isRecurring`, use `mode: 'subscription'` in Stripe Checkout (requires Stripe Product/Price creation logic - simplified for MVP to just "save card" mode: 'setup').
00554| 
00555| **Step 3: Commit**
00556| ```bash
00557| git add packages/db/prisma/schema.prisma apps/api/src/router/payments.ts
00558| git commit -m "feat(payments): add schema support for instalments and auto top-up"
00559| ```
00560| 
