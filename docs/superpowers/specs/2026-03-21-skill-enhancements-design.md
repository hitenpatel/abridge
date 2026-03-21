# Skill Enhancements: sprint-work, po-ba-analyst, project-docs

**Date:** 2026-03-21
**Status:** Approved (rev 2 — post spec review)
**Scope:** 14 enhancements across 3 skills + cross-skill integration

## Design Principles

These skills are **project-agnostic global skills**. They must work across any project — not just Abridge and Iron Pulse. All project-specific details (Plane project IDs, state IDs, git remotes, repo conventions) come from:
- `.plane-project` file in the repo root (4d)
- Project-level memory files (`~/.claude/projects/{project}/memory/`)
- The project's own CLAUDE.md

No project-specific values should be hardcoded in any skill's SKILL.md or reference files.

## Context

After real-world usage across multiple projects (120+ Plane tickets, 10+ sprints), several gaps emerged:

- Code shipped with type errors and missing tests (no pre-commit verification)
- Tickets closed without checking all acceptance criteria
- Documentation drifted silently after code changes
- Sprint planning used fixed velocity caps instead of actual throughput data
- Three skills duplicated Plane API logic independently
- Sprint retrospectives didn't exist — learnings were lost between sessions

## 1. sprint-work Enhancements

### 1a. Pre-commit verification (Step 4d)

After implementation, before committing:
1. Run the project's lint command (detect from `package.json` scripts — `lint`, `check`, or `biome check`) on staged files
2. Run type-check: detect the build system from the project root (`package.json` scripts). Use `pnpm build` if available (lets Turborepo/build tooling handle tsconfig resolution), or fall back to `tsc --noEmit` on the relevant app
3. If a unit test file exists alongside the changed file (e.g., `payments.ts` → `__tests__/payments.test.ts`), run it

If anything fails, fix the issue before committing. Never commit code that fails lint or type-check.

**Detecting which app changed:** Map staged file paths to workspace packages:
- `apps/api/**` → API package
- `apps/web/**` → web package
- `apps/mobile/**` → mobile package
- `packages/**` → shared package (type-check all consumers)
- Root-level config → full build

**Insert between:** Step 4c (Sync documentation) and Step 5 (Commit)

### 1b. Acceptance criteria verification (Step 4e)

Before committing, parse the ticket's acceptance criteria from `description_html` and present a checklist.

**Handling different AC formats:**
- **Structured checklist** (`<ul><li>` items under an "Acceptance Criteria" heading) — parse directly
- **Prose/bullets without heading** — extract implied criteria from bullet points in the description
- **No AC at all** — extract testable claims from the description and implementation notes. Flag: "No explicit AC found — inferred these criteria from the description. Correct?"
- **Ambiguous criteria** — flag to user: "This criterion is unclear — can you verify: [criterion]?"

If any criterion is not met, flag it and go back to implementation. Do not close incomplete tickets.

**Insert between:** Step 4d (Pre-commit verification) and Step 5 (Commit)

### 1c. Complexity estimate in ticket list

When presenting Todo items in Step 1, add estimated complexity derived from implementation notes:

- **S:** 1-2 files, single layer (API or web), no schema change
- **M:** 3-4 files, crosses layers, or includes schema change
- **L:** 5+ files, new dependencies, infrastructure changes, or migration needed

If implementation notes are absent or sparse, estimate from title keywords and ticket category, and mark as "estimated — verify before starting."

### 1d. Sprint retrospective with learning loop

**Trigger:** When all code tickets in a cycle are Done. Non-code tickets (SETUP, audit) that remain open do NOT block the retro — they are noted as carried over.

**What happened:**
- Code tickets completed vs planned
- Carried-over items and why (human action needed? too complex? dependency blocked?)
- Rework events (tickets that needed follow-up fixes after initial commit)

**What to learn:**
- Complexity estimation accuracy (S/M/L vs actual)
- Ticket types that were consistently under/over-estimated
- Patterns that worked well
- Checks that were missed (tests, docs, types)

**How to carry forward:**
- Save to `~/.claude/projects/{project}/memory/feedback_sprint_learnings.md`
- File structure: see Section 4b
- sprint-work reads this file at the start of each ticket and applies relevant rules
- po-ba-analyst reads it when planning future sprints

**Pruning rules:** After adding Sprint N data, if more than 5 sprint entries exist in the Velocity section, remove the oldest. Rules in Estimation/Pre-commit/Doc sections are only removed if explicitly contradicted by newer data or flagged as no longer relevant by the user.

**Post retro as a Plane comment** on the completed cycle. If Plane is unreachable, save locally and note: "Retro saved to learnings file but could not post to Plane — will retry next session."

## 2. po-ba-analyst Enhancements

### 2a. Throughput-based velocity tracking

Drop story points as the velocity metric. Track instead:
- **Tickets per session** — how many code tickets completed
- **Complexity accuracy** — how often S/M/L matched actual effort
- **Rework rate** — % of tickets needing follow-up fixes
- **Carry-over pattern** — which ticket types consistently carry over

**Sprint capacity calculation:** Rolling average of code tickets completed per session from the learnings file. Default to 10 if no history. Adjust for complexity mix: a sprint heavy on L tickets should plan fewer total tickets.

`estimate_point` is still assigned to Plane work items for display/sorting (S=1, M=3, L=5, XL=8) but is NOT used for velocity calculation.

Store in sprint learnings memory. The existing fixed "velocity cap: 20-25 points" in Step 10 is replaced with: "Sprint capacity = rolling average from learnings file, defaulting to 10 code tickets."

### 2b. Dependency detection in sprint planning

**When it runs:** During sprint planning, after stories are written but before they are synced to Plane. For continuation workflows, scan both new stories and existing Plane tickets in Backlog.

Scan implementation notes for cross-references:
- File path overlap: if story A and B both modify the schema, schedule A first if B references A's model
- Env var dependencies: if a story needs an env var from a SETUP ticket, the SETUP must come first
- Explicit references: if implementation notes say "depends on X", respect it

Present detected dependencies as warnings, not hard blocks. User confirms.

### 2c. Risk scoring on stories

Auto-tag stories based on what they touch:

| Area | Risk | Rationale |
|------|------|-----------|
| Auth, encryption, session management | High | Security-sensitive |
| Payments, financial transactions | High | Financial data |
| User data, GDPR, deletion | High | Regulatory |
| Schema migrations, data transforms | Medium | Data integrity |
| New API procedures, middleware | Medium | Authorization surface |
| CI/CD, Docker, deployment | Medium | Infrastructure stability |
| UI components, styling | Low | Reversible, no data risk |
| Documentation, config | Low | Non-functional |

This table is the default. The learnings file can extend it (e.g., if retro reveals "notification changes cause regressions", add "Notifications: Medium risk").

Schedule high-risk stories early in the sprint, not as the last item before the testing gate.

### 2d. Framework-aware gap detection

During Step 6 (identify gaps), optionally cross-reference against standard checklists:
- **OWASP Top 10** — injection, broken auth, XSS, SSRF, etc.
- **WCAG 2.1 AA** — keyboard nav, contrast, screen readers, touch targets
- **Industry-specific** — for education apps: ICO Children's Code; for health apps: HIPAA; etc.

Opt-in: ask "Check against security/accessibility frameworks?" before running. Uses model's training knowledge — no stored checklists needed for common frameworks. For niche regulations (ICO Children's Code), note findings as "suspected — verify with specialist" rather than definitive.

## 3. project-docs Enhancements

### 3a. Auto-diff doc detection

Replace the manual 8-point checklist with automated detection:

1. Determine diff scope:
   - **Per-ticket** (invoked from sprint-work Step 4c): `git diff --name-only --cached` on staged files (before commit), or `git diff HEAD~N` where N = number of commits since the ticket was picked up. If uncertain, use `git log --oneline --since="1 hour ago" --name-only` as a practical approximation.
   - **Per-sprint** (invoked from sprint completion handoff 4c): `git log --name-only --since={sprint_start_date}` or diff against the last doc-verified commit from the freshness tracker
2. Map changed files to affected docs using generic patterns:

| Changed file pattern | Affected doc |
|---------------------|-------------|
| `**/schema.prisma` or `**/models/**` | AGENTS.md (models list) |
| `**/router/**` or `**/routes/**` (new file) | AGENTS.md (procedures/endpoints), API.md |
| `.github/workflows/*` or CI config | INFRASTRUCTURE.md |
| `docker-compose*` or `Dockerfile*` | INFRASTRUCTURE.md |
| `.env*` or new `process.env.` in code | AGENTS.md (env vars table) |
| New page/screen files | CLAUDE.md (key files) |

These patterns are generic — they work for any project structure, not just monorepos with `apps/api`.

3. Present only affected docs. Skip entirely if nothing is affected.

### 3b. Changelog generation

On-demand or after sprint completion, scan commits and generate CHANGELOG entries:

| Commit prefix | Changelog section |
|--------------|-------------------|
| `feat:` | Added |
| `fix:` | Fixed |
| `perf:` | Performance |
| `security:` or encryption/auth changes | Security |
| `ci:`, `chore:`, `docs:` | Omitted (unless user-visible) |
| No prefix | Listed under "Other" |

Write to `CHANGELOG.md` in the project root. If the file doesn't exist, create it with a header.

### 3c. Freshness scoring

Location: `~/.claude/projects/{project}/memory/feedback_doc_freshness.md` (project-specific).

Structure:
```markdown
---
name: Doc freshness tracker
description: Tracks when project docs were last verified against codebase
type: reference
---

| Doc | Last verified | Status |
|-----|--------------|--------|
| AGENTS.md | 2026-03-21 | Fresh |
| API.md | 2026-03-10 | Check (11 days) |
```

When project-docs is invoked for any reason, check the table. If anything is >14 days since last verification, nudge: "API.md hasn't been verified in 11 days — want me to check it?"

Reset timestamp when a doc is verified or updated.

### 3d. Page templates for all types

Add HTML templates to `references/plane-pages.md` for each page type. The existing Setup guide template is kept. Add:

**Runbook:**
```html
<h2>Runbook: [Procedure]</h2>
<p><strong>When to use:</strong> [trigger condition]</p>
<p><strong>Who can run:</strong> [role/access needed]</p>
<h3>Steps</h3><ol>...</ol>
<h3>Rollback</h3><ol>...</ol>
<h3>Verification</h3><ul>...</ul>
<h3>Contacts</h3><ul>...</ul>
```

**Architecture:**
```html
<h2>Architecture: [Area]</h2>
<p><strong>Purpose:</strong> [what this covers]</p>
<h3>Components</h3><ul>...</ul>
<h3>Data Flow</h3><p>...</p>
<h3>Design Decisions</h3><ul><li><strong>Decision:</strong> ... <strong>Why:</strong> ...</li></ul>
<h3>Trade-offs</h3><ul>...</ul>
```

**Audit guide** (supplements existing Guide template):
```html
<h2>Guide: [Audit Type]</h2>
<p><strong>Scope:</strong> [what's being audited]</p>
<h3>Automated Steps</h3><ol>...</ol>
<h3>Manual Steps</h3><ol>...</ol>
<h3>Known Issues</h3><ul>...</ul>
<h3>Deliverables</h3><ul>...</ul>
```

## 4. Cross-skill Integration

### 4a. Shared Plane API reference

Create `~/.claude/skills/shared/plane-api.md` containing ONLY generic API mechanics:
- Generic endpoint paths (work-items, cycles, labels, comments, pages)
- API field gotchas (state vs state_id, labels array, etc.)
- Pages API workflow (internal API, session auth sequence)
- Payload examples and mappings (priority, effort)

**Three-tier config model:**

| Level | What | Where | Example |
|-------|------|-------|---------|
| **Instance** (Plane deployment) | API key, SSH host, workspace slug, admin email | `~/.claude/plane.json` (user-global, not in any repo) | `{"apiKey": "plane_api_...", "host": "projects.example.com", "sshConnection": "default", "adminEmail": "user@example.com"}` |
| **Project** (per-repo) | Project ID, state IDs, identifier prefix, git remote | `.plane-project` in repo root (committed) | See 4d |
| **Shared reference** (API mechanics) | Endpoints, payloads, gotchas | `~/.claude/skills/shared/plane-api.md` | Generic, no credentials or IDs |

Instance-level config (`~/.claude/plane.json`) is **user-specific** — it contains the API key and SSH connection details for the user's Plane deployment. This is NOT committed to any repo. Skills read it to authenticate, then read `.plane-project` for project-specific IDs.

**Project-specific data** (project IDs, state IDs, git remotes) lives in `.plane-project` (4d), NOT in the shared file or instance config.

**How skills reference it:** Each SKILL.md says `Read ~/.claude/skills/shared/plane-api.md for Plane API details.` This is an absolute path, not a relative reference. Skills use the Read tool to load it when needed.

**What happens to existing per-skill references:**
- `po-ba-analyst/references/plane-api.md` → deleted, replaced by shared file
- `sprint-work/references/plane-api.md` → deleted, replaced by shared file
- `project-docs/references/plane-pages.md` → **kept** as a separate file for page-specific templates and naming conventions (the Pages API uses different auth and endpoints from the main API, so keeping them separate is clearer)

### 4b. Sprint learnings memory file

Location: `~/.claude/projects/{project}/memory/feedback_sprint_learnings.md`

```markdown
---
name: Sprint learnings for {project}
description: Rolling retrospective learnings — estimation patterns, rework triggers, workflow rules. Read by sprint-work and po-ba-analyst.
type: feedback
---

## Estimation Rules
- [learned rule]: [why]

## Pre-commit Rules
- [learned rule]: [why]

## Doc Rules
- [learned rule]: [why]

## Carry-over Patterns
- [pattern]: [action]

## Risk Overrides
- [area]: [revised risk level]: [why]

## Velocity (last 5 sprints)
- Sprint N: X code tickets, Y carried over (reason)
- Average: ~Z code tickets/session
```

**Writers:** sprint-work (retro, Step 1d) and po-ba-analyst (planning calibration).
**Readers:** sprint-work (ticket start — check for applicable rules), po-ba-analyst (sprint planning — velocity + estimation), project-docs (doc rules section — which docs need attention).

**Defensive parsing:** Skills should handle missing sections gracefully — add them if absent rather than failing. The file format may grow over time.

**Max size guideline:** Keep under 200 lines. If sections grow beyond this, prune older velocity data and consolidate rules that overlap.

### 4c. Sprint completion handoff

When sprint-work detects that all **code tickets** in a cycle are Done (non-code SETUP/audit tickets remaining do NOT block this):

1. **Retro** — generate retrospective per 1d, save learnings, post to Plane cycle
2. **Doc sync** — follow the project-docs "Doc Sync Check" workflow using sprint-scoped diff (not just last commit)
3. **Changelog** — follow project-docs changelog generation for commits since last changelog entry
4. **Summary** — present to user: "Sprint X complete. Retro saved. Changelog updated. N docs flagged. Ready for next sprint?"

**This is a sequential instruction set, not an automated pipeline.** Each step is a prompt instruction that the model follows in order. If context limits are a concern, the model should complete the retro + learnings first, then address docs in a follow-up if needed.

**Plane error handling:** If Plane is unreachable for any step (retro comment, doc page update), save the content locally and note it. Don't fail the entire handoff because of a network issue.

### 4d. Project detection via `.plane-project`

Add a `.plane-project` file to each repo root:

```json
{
  "projectId": "uuid-here",
  "identifier": "PROJECT_PREFIX",
  "workspace": "workspace-slug",
  "states": {
    "backlog": "uuid",
    "todo": "uuid",
    "in_progress": "uuid",
    "done": "uuid",
    "cancelled": "uuid"
  },
  "gitRemote": "https://git.example.com/org/repo"
}
```

**This file should be committed to the repo** — it's not secret (just UUIDs and URLs) and enables any developer or agent to interact with Plane without skill configuration.

All three skills check for this file first via `Read .plane-project` from the project root. **If the file is not present, Plane integration is unavailable** — skills degrade gracefully by skipping Plane operations (no state changes, no comments, no cycle management) and warn: "No .plane-project found — Plane integration disabled for this project."

**New project onboarding:** Two steps to enable full skill support:
1. Create `~/.claude/plane.json` (once per user, if not already present)
2. Create `.plane-project` in the repo root (once per project)

## Implementation Order

Recommended sequence (highest impact first):

1. **4a + 4d** — Shared reference + project detection (foundation — unblocks project-agnostic operation)
2. **1a** — Pre-commit verification (biggest quality win — catches type errors and lint before commit)
3. **1b** — Acceptance criteria verification (prevents premature ticket closure)
4. **3a** — Auto-diff doc detection (biggest workflow win for project-docs)
5. **1d + 4b** — Sprint retro + learnings memory (enables the feedback loop)
6. **2a** — Throughput-based velocity (uses data from 1d)
7. **3b + 3c** — Changelog + freshness scoring
8. **4c** — Sprint completion handoff (ties everything together — depends on 1d, 3a, 3b)
9. **1c + 2b + 2c** — Complexity estimates, dependency detection, risk scoring
10. **2d + 3d** — Framework gap detection + page templates (lowest priority, additive)

## Appendix: Review Issues Addressed

| Issue | Resolution |
|-------|-----------|
| C1: Shared path resolution | 4a now uses absolute path, keeps plane-pages.md separate |
| C2: Cross-skill invocation | 4c clarified as sequential instructions, not automated pipeline |
| C3: Missing AC fallback | 1b now handles prose, missing AC, and ambiguous criteria |
| I1: tsconfig detection | 1a now uses project's build command, maps all workspace packages |
| I2: Prune semantics | 1d defines explicit prune rules for learnings file |
| I3: Velocity contradiction | 2a explicitly replaces fixed point cap with ticket-count capacity |
| I4: Dependency timing | 2b clarifies it runs on generated stories before Plane sync |
| I5: git diff scope | 3a uses sprint-scoped diff for sprint-level, staged/recent for per-ticket |
| I6: Freshness location | 3c specifies project-specific memory file path |
| Project-agnostic | Design Principles section + 4a/4d ensure no project-specific hardcoding |
| R2-1: Instance vs project config | 4a now defines three-tier model: instance (~/.claude/plane.json), project (.plane-project), shared (API mechanics) |
| R2-2: Fallback clause | 4d now degrades gracefully without .plane-project instead of impossible fallback |
| R2-3: Multi-commit diff | 3a now handles staged files or recent commit window instead of only HEAD~1 |
