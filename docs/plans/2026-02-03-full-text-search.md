<file>
00001| # Full-Text Search Implementation Plan
00002| 
00003| > **For AI:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
00004| 
00005| **Goal:** Implement full-text search across messages, events, and payment items so parents can quickly find past information.
00006| 
00007| **Architecture:**
00008| - Elasticsearch client already configured at `apps/api/src/lib/elasticsearch.ts`.
00009| - Add a `searchRouter` with a unified `search` query that fans out to ES indices.
00010| - Index documents on creation (add indexing calls to existing routers).
00011| - Web: Add search bar to dashboard layout. Mobile: Add search screen.
00012| - Indices: `messages`, `events`, `payment_items`.
00013| - **OCR:** Extract text from attached PDFs/Images using `pdf-parse` and `tesseract.js`.
00014| 
00015| **Tech Stack:** Elasticsearch 9.x, tRPC, Zod, Next.js, React Native, `pdf-parse`, `tesseract.js`.
00016| 
00017| ---
00018| 
00019| ### Task 1: Create Elasticsearch Index Helpers
00020| 
00021| **Files:**
00022| - Create: `apps/api/src/lib/search-indexer.ts`
00023| 
00024| **Step 1: Create search-indexer.ts**
00025| 
00026| This module handles index creation and document indexing:
00027| 
00028| ```typescript
00029| import { elasticsearchClient } from "./elasticsearch";
00030| 
00031| const INDICES = {
00032|   messages: "schoolconnect_messages",
00033|   events: "schoolconnect_events",
00034|   paymentItems: "schoolconnect_payment_items",
00035| };
00036| 
00037| export async function ensureIndices() {
00038|   for (const index of Object.values(INDICES)) {
00039|     try {
00040|       const exists = await elasticsearchClient.indices.exists({ index });
00041|       if (!exists) {
00042|         await elasticsearchClient.indices.create({
00043|           index,
00044|           body: {
00045|             mappings: {
00046|               properties: {
00047|                 title: { type: "text" },
00048|                 body: { type: "text" },
00049|                 schoolId: { type: "keyword" },
00050|                 category: { type: "keyword" },
00051|                 createdAt: { type: "date" },
00052|                 childIds: { type: "keyword" },
00053|               },
00054|             },
00055|           },
00056|         });
00057|       }
00058|     } catch (err) {
00059|       console.warn(`Failed to ensure index ${index}:`, err);
00060|     }
00061|   }
00062| }
00063| 
00064| export async function indexMessage(message: {
00065|   id: string;
00066|   schoolId: string;
00067|   subject: string;
00068|   body: string;
00069|   category: string;
00070|   createdAt: Date;
00071|   childIds: string[];
00072| }) {
00073|   try {
00074|     await elasticsearchClient.index({
00075|       index: INDICES.messages,
00076|       id: message.id,
00077|       body: {
00078|         title: message.subject,
00079|         body: message.body,
00080|         schoolId: message.schoolId,
00081|         category: message.category,
00082|         createdAt: message.createdAt,
00083|         childIds: message.childIds,
00084|       },
00085|     });
00086|   } catch (err) {
00087|     console.warn("Failed to index message:", err);
00088|   }
00089| }
00090| 
00091| export async function indexEvent(event: {
00092|   id: string;
00093|   schoolId: string;
00094|   title: string;
00095|   body?: string | null;
00096|   category: string;
00097|   startDate: Date;
00098| }) {
00099|   try {
00100|     await elasticsearchClient.index({
00101|       index: INDICES.events,
00102|       id: event.id,
00103|       body: {
00104|         title: event.title,
00105|         body: event.body || "",
00106|         schoolId: event.schoolId,
00107|         category: event.category,
00108|         createdAt: event.startDate,
00109|       },
00110|     });
00111|   } catch (err) {
00112|     console.warn("Failed to index event:", err);
00113|   }
00114| }
00115| 
00116| export async function indexPaymentItem(item: {
00117|   id: string;
00118|   schoolId: string;
00119|   title: string;
00120|   description?: string | null;
00121|   category: string;
00122|   createdAt: Date;
00123|   childIds: string[];
00124| }) {
00125|   try {
00126|     await elasticsearchClient.index({
00127|       index: INDICES.paymentItems,
00128|       id: item.id,
00129|       body: {
00130|         title: item.title,
00131|         body: item.description || "",
00132|         schoolId: item.schoolId,
00133|         category: item.category,
00134|         createdAt: item.createdAt,
00135|         childIds: item.childIds,
00136|       },
00137|     });
00138|   } catch (err) {
00139|     console.warn("Failed to index payment item:", err);
00140|   }
00141| }
00142| 
00143| export async function searchAll(params: {
00144|   query: string;
00145|   schoolIds: string[];
00146|   childIds?: string[];
00147|   limit?: number;
00148| }) {
00149|   const { query, schoolIds, childIds, limit = 20 } = params;
00150| 
00151|   const filter: any[] = [{ terms: { schoolId: schoolIds } }];
00151|   if (childIds && childIds.length > 0) {
00152|     // For messages/payments, filter by child; events don't have childIds
00153|   }
00154| 
00155|   const indices = Object.values(INDICES).join(",");
00156| 
00157|   try {
00158|     const result = await elasticsearchClient.search({
00159|       index: indices,
00160|       body: {
00161|         size: limit,
00162|         query: {
00163|           bool: {
00164|             must: {
00165|               multi_match: {
00166|                 query,
00167|                 fields: ["title^2", "body"],
00168|                 fuzziness: "AUTO",
00169|               },
00170|             },
00171|             filter,
00172|           },
00173|         },
00174|         highlight: {
00175|           fields: {
00176|             title: {},
00177|             body: { fragment_size: 150 },
00178|           },
00179|         },
00180|         sort: [{ _score: "desc" }, { createdAt: "desc" }],
00181|       },
00182|     });
00183| 
00184|     return result.hits.hits.map((hit: any) => ({
00185|       id: hit._id,
00186|       index: hit._index,
00187|       type: hit._index.replace("schoolconnect_", ""),
00188|       score: hit._score,
00189|       title: hit._source.title,
00190|       body: hit._source.body,
00191|       category: hit._source.category,
00192|       createdAt: hit._source.createdAt,
00193|       highlight: hit.highlight,
00194|     }));
00195|   } catch (err) {
00196|     console.error("Search failed:", err);
00197|     return [];
00198|   }
00199| }
00200| 
00201| export { INDICES };
00202| ```
00203| 
00204| **Step 2: Commit**
00205| ```bash
00206| git add apps/api/src/lib/search-indexer.ts
00207| git commit -m "feat(search): add elasticsearch index helpers"
00208| ```
00209| 
00210| ---
00211| 
00212| ### Task 2: Create Search Router
00213| 
00214| **Files:**
00215| - Create: `apps/api/src/router/search.ts`
00216| - Modify: `apps/api/src/router/index.ts`
00217| - Create: `apps/api/src/__tests__/search.test.ts`
00218| 
00219| **Step 1: Write failing test**
00220| 
00221| ```typescript
00222| import { describe, expect, it, vi } from "vitest";
00223| import { appRouter } from "../router";
00224| 
00225| // Mock search-indexer
00226| vi.mock("../lib/search-indexer", () => ({
00227|   searchAll: vi.fn().mockResolvedValue([
00228|     {
00229|       id: "msg-1",
00230|       index: "schoolconnect_messages",
00231|       type: "messages",
00232|       score: 1.5,
00233|       title: "PE Kit Reminder",
00234|       body: "Please bring PE kit on Friday",
00235|       category: "STANDARD",
00236|       createdAt: new Date().toISOString(),
00237|       highlight: { title: ["<em>PE</em> Kit Reminder"] },
00238|     },
00239|   ]),
00240| }));
00241| 
00242| function createTestContext(overrides?: Record<string, any>): any {
00243|   return {
00244|     prisma: {
00245|       parentChild: {
00246|         findMany: vi.fn().mockResolvedValue([
00247|           { childId: "child-1", child: { schoolId: "school-1" } },
00248|         ]),
00249|       },
00250|     },
00251|     req: {},
00252|     res: {},
00253|     user: { id: "parent-1" },
00254|     session: {},
00255|     ...overrides,
00256|   };
00257| }
00258| 
00259| describe("search router", () => {
00260|   it("returns search results for parent", async () => {
00261|     const ctx = createTestContext();
00262|     const caller = appRouter.createCaller(ctx);
00263| 
00264|     const result = await caller.search.query({ query: "PE" });
00265| 
00266|     expect(result.length).toBe(1);
00267|     expect(result[0].title).toBe("PE Kit Reminder");
00268|   });
00269| });
00270| ```
00271| 
00272| **Step 2: Run test to verify it fails**
00273| 
00274| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/search.test.ts`
00275| Expected: FAIL
00276| 
00277| **Step 3: Create search.ts router**
00278| 
00279| ```typescript
00280| import { z } from "zod";
00281| import { protectedProcedure, router } from "../trpc";
00282| import { searchAll } from "../lib/search-indexer";
00283| 
00284| export const searchRouter = router({
00285|   query: protectedProcedure
00286|     .input(
00287|       z.object({
00288|         query: z.string().min(1).max(200),
00289|         limit: z.number().min(1).max(50).default(20),
00290|       }),
00291|     )
00292|     .query(async ({ ctx, input }) => {
00293|       // Get parent's schools
00294|       const parentLinks = await ctx.prisma.parentChild.findMany({
00295|         where: { userId: ctx.user.id },
00296|         select: {
00297|           childId: true,
00298|           child: { select: { schoolId: true } },
00299|         },
00300|       });
00301| 
00302|       const schoolIds = [...new Set(parentLinks.map((p: any) => p.child.schoolId))];
00303|       const childIds = parentLinks.map((p: any) => p.childId);
00304| 
00305|       if (schoolIds.length === 0) return [];
00306| 
00307|       return searchAll({
00308|         query: input.query,
00309|         schoolIds,
00310|         childIds,
00311|         limit: input.limit,
00312|       });
00313|     }),
00314| });
00315| ```
00316| 
00317| **Step 4: Register in index.ts**
00318| 
00319| ```typescript
00320| import { searchRouter } from "./search";
00321| // Add to appRouter:
00322| search: searchRouter,
00323| ```
00324| 
00325| **Step 5: Run test to verify it passes**
00326| 
00327| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/search.test.ts`
00328| Expected: PASS
00329| 
00330| **Step 6: Commit**
00331| ```bash
00332| git add apps/api/src/router/search.ts apps/api/src/router/index.ts apps/api/src/__tests__/search.test.ts
00333| git commit -m "feat(search): add search router with unified query"
00334| ```
00335| 
00336| ---
00337| 
00338| ### Task 3: Add Indexing to Messaging Router
00339| 
00340| **Files:**
00341| - Modify: `apps/api/src/router/messaging.ts`
00342| 
00343| **Step 1: Add index call after message creation**
00344| 
00345| After `ctx.prisma.message.create(...)` in the `send` procedure, add:
00346| 
00347| ```typescript
00348| import { indexMessage } from "../lib/search-indexer";
00349| 
00350| // After message creation, fire-and-forget index:
00351| indexMessage({
00352|   id: message.id,
00353|   schoolId: input.schoolId,
00354|   subject: input.subject,
00355|   body: input.body,
00356|   category: input.category,
00357|   createdAt: new Date(),
00358|   childIds: targetChildIds,
00359| }).catch(() => {}); // non-blocking
00360| ```
00361| 
00362| **Step 2: Run existing messaging tests to verify no regression**
00363| 
00364| Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/messaging.test.ts`
00365| Expected: PASS (indexMessage is fire-and-forget, won't break existing tests)
00366| 
00367| **Step 3: Commit**
00368| ```bash
00369| git add apps/api/src/router/messaging.ts
00370| git commit -m "feat(search): index messages on creation"
00371| ```
00372| 
00373| ---
00374| 
00375| ### Task 4: Add Indexing to Calendar and Payments Routers
00376| 
00377| **Files:**
00378| - Modify: `apps/api/src/router/calendar.ts`
00379| - Modify: `apps/api/src/router/payments.ts`
00380| 
00381| **Step 1: Add index call to calendar createEvent**
00382| 
00383| After `ctx.prisma.event.create(...)`, add:
00384| 
00385| ```typescript
00386| import { indexEvent } from "../lib/search-indexer";
00387| 
00388| // After event creation:
00389| const event = await ctx.prisma.event.create({ ... });
00390| indexEvent({
00391|   id: event.id,
00392|   schoolId: input.schoolId,
00393|   title: input.title,
00394|   body: input.body,
00395|   category: input.category,
00396|   startDate: input.startDate,
00397| }).catch(() => {});
00398| ```
00399| 
00400| **Step 2: Add index call to payments createPaymentItem**
00401| 
00402| After `ctx.prisma.paymentItem.create(...)`, add:
00403| 
00404| ```typescript
00405| import { indexPaymentItem } from "../lib/search-indexer";
00406| 
00407| // After item creation:
00408| indexPaymentItem({
00409|   id: paymentItem.id,
00410|   schoolId: input.schoolId,
00411|   title: input.title,
00412|   description: input.description,
00413|   category: input.category,
00414|   createdAt: new Date(),
00415|   childIds: targetChildIds,
00416| }).catch(() => {});
00417| ```
00418| 
00419| **Step 3: Run tests**
00420| 
00421| Run: `pnpm --filter @schoolconnect/api test`
00422| Expected: All pass
00423| 
00424| **Step 4: Commit**
00425| ```bash
00426| git add apps/api/src/router/calendar.ts apps/api/src/router/payments.ts
00427| git commit -m "feat(search): index events and payment items on creation"
00428| ```
00429| 
00430| ---
00431| 
00432| ### Task 5: Search Web UI
00433| 
00434| **Files:**
00435| - Create: `apps/web/src/components/search/search-bar.tsx`
00436| - Modify: `apps/web/src/app/dashboard/layout.tsx`
00437| 
00438| **Step 1: Create search-bar.tsx**
00439| 
00440| ```typescript
00441| "use client";
00442| 
00443| import { trpc } from "@/lib/trpc";
00444| import { useState } from "react";
00445| 
00446| export function SearchBar() {
00447|   const [query, setQuery] = useState("");
00448|   const [isOpen, setIsOpen] = useState(false);
00449| 
00450|   const { data: results, isLoading } = trpc.search.query.useQuery(
00451|     { query },
00452|     { enabled: query.length >= 2 },
00453|   );
00454| 
00455|   const typeLabels: Record<string, string> = {
00456|     messages: "Message",
00457|     events: "Event",
00458|     payment_items: "Payment",
00459|   };
00460| 
00461|   return (
00462|     <div className="relative">
00463|       <input
00464|         type="text"
00465|         placeholder="Search messages, events, payments..."
00466|         value={query}
00467|         onChange={(e) => {
00468|           setQuery(e.target.value);
00469|           setIsOpen(true);
00470|         }}
00471|         onFocus={() => query.length >= 2 && setIsOpen(true)}
00472|         onBlur={() => setTimeout(() => setIsOpen(false), 200)}
00473|         className="w-64 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
00474|       />
00475| 
00476|       {isOpen && query.length >= 2 && (
00477|         <div className="absolute top-full mt-1 w-96 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
00478|           {isLoading && <p className="p-3 text-sm text-gray-500">Searching...</p>}
00479|           {results && results.length === 0 && (
00480|             <p className="p-3 text-sm text-gray-500">No results found.</p>
00481|           )}
00482|           {results?.map((r: any) => (
00483|             <div key={r.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer">
00484|               <div className="flex items-center gap-2">
00485|                 <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
00486|                   {typeLabels[r.type] || r.type}
00487|                 </span>
00488|                 <span className="text-sm font-medium">{r.title}</span>
00489|               </div>
00490|               {r.highlight?.body?.[0] && (
00491|                 <p
00492|                   className="text-xs text-gray-500 mt-1"
00493|                   dangerouslySetInnerHTML={{ __html: r.highlight.body[0] }}
00494|                 />
00495|               )}
00496|             </div>
00497|           ))}
00498|         </div>
00499|       )}
00500|     </div>
00501|   );
00502| }
00503| ```
00504| 
00505| **Step 2: Add SearchBar to dashboard layout**
00506| 
00507| In `apps/web/src/app/dashboard/layout.tsx`, import and add `<SearchBar />` in the nav bar between the nav links and the user name display.
00508| 
00509| **Step 3: Commit**
00510| ```bash
00511| git add apps/web/src/components/search/search-bar.tsx apps/web/src/app/dashboard/layout.tsx
00512| git commit -m "feat(search): add search bar to web dashboard"
00513| ```
00514| 
00515| ---
00516| 
00517| ### Task 6: Search Mobile UI
00518| 
00519| **Files:**
00520| - Create: `apps/mobile/src/screens/SearchScreen.tsx`
00521| - Modify: `apps/mobile/App.tsx`
00522| 
00523| **Step 1: Create SearchScreen.tsx**
00524| 
00525| - TextInput for search query.
00526| - FlatList of results from `trpc.search.query.useQuery`.
00527| - Debounce input (300ms) before querying.
00528| - Show type badge (Message/Event/Payment) per result.
00529| 
00530| **Step 2: Add as a tab or header button in App.tsx**
00531| 
00532| Add a search icon in the header that navigates to SearchScreen (stack screen, not tab — keeps bottom tabs clean).
00533| 
00534| **Step 3: Commit**
00535| ```bash
00536| git add apps/mobile/src/screens/SearchScreen.tsx apps/mobile/App.tsx
00537| git commit -m "feat(search): add mobile search screen"
00538| ```
00539| 
00540| ---
00541| 
00542| ### Task 7: Document Content Search (OCR)
00543| 
00544| **Files:**
00545| - Create: `apps/api/src/services/ocr.ts`
00546| - Modify: `apps/api/src/lib/search-indexer.ts`
00547| 
00548| **Step 1: Implement OCR Service**
00549| 
00550| ```typescript
00551| import pdf from "pdf-parse";
00552| import { createWorker } from "tesseract.js";
00553| 
00554| export async function extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
00555|   if (mimeType === "application/pdf") {
00556|     const data = await pdf(fileBuffer);
00557|     return data.text;
00558|   } else if (mimeType.startsWith("image/")) {
00559|     const worker = await createWorker("eng");
00560|     const { data: { text } } = await worker.recognize(fileBuffer);
00561|     await worker.terminate();
00562|     return text;
00563|   }
00564|   return "";
00565| }
00566| ```
00567| 
00568| **Step 2: Integrate with Indexer**
00569| 
00570| Modify `indexMessage` to accept file attachments, run OCR, and append to `body` field in Elasticsearch.
00571| 
00572| **Step 3: Commit**
00573| ```bash
00574| git add apps/api/src/services/ocr.ts apps/api/src/lib/search-indexer.ts
00575| git commit -m "feat(search): add ocr text extraction for attachments"
00576| ```
00577| 
