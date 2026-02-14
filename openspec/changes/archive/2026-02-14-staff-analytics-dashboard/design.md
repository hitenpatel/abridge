## Context

Staff currently see raw records (individual attendance marks, individual payments, individual messages) but have no aggregated view. All the data needed for analytics already exists in PostgreSQL via Prisma — it just needs to be queried and presented.

The app uses tRPC with `schoolStaffProcedure` middleware for staff-only endpoints and Next.js App Router for the web dashboard. The existing dashboard sidebar handles navigation and role-based visibility.

## Goals / Non-Goals

**Goals:**
- Provide staff with a single page showing key metrics across attendance, payments, forms, and messages
- Support date range filtering for both live snapshots and historical trends
- Query existing tables directly — no schema changes or data duplication
- Ship a read-only view that can later support actionable insights

**Non-Goals:**
- Actionable buttons (resend, remind) — future enhancement
- Export/download (PDF, CSV) — future enhancement
- Mobile analytics screen — web only for now
- Real-time updates (WebSocket) — standard request/response is sufficient
- Redis caching — not needed at single-school scale, add later if performance requires it
- Class-specific teacher filtering — Admin-level whole-school view first

## Decisions

### 1. Query-on-demand vs materialized stats tables

**Decision**: Query-on-demand from existing tables.

**Rationale**: SchoolConnect operates at single-school scale (hundreds of students, not millions). Prisma `groupBy`, `count`, and `aggregate` queries against indexed columns will return in milliseconds. Materialized tables add schema complexity, staleness risk, and sync bugs for no benefit at this scale. If performance becomes an issue, Redis caching can be layered on without changing the API contract.

**Alternatives considered**:
- Materialized stats tables — rejected, unnecessary complexity
- External analytics service (PostHog/Mixpanel) — rejected, data leaves system, less control over domain-specific metrics

### 2. Four separate procedures vs one combined procedure

**Decision**: Four separate procedures (`analytics.attendance`, `analytics.payments`, `analytics.forms`, `analytics.messages`).

**Rationale**: Independent loading. Each card on the dashboard fetches its own data in parallel. If one query is slow, the other three cards still render immediately with skeleton loading. A combined procedure would block all four cards until the slowest query completes.

### 3. Sparkline rendering

**Decision**: Inline SVG polyline, no chart library.

**Rationale**: Sparklines are simple trend indicators — a polyline path drawn from an array of data points. Adding a chart library (Recharts, Chart.js) for this would be overkill. The SVG approach is ~20 lines of code, zero dependencies, and renders instantly.

### 4. Detail view as accordion vs separate pages

**Decision**: Inline accordion expansion below each card.

**Rationale**: Staff want to glance at the summary and optionally drill into detail without losing context. Separate pages would require back-navigation and lose the at-a-glance overview. Accordion keeps everything on one page.

### 5. "This Term" date range calculation

**Decision**: Derive term start from the most recent past `Event` with category `TERM_DATE` in the school's calendar.

**Rationale**: Schools already create term date events via the calendar feature. Reusing this data avoids a separate term configuration system. If no term date event exists, fall back to the start of the current academic year (September 1st).

## Risks / Trade-offs

**[Slow queries at scale]** → Queries are bounded by date range and school scope. Worst case is "This Term" across a large school (~500 children × 200 days = 100k attendance records). Prisma `groupBy` on indexed `schoolId` + `date` columns handles this comfortably. Add Redis caching if needed.

**[No term date event exists]** → Fall back to September 1st of the current academic year. This is a reasonable default for UK schools.

**[Attendance percentage calculation edge cases]** → Children with `NOT_REQUIRED` marks should be excluded from the denominator, not counted as absent. The query must filter these out.

**[Payment amounts display]** → Amounts stored in pence must be converted to pounds for display (divide by 100). This is a display concern only — the API returns pence.
