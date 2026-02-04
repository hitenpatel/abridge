# Forms & Consent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a digital forms and consent system where schools can send forms to parents, and parents can sign and submit them for one or all children.

**Architecture:**
- **Backend:** `formsRouter` for CRUD operations on templates and responses.
- **Database:** New models `FormTemplate`, `FormResponse`, `FormField`.
- **Web UI:** Form builder for staff (simple JSON schema), Form renderer for parents with signature pad.
- **PDF:** Generate PDF receipt on submission using `@react-pdf/renderer` and email it (future/mock for MVP).

**Tech Stack:** tRPC, Prisma, Zod, React Hook Form, `react-signature-canvas`, `@react-pdf/renderer`.

---

### Task 1: Database Models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: Add Form Models**

Add to schema:
```prisma
model FormTemplate {
  id        String   @id @default(cuid())
  schoolId  String
  title     String
  description String?
  fields    Json     // Array of field definitions { id, type, label, required }
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  school    School   @relation(fields: [schoolId], references: [id])
  responses FormResponse[]

  @@index([schoolId])
}

model FormResponse {
  id          String   @id @default(cuid())
  templateId  String
  childId     String
  parentId    String
  data        Json     // Key-value pairs matching field ids
  signature   String?  // Base64 signature image
  submittedAt DateTime @default(now())

  template    FormTemplate @relation(fields: [templateId], references: [id])
  child       Child        @relation(fields: [childId], references: [id])
  parent      User         @relation(fields: [parentId], references: [id])

  @@unique([templateId, childId])
}
```
Add relations to `School`, `Child`, `User`.

**Step 2: Migrate**
`pnpm --filter @schoolconnect/db db:migrate -- --name add_forms`

**Step 3: Commit**
```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(forms): add form template and response models"
```

---

### Task 2: Forms Router (Backend)

**Files:**
- Create: `apps/api/src/router/forms.ts`
- Modify: `apps/api/src/router/index.ts`
- Test: `apps/api/src/__tests__/forms.test.ts`

**Step 1: Write failing test**
Create `apps/api/src/__tests__/forms.test.ts` testing `getFormsForChild` and `submitForm`.

**Step 2: Implement Forms Router**
- `getTemplates(schoolId)`: Staff only.
- `createTemplate(...)`: Staff only. Define fields.
- `getPendingForms(childId)`: Parent only. Returns templates not yet submitted for child.
- `submitForm({ templateId, childId, data, signature })`: Create `FormResponse`. Verify parent owns child.

**Step 3: Run tests**
`pnpm --filter @schoolconnect/api test apps/api/src/__tests__/forms.test.ts`

**Step 4: Commit**
```bash
git add apps/api/src/router/forms.ts apps/api/src/router/index.ts apps/api/src/__tests__/forms.test.ts
git commit -m "feat(forms): implement forms router"
```

---

### Task 3: Form Renderer & Signature (Web)

**Files:**
- Create: `apps/web/src/components/forms/form-renderer.tsx`
- Create: `apps/web/src/components/forms/signature-pad.tsx`
- Install: `react-signature-canvas`

**Step 1: Install dependencies**
`pnpm --filter @schoolconnect/web add react-signature-canvas`
`pnpm --filter @schoolconnect/web add -D @types/react-signature-canvas`

**Step 2: Create SignaturePad component**
Wrapper around `react-signature-canvas` with clear button and base64 export.

**Step 3: Create FormRenderer**
Takes `FormTemplate` fields (text, checkbox, select) and renders inputs using `react-hook-form`. Adds `SignaturePad` at the bottom.

**Step 4: Commit**
```bash
git add apps/web/src/components/forms/
git commit -m "feat(forms): add form renderer and signature pad"
```

---

### Task 4: Parent Forms Page (Web)

**Files:**
- Create: `apps/web/src/app/dashboard/forms/page.tsx`
- Create: `apps/web/src/app/dashboard/forms/[formId]/page.tsx`

**Step 1: Forms List Page**
List "Action Required" (pending) and "Completed" forms.
Use `trpc.forms.getPendingForms`.

**Step 2: Single Form Page**
Load template, render `FormRenderer`.
On submit: `trpc.forms.submitForm.useMutation`.
Handle "Apply to all my children": Checkbox that loops through all children IDs and calls mutation for each (optimistic UI).

**Step 3: Commit**
```bash
git add apps/web/src/app/dashboard/forms/
git commit -m "feat(forms): add parent forms list and submission page"
```

---

### Task 5: PDF Generation (Backend stub)

**Files:**
- Modify: `apps/api/src/router/forms.ts`

**Step 1: Add mock email/PDF generation**
In `submitForm` mutation, log:
`console.log("Generating PDF for form", form.id)`
`console.log("Emailing receipt to", ctx.user.email)`

(Full implementation with `@react-pdf/renderer` can be a follow-up enhancement).

**Step 2: Commit**
```bash
git add apps/api/src/router/forms.ts
git commit -m "feat(forms): add logging for pdf generation"
```
