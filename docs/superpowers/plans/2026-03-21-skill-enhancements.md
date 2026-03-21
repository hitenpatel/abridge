# Skill Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance sprint-work, po-ba-analyst, and project-docs skills with quality gates, learning loops, doc automation, and project-agnostic architecture.

**Architecture:** Three-tier config (instance → project → shared reference). Skills read project context from `.plane-project` at runtime. Learnings accumulate in project-scoped memory files. Skills delegate doc operations to project-docs.

**Tech Stack:** Markdown skill files, JSON config, Plane API via SSH MCP

**Spec:** `docs/superpowers/specs/2026-03-21-skill-enhancements-design.md`

---

## Chunk 1: Foundation (4a, 4d)

Establishes the project-agnostic architecture that all other enhancements depend on.

### Task 1: Create instance config file

**Files:**
- Create: `~/.claude/plane.json`

- [ ] **Step 1: Create the instance config**

```json
{
  "apiKey": "plane_api_f9c47db275bd4fc0ba3efb27e1dd47fc",
  "host": "projects.hiten-patel.co.uk",
  "sshConnection": "default",
  "adminEmail": "hitenpatel2010@gmail.com",
  "sshBaseUrl": "https://127.0.0.1:4333",
  "workspace": "personal"
}
```

- [ ] **Step 2: Verify** — Read the file back and confirm all fields are present.

### Task 2: Create `.plane-project` files for existing repos

**Files:**
- Create: `/Users/hitenpatel/dev/personal/abridge/.plane-project`
- Create: `/Users/hitenpatel/dev/personal/ironpulse/.plane-project`

- [ ] **Step 1: Create Abridge `.plane-project`**

```json
{
  "projectId": "e228ecbc-4b4c-4f9d-8f7b-bf181913af6f",
  "identifier": "ABRIDGE",
  "workspace": "personal",
  "states": {
    "backlog": "e3426606-848d-471b-993e-ae484047d57b",
    "todo": "0a1a14cd-e9b6-4b15-b368-95c9b88a096d",
    "in_progress": "bb8a1be0-a105-4783-b824-71877ced5b2b",
    "done": "6f1e8ef3-6d26-4c11-a07a-15337cc42f07",
    "cancelled": "d6c8a96b-83c7-4bb1-89be-fa186229d6a8"
  },
  "gitRemote": "https://git.hiten-patel.co.uk/hiten/abridge"
}
```

- [ ] **Step 2: Create Iron Pulse `.plane-project`**

```json
{
  "projectId": "23c0e881-4b24-4506-a2ba-969b70ce0cb3",
  "identifier": "IP",
  "workspace": "personal",
  "states": {
    "backlog": "041e9174-4eb2-4c8e-87ed-7b6a44045850",
    "todo": "f9984918-0a61-488f-89f3-883ad59cb8e2",
    "in_progress": "5d5980b2-0295-43cb-b7fe-d58f088df58e",
    "done": "f7b1bec3-d6df-43c2-ac64-ec2e9ace10bf",
    "cancelled": "3504667d-60d1-463a-9d42-c580d5499a92"
  },
  "gitRemote": "https://git.hiten-patel.co.uk/hiten/ironpulse"
}
```

- [ ] **Step 3: Commit both files** (one per repo)

### Task 3: Create shared Plane API reference

**Files:**
- Create: `~/.claude/skills/shared/plane-api.md`
- Delete: `~/.claude/skills/sprint-work/references/plane-api.md`
- Delete: `~/.claude/skills/po-ba-analyst/references/plane-api.md`

- [ ] **Step 1: Create `~/.claude/skills/shared/` directory**

- [ ] **Step 2: Write shared `plane-api.md`** with ONLY generic content:
  - How to read instance config (`~/.claude/plane.json`) and project config (`.plane-project`)
  - SSH MCP curl template using config values (not hardcoded)
  - All endpoint paths (work-items, cycles, labels, comments, modules)
  - API field gotchas (state vs state_id, labels array)
  - Priority and effort mappings
  - Pages API workflow (internal API, session auth — reference project-docs/references/plane-pages.md for templates)
  - NO project IDs, state IDs, API keys, or email addresses

- [ ] **Step 3: Delete `~/.claude/skills/sprint-work/references/plane-api.md`**

- [ ] **Step 4: Delete `~/.claude/skills/po-ba-analyst/references/plane-api.md`**

- [ ] **Step 5: Verify** — Read the shared file and confirm no project-specific values exist.

### Task 4: Update all three SKILL.md files to reference shared config

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md`
- Modify: `~/.claude/skills/po-ba-analyst/SKILL.md`
- Modify: `~/.claude/skills/project-docs/SKILL.md`

- [ ] **Step 1: Update sprint-work SKILL.md**
  - Replace `Read [references/plane-api.md]` with `Read ~/.claude/skills/shared/plane-api.md for Plane API details. Read .plane-project from the repo root for project-specific IDs and states. Read ~/.claude/plane.json for instance auth.`
  - Remove the `references/` directory if now empty

- [ ] **Step 2: Update po-ba-analyst SKILL.md**
  - Replace `Read [references/plane-api.md]` with same three-file read instruction
  - Remove the `references/` directory if now empty (it had only plane-api.md)

- [ ] **Step 3: Update project-docs SKILL.md**
  - Add the three-file read instruction at the top of the "Plane Pages" section
  - Keep `references/plane-pages.md` (page-specific templates remain separate)

- [ ] **Step 4: Verify** — Read all three SKILL.md files and grep for any remaining hardcoded project IDs, state UUIDs, or API keys. There should be zero.

- [ ] **Step 5: Commit** — "chore: migrate to project-agnostic three-tier Plane config"

---

## Chunk 2: Quality Gates (1a, 1b, 3a)

### Task 5: Add pre-commit verification to sprint-work (1a)

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md`

- [ ] **Step 1: Insert Step 4d between Step 4c and Step 5**

New section content — "Step 4d — Pre-commit verification":
  - Detect lint command from project's `package.json` scripts (`lint`, `check`, or common alternatives). Run on staged files.
  - Detect build/type-check: prefer `pnpm build` (Turborepo-aware), fall back to `tsc --noEmit` scoped to the changed workspace.
  - Workspace detection table: map `apps/api/**` → API, `apps/web/**` → web, `apps/mobile/**` → mobile, `packages/**` → all consumers, root config → full build.
  - If a test file exists alongside the changed file (`foo.ts` → `__tests__/foo.test.ts`), run it.
  - If anything fails, fix before committing. Never commit failing code.

- [ ] **Step 2: Renumber subsequent steps** (old Step 5 → Step 6, etc.)

- [ ] **Step 3: Verify** — Read the file, confirm step numbering is sequential with no gaps.

### Task 6: Add acceptance criteria verification to sprint-work (1b)

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md`

- [ ] **Step 1: Insert Step 4e after Step 4d**

New section content — "Step 4e — Verify acceptance criteria":
  - Parse ticket's `description_html` for acceptance criteria
  - Four format handlers: structured checklist, prose bullets, no AC (infer from description), ambiguous (flag to user)
  - Present as checklist with [x] / [ ] per criterion
  - If any criterion is unmet, go back to Step 4. Do not proceed to commit.

- [ ] **Step 2: Verify** — Read the section, confirm all four AC formats are handled.

### Task 7: Add auto-diff doc detection to project-docs (3a)

**Files:**
- Modify: `~/.claude/skills/project-docs/SKILL.md`

- [ ] **Step 1: Replace the "Doc Sync Check" section**

Replace the existing 8-point manual checklist with automated detection:
  - Per-ticket scope: `git diff --name-only --cached` or `git log --oneline --since="1 hour ago" --name-only`
  - Per-sprint scope: `git log --name-only --since={sprint_start_date}`
  - File-to-doc mapping table (generic patterns, not project-specific)
  - "Present only affected docs. Skip if nothing affected."

- [ ] **Step 2: Verify** — Read the section, confirm the mapping table has no hardcoded paths like `apps/api/`.

- [ ] **Step 3: Commit** — "feat: add quality gates — pre-commit verification, AC check, auto-diff docs"

---

## Chunk 3: Learning Loop (1d, 4b, 2a, 3b, 3c)

### Task 8: Add sprint retrospective to sprint-work (1d)

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md`

- [ ] **Step 1: Expand the "Completing a sprint" section**

After the existing carry-over and date compression steps, add the retro:
  - Trigger: all code tickets Done (SETUP/audit tickets don't block)
  - What happened: completed vs planned, carried over + why, rework events
  - What to learn: estimation accuracy, under/over-estimated types, missed checks
  - Save to learnings file (reference 4b location)
  - Pruning: keep 5 sprints, only remove rules when contradicted
  - Post to Plane cycle comment. If Plane unreachable, save locally.

- [ ] **Step 2: Add learnings file read to Step 1**

At the start of "Identify the ticket", add: "Read the sprint learnings file if it exists (`~/.claude/projects/{project}/memory/feedback_sprint_learnings.md`). Apply any relevant pre-commit rules or estimation adjustments for the current ticket type."

- [ ] **Step 3: Verify** — Read the file, confirm retro + learnings read are both present.

### Task 9: Define sprint learnings memory file format (4b)

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md` (reference the format)
- Modify: `~/.claude/skills/po-ba-analyst/SKILL.md` (reference the format)

This is a format definition, not an actual file creation — the file gets created by the first retro.

- [ ] **Step 1: Add the learnings file format to sprint-work SKILL.md** as a subsection of the retro section. Include: frontmatter template, all sections (Estimation Rules, Pre-commit Rules, Doc Rules, Carry-over Patterns, Risk Overrides, Velocity), defensive parsing note, 200-line max.

- [ ] **Step 2: Add learnings file read to po-ba-analyst** Step 10 (sprint planning). Replace the fixed "velocity cap: 20-25 points" with: "Read sprint learnings file. Sprint capacity = rolling average of code tickets per session, defaulting to 10. Adjust for complexity mix."

- [ ] **Step 3: Verify** — Grep po-ba-analyst SKILL.md for "20-25 points" — should return zero matches.

### Task 10: Replace velocity model in po-ba-analyst (2a)

**Files:**
- Modify: `~/.claude/skills/po-ba-analyst/SKILL.md`

- [ ] **Step 1: Update Step 10 (sprint planning)**

Replace point-based velocity cap with throughput-based model:
  - "Sprint capacity = rolling average from learnings file, defaulting to 10 code tickets"
  - `estimate_point` still assigned to Plane items (S=1, M=3, L=5, XL=8) for display only
  - Adjust capacity for complexity mix: "a sprint with 3+ L tickets should plan fewer total"
  - Mention: SETUP tickets always carry over — don't count toward velocity

- [ ] **Step 2: Verify** — Read Step 10, confirm no reference to "20-25 points" or "velocity cap" with fixed numbers.

### Task 11: Add changelog generation to project-docs (3b)

**Files:**
- Modify: `~/.claude/skills/project-docs/SKILL.md`

- [ ] **Step 1: Add "Changelog Generation" section** after "Doc Sync Check"

Content:
  - Triggered on-demand or after sprint completion
  - Commit prefix → section mapping table (feat→Added, fix→Fixed, perf→Performance, security→Security, ci/chore/docs→Omitted, no prefix→Other)
  - Write to `CHANGELOG.md` in project root, create if missing
  - Use `git log --oneline` since last changelog entry or since a given date

- [ ] **Step 2: Verify** — Read the section, confirm mapping table is complete.

### Task 12: Add freshness scoring to project-docs (3c)

**Files:**
- Modify: `~/.claude/skills/project-docs/SKILL.md`

- [ ] **Step 1: Add "Freshness Scoring" section** after "Changelog Generation"

Content:
  - Location: `~/.claude/projects/{project}/memory/feedback_doc_freshness.md`
  - Table format: Doc | Last verified | Status
  - Check on any invocation. Nudge if >14 days stale.
  - Reset on verification or update.

- [ ] **Step 2: Verify** — Read the section, confirm the file location is project-scoped.

- [ ] **Step 3: Commit** — "feat: add learning loop — sprint retro, velocity tracking, changelog, freshness scoring"

---

## Chunk 4: Polish (4c, 1c, 2b, 2c, 2d, 3d)

### Task 13: Add sprint completion handoff to sprint-work (4c)

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md`

- [ ] **Step 1: Expand "Completing a sprint"** to include the handoff sequence after carry-over + retro:
  1. Retro (already added in Task 8)
  2. Doc sync — "follow project-docs Doc Sync Check using sprint-scoped diff"
  3. Changelog — "follow project-docs Changelog Generation for commits since last entry"
  4. Summary — present completion message to user

  Add note: "This is a sequential instruction set. If context limits are a concern, complete retro first, then docs in a follow-up."
  Add note: "If Plane is unreachable, save locally. Don't fail the handoff."

- [ ] **Step 2: Verify** — Read the section, confirm all four handoff steps are present.

### Task 14: Add complexity estimate to sprint-work (1c)

**Files:**
- Modify: `~/.claude/skills/sprint-work/SKILL.md`

- [ ] **Step 1: Update Step 1** — when presenting Todo items, add Complexity column. Define S/M/L heuristics. Note: "If implementation notes are sparse, mark as 'estimated — verify before starting.'"

- [ ] **Step 2: Verify** — Read Step 1, confirm the table example includes Complexity.

### Task 15: Add dependency detection to po-ba-analyst (2b)

**Files:**
- Modify: `~/.claude/skills/po-ba-analyst/SKILL.md`

- [ ] **Step 1: Add dependency detection to Step 10** (sprint planning), after story assignment but before syncing to Plane:
  - Scan implementation notes for file path overlap, env var references, explicit "depends on" text
  - For continuation workflows, scan both new stories and existing Backlog items
  - Present as warnings, user confirms

- [ ] **Step 2: Verify** — Read Step 10, confirm dependency detection is present and runs before sync.

### Task 16: Add risk scoring to po-ba-analyst (2c)

**Files:**
- Modify: `~/.claude/skills/po-ba-analyst/SKILL.md`

- [ ] **Step 1: Add risk scoring to Step 7** (derive user stories) — auto-tag based on area:
  - Default risk table (auth→high, payments→high, GDPR→high, schema→medium, API→medium, CI→medium, UI→low, docs→low)
  - Note: "The learnings file can extend this table with project-specific overrides"
  - Scheduling rule: "High-risk stories early in sprint, never last before testing gate"

- [ ] **Step 2: Add risk column to the sprint plan table** in Step 10.

- [ ] **Step 3: Verify** — Read Steps 7 and 10, confirm risk is present in both.

### Task 17: Add framework-aware gap detection to po-ba-analyst (2d)

**Files:**
- Modify: `~/.claude/skills/po-ba-analyst/SKILL.md`

- [ ] **Step 1: Add to Step 6** (identify gaps) — opt-in cross-reference against OWASP Top 10, WCAG 2.1 AA, industry-specific frameworks. Uses model's training knowledge. Niche regulations noted as "suspected — verify with specialist."

- [ ] **Step 2: Verify** — Read Step 6, confirm it's opt-in with the prompt question.

### Task 18: Add page templates to project-docs (3d)

**Files:**
- Modify: `~/.claude/skills/project-docs/references/plane-pages.md`

- [ ] **Step 1: Add Runbook template** (When to use, Who can run, Steps, Rollback, Verification, Contacts)

- [ ] **Step 2: Add Architecture template** (Purpose, Components, Data Flow, Design Decisions, Trade-offs)

- [ ] **Step 3: Add Audit guide template** (Scope, Automated Steps, Manual Steps, Known Issues, Deliverables)

- [ ] **Step 4: Verify** — Read the file, confirm all four page types have templates (Setup + 3 new).

- [ ] **Step 5: Commit** — "feat: add sprint handoff, complexity estimates, risk scoring, dependency detection, page templates"

---

## Final Verification

### Task 19: Cross-skill consistency check

- [ ] **Step 1: Verify sprint-work** — Read full SKILL.md. Confirm: steps are numbered sequentially, shared reference is used (not local), `.plane-project` is read, learnings file is read at ticket start and written at retro.

- [ ] **Step 2: Verify po-ba-analyst** — Read full SKILL.md. Confirm: no "20-25 points" reference, shared reference is used, learnings file is read for planning, risk scoring present, dependency detection present, dedup gate present.

- [ ] **Step 3: Verify project-docs** — Read full SKILL.md. Confirm: auto-diff replaces manual checklist, changelog section exists, freshness section exists, all page templates in reference file.

- [ ] **Step 4: Verify shared reference** — Read `~/.claude/skills/shared/plane-api.md`. Confirm: no hardcoded project IDs, API keys, state UUIDs, or email addresses.

- [ ] **Step 5: Verify `.plane-project` files** — Read both. Confirm valid JSON with all required fields.

- [ ] **Step 6: Verify `~/.claude/plane.json`** — Read. Confirm instance-level fields only.

- [ ] **Step 7: Final commit** — "chore: skill enhancements complete — cross-skill verification passed"
