# Skill Enhancements: sprint-work, po-ba-analyst, project-docs

**Date:** 2026-03-21
**Status:** Approved
**Scope:** 14 enhancements across 3 skills + cross-skill integration

## Context

After intensive real-world usage across the Abridge and Iron Pulse projects (120+ Plane tickets, 10+ sprints), several gaps emerged:

- Code shipped with type errors and missing tests (no pre-commit verification)
- Tickets closed without checking all acceptance criteria
- Documentation drifted silently after code changes
- Sprint planning used fixed velocity caps instead of actual throughput data
- Three skills duplicated Plane API logic independently
- Sprint retrospectives didn't exist — learnings were lost between sessions

This spec addresses all gaps with 14 targeted enhancements.

## 1. sprint-work Enhancements

### 1a. Pre-commit verification (Step 4d)

After implementation, before committing:
1. Run `biome check` on staged files
2. Run `tsc --noEmit` on the relevant app (detect from file paths: `apps/api/` → API tsconfig, `apps/web/` → web tsconfig)
3. If any unit test file exists alongside the changed file (e.g., `payments.ts` → `__tests__/payments.test.ts`), run it

If anything fails, fix the issue before committing. Never commit code that fails lint or type-check.

**Insert between:** Step 4c (Sync documentation) and Step 5 (Commit)

### 1b. Acceptance criteria verification (Step 4e)

Before committing, parse the ticket's acceptance criteria from `description_html` and present a checklist:

```
Acceptance criteria check for ABRIDGE-72:
- [x] New ClubsScreen.tsx in mobile app
- [x] List available clubs with details (day, time, capacity, fee)
- [x] Enroll/unenroll actions
- [x] Show enrollment status per child
- [x] Add to navigation (feature-gated)
All criteria met. Proceeding to commit.
```

If any criterion is not met, flag it and go back to implementation. Do not close incomplete tickets.

**Insert between:** Step 4d (Pre-commit verification) and Step 5 (Commit)

### 1c. Complexity estimate in ticket list

When presenting Todo items in Step 1, add estimated complexity:

```
| # | ID | Title | Priority | Complexity |
|---|-----|-------|----------|------------|
| 1 | ABRIDGE-116 | Payment receipt email | high | S (1 file, API-only) |
| 2 | ABRIDGE-115 | Instalment payment UI | medium | M (3 files, full-stack) |
| 3 | ABRIDGE-127 | Introduce job queue | medium | L (new dep, 5+ files, infra) |
```

Derive complexity from implementation notes:
- **S:** 1-2 files, single layer (API or web), no schema change
- **M:** 3-4 files, crosses layers, or includes schema change
- **L:** 5+ files, new dependencies, infrastructure changes, or migration needed

### 1d. Sprint retrospective with learning loop

When a sprint completes (all code tickets done), generate a retrospective:

**What happened:**
- Tickets completed vs planned
- Carried-over items and why
- Rework events (tickets that needed follow-up fixes)

**What to learn:**
- Complexity estimation accuracy (S/M/L vs actual)
- Ticket types that were consistently under/over-estimated
- Patterns that worked well
- Checks that were missed (tests, docs, types)

**How to carry forward:**
- Save learnings to `~/.claude/projects/{project}/memory/feedback_sprint_learnings.md`
- Concrete rules: "Mobile screen tickets should include navigation wiring — bump S to M", "Payment tickets must run Stripe mock tests before commit"
- sprint-work reads this file at the start of each ticket and applies relevant rules
- po-ba-analyst reads it when planning future sprints
- Rolling window: keep last 5 sprints, prune to actionable rules

**Post retro as a Plane comment** on the completed cycle for project history.

## 2. po-ba-analyst Enhancements

### 2a. Throughput-based velocity tracking

Drop story points as the velocity metric. Track instead:
- **Tickets per session** — how many completed before context limit
- **Complexity accuracy** — how often S/M/L matched actual effort
- **Rework rate** — % of tickets needing follow-up fixes
- **Carry-over pattern** — which ticket types consistently carry over (e.g., SETUP tickets always need human action)

Store in sprint learnings memory. Use rolling averages for planning:
- "Last 3 sprints completed 8-10 code tickets per session"
- "SETUP tickets always carry over — plan accordingly"
- "Debt/refactor tickets are under-estimated 30% of the time"

### 2b. Dependency detection in sprint planning

When assigning stories to sprints, scan implementation notes for cross-references:
- File path overlap: if story A and B both modify `schema.prisma`, schedule A first if B references A's model
- Env var dependencies: if a story needs an env var from a SETUP ticket, the SETUP must come first
- Explicit references: if implementation notes say "depends on X", respect it

Present detected dependencies as warnings, not hard blocks. User confirms.

### 2c. Risk scoring on stories

Auto-tag stories based on what they touch:

| Area | Risk | Rationale |
|------|------|-----------|
| Auth, encryption, session management | High | Security-sensitive |
| Payments, Stripe, refunds | High | Financial data |
| Child data, GDPR, deletion | High | Regulatory |
| Schema migrations, data transforms | Medium | Data integrity |
| New API procedures, middleware | Medium | Authorization surface |
| CI/CD, Docker, deployment | Medium | Infrastructure stability |
| UI components, styling | Low | Reversible, no data risk |
| Documentation, config | Low | Non-functional |

Show in sprint plan. Schedule high-risk stories early in the sprint, not as the last item before the testing gate.

### 2d. Framework-aware gap detection

During Step 6 (identify gaps), optionally cross-reference against:
- **OWASP Top 10** — injection, broken auth, XSS, SSRF, etc.
- **WCAG 2.1 AA** — keyboard nav, contrast, screen readers, touch targets
- **ICO Children's Code** — age-appropriate design, data minimisation, transparency

Opt-in: ask "Check against OWASP/WCAG/ICO frameworks?" before running. Not a full audit — a quick flag of obvious misses that become stories.

## 3. project-docs Enhancements

### 3a. Auto-diff doc detection

Replace the manual 8-point checklist with automated detection:

1. Run `git diff HEAD~1 --name-only` to get changed files
2. Map files to affected docs:

| Changed file pattern | Affected doc |
|---------------------|-------------|
| `schema.prisma` | AGENTS.md (models list) |
| `apps/api/src/router/*.ts` (new) | AGENTS.md (procedures), API.md |
| `.github/workflows/*` | INFRASTRUCTURE.md |
| `docker-compose*` | INFRASTRUCTURE.md |
| `.env*` or new env var in code | AGENTS.md (env vars table) |
| `apps/web/src/app/dashboard/*/page.tsx` (new) | CLAUDE.md (key files) |
| `packages/db/prisma/schema.prisma` (new model) | AGENTS.md, seed data check |

3. Present only affected docs: "Based on your changes, these docs may need updating: [list]"
4. Skip entirely if no docs are affected

### 3b. Changelog generation

On-demand or after sprint completion, scan commits and generate:

```markdown
## [2026-03-21]

### Added
- In-app notification centre with bell icon and dropdown [ABRIDGE-114]
- Payment receipt email after Stripe checkout [ABRIDGE-116]
- Staff daily task summary on dashboard [ABRIDGE-117]
- Instalment payment configuration [ABRIDGE-115]
- Image optimization pipeline with Sharp [ABRIDGE-121]

### Fixed
- Removed ignoreBuildErrors, fixed surfaced type errors [ABRIDGE-112]

### Security
- MIS credentials encrypted at rest with AES-256-GCM [ABRIDGE-111]
- PDF form data migrated to S3 object storage [ABRIDGE-113]
```

Derived from `git log` using conventional commit prefixes (`feat:` → Added, `fix:` → Fixed, `ci:` → CI/CD). Write to `CHANGELOG.md`.

### 3c. Freshness scoring

Maintain a freshness tracker (in the skill's reference or in memory):

```
| Doc | Last verified | Days ago | Status |
|-----|--------------|----------|--------|
| AGENTS.md | 2026-03-21 | 0 | Fresh |
| API.md | 2026-03-10 | 11 | Check soon |
| INFRASTRUCTURE.md | 2026-02-28 | 21 | Stale |
```

When project-docs is invoked for any reason, check the table. If anything is >14 days stale, mention it as a nudge: "API.md hasn't been verified in 11 days — want me to check it?"

Reset timestamp when a doc is verified or updated.

### 3d. Page templates for all types

Add HTML templates to `references/plane-pages.md` for each page type:

**Runbook template:**
```html
<h2>Runbook: [Procedure]</h2>
<p><strong>When to use:</strong> [trigger condition]</p>
<p><strong>Who can run:</strong> [role/access needed]</p>
<h3>Steps</h3><ol>...</ol>
<h3>Rollback</h3><ol>...</ol>
<h3>Verification</h3><ul>...</ul>
<h3>Contacts</h3><ul>...</ul>
```

**Architecture template:**
```html
<h2>Architecture: [Area]</h2>
<p><strong>Purpose:</strong> [what this covers]</p>
<h3>Components</h3><ul>...</ul>
<h3>Data Flow</h3><p>...</p>
<h3>Design Decisions</h3><ul><li><strong>Decision:</strong> ... <strong>Why:</strong> ...</li></ul>
<h3>Trade-offs</h3><ul>...</ul>
```

## 4. Cross-skill Integration

### 4a. Shared Plane API reference

Create `~/.claude/skills/shared/plane-api.md` consolidating:
- Connection details, auth
- All project IDs and state IDs (Abridge + Iron Pulse)
- Work item, cycle, label, comment endpoints
- Pages API (internal, session auth)
- API field gotchas
- Git remote URL patterns

All three skills reference this single file. Update all SKILL.md files to point here.

### 4b. Sprint learnings memory file

Location: `~/.claude/projects/{project}/memory/feedback_sprint_learnings.md`

Structure:
```markdown
---
name: Sprint learnings
description: Rolling log of sprint retrospective learnings — estimation patterns, rework triggers, workflow rules
type: feedback
---

## Estimation Rules
- Mobile screen tickets: include navigation wiring, bump S→M
- Debt/refactor tickets: often under-estimated, plan buffer

## Pre-commit Rules
- Payment tickets: run Stripe mock tests
- Schema changes: always run db:generate before type-check

## Doc Rules
- New routers: always update AGENTS.md procedures list
- New env vars: always update AGENTS.md env vars table

## Carry-over Patterns
- SETUP tickets always carry over — don't count toward velocity
- Testing gate tickets: close last, after all code tickets

## Velocity (last 5 sprints)
- Sprint 6: 8 code tickets, 2 carried over (SETUP)
- Sprint 5: 12 tickets, 0 carried over
- Average: ~10 code tickets/session
```

Written by sprint-work (retro) and po-ba-analyst (planning). Read by all three skills.

### 4c. Sprint completion handoff

When sprint-work completes the last code ticket in a sprint:

1. **Retro** — generate retrospective, save learnings, post to Plane cycle
2. **Doc audit** — invoke project-docs for a targeted audit of docs affected during the sprint
3. **Changelog** — invoke project-docs to generate CHANGELOG entry for the sprint
4. **Summary** — present to user: "Sprint X complete. Retro saved. Changelog updated. 1 doc flagged stale. Ready for next sprint?"

This creates a clean **plan → implement → document → reflect** loop.

### 4d. Project detection via `.plane-project`

Add a `.plane-project` file to each repo root:

```json
{
  "projectId": "e228ecbc-4b4c-4f9d-8f7b-bf181913af6f",
  "identifier": "ABRIDGE",
  "workspace": "personal"
}
```

All three skills check for this file first. Falls back to directory name matching if not present. New projects need only this file — no skill updates required.

## Implementation Order

Recommended sequence (highest impact first):

1. **4a + 4d** — Shared reference + project detection (foundation for everything else)
2. **1a + 1b** — Pre-commit verification + acceptance criteria check (biggest quality win)
3. **3a** — Auto-diff doc detection (biggest workflow win for project-docs)
4. **1d + 4b** — Sprint retro + learnings memory (enables the feedback loop)
5. **2a** — Throughput-based velocity (uses data from 1d)
6. **3b + 3c** — Changelog + freshness scoring
7. **4c** — Sprint completion handoff (ties everything together)
8. **1c + 2b + 2c + 2d + 3d** — Remaining quality improvements
