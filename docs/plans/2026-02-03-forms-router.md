# Task 2: Forms Router (Backend) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the tRPC router for handling Form templates and responses, with appropriate access controls.

**Architecture:** Use tRPC's procedure modifiers for school-level access control and manual checks for parent-child relationship validation.

**Tech Stack:** tRPC, Zod, Prisma, Vitest.

---

### Task 2.1: Write Failing Tests for Forms Router

**Files:**
- Create: `apps/api/src/__tests__/forms.test.ts`

**Step 1: Write the failing tests**
Write tests for:
- `getTemplates` (staff only)
- `createTemplate` (staff only)
- `getPendingForms` (parent only, specific to child)
- `submitForm` (parent only, specific to child)

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/forms.test.ts`
Expected: FAIL because `forms` router is not yet in `appRouter`.

### Task 2.2: Create Forms Router

**Files:**
- Create: `apps/api/src/router/forms.ts`

**Step 1: Implement `getTemplates` and `createTemplate`**
- Use `schoolStaffProcedure`.
- `getTemplates` should return all templates for the school.
- `createTemplate` should take `title`, `description`, `fields`.

**Step 2: Implement `getPendingForms` and `submitForm`**
- Use `protectedProcedure`.
- Verify parent owns child using `ctx.prisma.parentChild.findUnique`.
- `getPendingForms` should return templates for child's school minus those already submitted for this child.
- `submitForm` should create a `FormResponse`.

### Task 2.3: Register Forms Router

**Files:**
- Modify: `apps/api/src/router/index.ts`

**Step 1: Register the router**
- Import `formsRouter` and add it to `appRouter`.

### Task 2.4: Verify Implementation

**Step 1: Run tests**
Run: `pnpm --filter @schoolconnect/api test apps/api/src/__tests__/forms.test.ts`
Expected: PASS

**Step 2: Commit**
```bash
git add apps/api/src/router/forms.ts apps/api/src/router/index.ts apps/api/src/__tests__/forms.test.ts
git commit -m "feat(forms): implement forms router"
```
