## Context

Abridge has 5 parent-facing features (Messaging, Payments, Attendance, Calendar, Forms) that are always enabled for every school. The School model has basic info and notification defaults but no feature configuration. The existing `schoolStaffProcedure` and `schoolAdminProcedure` middleware verify staff membership but don't load any School data — they only query the `StaffMember` table (with Redis caching).

## Goals / Non-Goals

**Goals:**
- School admins can enable/disable each of the 5 features independently
- Payment sub-toggles let admins control which payment categories (dinner money, trips, clubs, uniform, other) are available
- Disabled features are blocked at the API level and hidden in the UI
- Existing data is preserved when a feature is disabled

**Non-Goals:**
- Platform-level feature control (super-admin overrides)
- Per-user feature permissions (all staff see the same enabled features)
- Sub-toggles for features other than Payments
- Audit logging of toggle changes
- Granular permission within a feature (e.g. "can view but not create")

## Decisions

### 1. Boolean columns on School model (over join table or JSON)

Add 10 boolean columns directly to the `School` model. All default to `true`.

**Why**: The School model already uses this pattern for notification defaults (`defaultNotifyByPush`, etc.). Five master toggles + five payment sub-toggles is a fixed, small set. Booleans are type-safe, queryable, and require no joins. Adding a future 6th feature toggle is just one migration — which you'd need anyway for the feature itself.

**Rejected alternatives**:
- Join table (`SchoolFeature` model): Adds query complexity, initialization logic, and a join for every request — overkill for 10 booleans
- JSON field: Loses Prisma type safety, can't query/filter by individual toggles, requires application-level validation

### 2. Load toggles in a new middleware layer (over loading in each router)

Create a `schoolFeatureProcedure` that extends `schoolStaffProcedure` and adds a single `prisma.school.findUnique` call to load the 10 toggle fields into `ctx.schoolFeatures`. Feature routers use this procedure instead of `schoolStaffProcedure` directly.

**Why**: Centralizes the query. Each feature router just calls a guard helper — no need to repeat the school lookup. The school query selects only the 10 boolean fields so it's lightweight.

**Trade-off**: One extra DB query per school-scoped request. This is a single indexed primary key lookup selecting 10 booleans — negligible overhead. Could be cached in Redis alongside staff membership in future if needed.

### 3. Guard helper function (over middleware-level blocking)

A helper `assertFeatureEnabled(ctx, 'payments')` that throws `TRPCError({ code: 'FORBIDDEN' })`. Called explicitly at the top of each feature router's procedures.

**Why**: Explicit is better than implicit. Each router clearly declares its feature dependency. This also supports the payment sub-toggle pattern where `payments.ts` needs to check both the master toggle and category-specific toggle on create operations.

**Rejected alternative**: A middleware that auto-maps router names to features. Too magical, fragile if routers are renamed, and doesn't handle the payment sub-toggle case.

### 4. Payment sub-toggle checked only on create (over blocking all reads)

When the Payments master toggle is ON but a specific category is OFF:
- Creating a PaymentItem with that category is blocked
- Existing PaymentItems of that category remain visible and payable

**Why**: Parents shouldn't lose access to payments they've already been assigned just because the school turned off a category. The sub-toggle controls what staff can *create going forward*, not historical data.

### 5. Web navigation filtering via React context (over per-page checks)

Fetch feature toggles once in the dashboard layout and provide via React context. Nav items and route guards consume from context.

**Why**: Single fetch point, no waterfall of toggle checks. The layout already wraps all dashboard pages. Disabled feature pages check context and render a "Feature not enabled" message rather than redirecting (preserves URL for when the feature gets re-enabled).

## Risks / Trade-offs

- **10 columns is rigid**: Adding a new toggleable feature requires a migration. → This is acceptable since adding any new feature already requires migrations for its own models.
- **No caching of school toggles**: Each school-scoped request adds one PK lookup. → Negligible for current scale. Can add Redis caching alongside staff membership if needed later.
- **Mobile and web must stay in sync**: Both need to hide the same features. → Feature toggle context is fetched from the same API endpoint, ensuring consistency.
- **Existing payment items remain visible when category disabled**: Could confuse admins who expect them to disappear. → Document this behavior clearly in the UI with a note like "Existing items are unaffected."
