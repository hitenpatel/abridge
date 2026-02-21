# E2E Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 52 new E2E journey specs from the PRD (`docs/plans/2026-02-21-e2e-coverage-prd.md`), including 21 new fixtures, ~100 web test IDs, and ~50 mobile accessibility labels.

**Architecture:** Journey-driven E2E testing. YAML specs are the single source of truth, generators produce Playwright (web) and Maestro (mobile) tests. Fixtures seed the test database via `POST /api/test/seed`. Test IDs use `data-testid` (web) and `accessibilityLabel` (mobile).

**Tech Stack:** Playwright, Maestro, Prisma, better-auth, YAML journey specs, TypeScript fixtures

**PRD Reference:** `docs/plans/2026-02-21-e2e-coverage-prd.md`

---

## Phase 1: Fixtures & Infrastructure

All new journey specs depend on fixtures. Build these first.

### Task 1: Add new fixture types to FixtureName union

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Update FixtureName type**

Add all new fixture names to the union type:

```typescript
export type FixtureName =
	| "parent-with-school"
	| "staff-with-school"
	| "staff-with-messages"
	| "parent-with-payments"
	| "parent-with-posts"
	| "staff-with-posts"
	| "both-roles"
	// New fixtures
	| "clean-db"
	| "pending-invitation"
	| "expired-invitation"
	| "parent-with-multiple-children"
	| "parent-with-reacted-post"
	| "parent-with-action-items"
	| "parent-with-many-posts"
	| "parent-no-children"
	| "parent-with-categorized-messages"
	| "parent-with-many-messages"
	| "parent-with-payment-history"
	| "parent-with-pending-forms"
	| "parent-with-signature-form"
	| "parent-with-calendar-events"
	| "parent-with-disabled-attendance"
	| "parent-with-disabled-features"
	| "admin-with-multiple-staff"
	| "admin-with-analytics-data"
	| "staff-with-disabled-features"
	| "teacher-staff"
	| "staff-with-children";
```

**Step 2: Add switch cases for new fixtures in seedFixture()**

Add a case for each new fixture name routing to its factory function (which we'll implement in subsequent tasks). For now, add placeholders:

```typescript
case "clean-db":
	return await cleanTestData();
case "pending-invitation":
	return await createPendingInvitation();
case "expired-invitation":
	return await createExpiredInvitation();
// ... etc for all new fixtures
```

**Step 3: Commit**

```
feat: add new fixture type definitions for E2E coverage expansion
```

---

### Task 2: Implement auth & invitation fixtures

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Implement `createPendingInvitation()`**

```typescript
async function createPendingInvitation() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const invitation = await db.invitation.create({
		data: {
			email: "newstaff@test.com",
			schoolId: school.id,
			role: "TEACHER",
			token: "test-invitation-token",
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});

	return { school, invitation };
}
```

**Step 2: Implement `createExpiredInvitation()`**

```typescript
async function createExpiredInvitation() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const invitation = await db.invitation.create({
		data: {
			email: "expired@test.com",
			schoolId: school.id,
			role: "TEACHER",
			token: "expired-token",
			expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
		},
	});

	return { school, invitation };
}
```

**Step 3: Commit**

```
feat: add auth and invitation test fixtures
```

---

### Task 3: Implement parent multi-child & dashboard fixtures

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Implement `createParentWithMultipleChildren()`**

```typescript
async function createParentWithMultipleChildren() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);
	const user = await db.user.create({
		data: {
			email: TEST_CREDENTIALS.parent.email,
			name: "Test Parent",
			emailVerified: true,
		},
	});
	await db.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: hashedPassword,
		},
	});

	const child1 = await db.child.create({
		data: {
			firstName: "Child",
			lastName: "One",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: school.id,
		},
	});

	const child2 = await db.child.create({
		data: {
			firstName: "Child",
			lastName: "Two",
			dateOfBirth: new Date("2017-06-15"),
			yearGroup: "3",
			className: "3B",
			schoolId: school.id,
		},
	});

	await db.parentChild.createMany({
		data: [
			{ userId: user.id, childId: child1.id, relation: "PARENT" },
			{ userId: user.id, childId: child2.id, relation: "PARENT" },
		],
	});

	// Create distinct posts for each child's class
	const staffHashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const staffUser = await db.user.create({
		data: { email: TEST_CREDENTIALS.staff.email, name: "Test Staff", emailVerified: true },
	});
	await db.account.create({
		data: { userId: staffUser.id, accountId: staffUser.id, providerId: "credential", password: staffHashedPassword },
	});
	await db.staffMember.create({
		data: { userId: staffUser.id, schoolId: school.id, role: "ADMIN" },
	});

	await db.classPost.create({
		data: {
			schoolId: school.id,
			authorId: staffUser.id,
			body: "Child One post: Art class today!",
			yearGroup: "1",
			className: "1A",
			mediaUrls: [],
		},
	});

	await db.classPost.create({
		data: {
			schoolId: school.id,
			authorId: staffUser.id,
			body: "Child Two post: Science experiment!",
			yearGroup: "3",
			className: "3B",
			mediaUrls: [],
		},
	});

	return { school, user, child1, child2, staffUser };
}
```

**Step 2: Implement `createParentNoChildren()`**

```typescript
async function createParentNoChildren() {
	const hashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);
	const user = await db.user.create({
		data: {
			email: TEST_CREDENTIALS.parent.email,
			name: "Test Parent",
			emailVerified: true,
		},
	});
	await db.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: hashedPassword,
		},
	});

	return { user };
}
```

**Step 3: Implement `createParentWithReactedPost()`**

```typescript
async function createParentWithReactedPost() {
	const base = await createParentWithPosts();

	// Parent reacts to the first post
	await db.classPostReaction.create({
		data: {
			postId: base.posts[0].id,
			userId: base.user.id,
			emoji: "HEART",
		},
	});

	return base;
}
```

**Step 4: Implement `createParentWithActionItems()`**

```typescript
async function createParentWithActionItems() {
	const base = await createParentWithSchool();

	// Staff user for authoring
	const staffHashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const staffUser = await db.user.create({
		data: { email: TEST_CREDENTIALS.staff.email, name: "Test Staff", emailVerified: true },
	});
	await db.account.create({
		data: { userId: staffUser.id, accountId: staffUser.id, providerId: "credential", password: staffHashedPassword },
	});
	await db.staffMember.create({
		data: { userId: staffUser.id, schoolId: base.school.id, role: "ADMIN" },
	});

	// 1 outstanding payment
	await db.paymentItem.create({
		data: {
			schoolId: base.school.id,
			title: "School Trip",
			amount: 1500,
			category: "TRIP",
			children: { create: { childId: base.child.id } },
		},
	});

	// 1 pending form
	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Permission Form",
			fields: [{ id: "1", type: "text", label: "Do you consent?", required: true }],
			isActive: true,
		},
	});

	// 1 unread urgent message
	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "Urgent Notice",
			body: "Please read this urgent message",
			category: "URGENT",
			authorId: staffUser.id,
			children: { create: { childId: base.child.id } },
		},
	});

	return { ...base, staffUser };
}
```

**Step 5: Implement `createParentWithManyPosts()`**

```typescript
async function createParentWithManyPosts() {
	const base = await createParentWithSchool();

	const staffHashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const staffUser = await db.user.create({
		data: { email: TEST_CREDENTIALS.staff.email, name: "Test Staff", emailVerified: true },
	});
	await db.account.create({
		data: { userId: staffUser.id, accountId: staffUser.id, providerId: "credential", password: staffHashedPassword },
	});
	await db.staffMember.create({
		data: { userId: staffUser.id, schoolId: base.school.id, role: "ADMIN" },
	});

	// Create 15 posts for pagination
	await Promise.all(
		Array.from({ length: 15 }, (_, i) =>
			db.classPost.create({
				data: {
					schoolId: base.school.id,
					authorId: staffUser.id,
					body: `Post ${i + 1}: Daily update`,
					yearGroup: "1",
					className: "1A",
					mediaUrls: [],
				},
			}),
		),
	);

	return { ...base, staffUser };
}
```

**Step 6: Commit**

```
feat: add parent dashboard and multi-child test fixtures
```

---

### Task 4: Implement messaging fixtures

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Implement `createParentWithCategorizedMessages()`**

```typescript
async function createParentWithCategorizedMessages() {
	const base = await createStaffWithMessages();

	// Add URGENT and FYI messages (staff-with-messages already creates 5 STANDARD)
	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "Urgent Message",
			body: "This is an urgent notification",
			category: "URGENT",
			authorId: base.user.id,
			children: { create: { childId: base.child.id } },
		},
	});

	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "FYI Message",
			body: "This is just for your information",
			category: "FYI",
			authorId: base.user.id,
			children: { create: { childId: base.child.id } },
		},
	});

	return base;
}
```

**Step 2: Implement `createParentWithManyMessages()`**

```typescript
async function createParentWithManyMessages() {
	const base = await createStaffWithMessages();

	// staff-with-messages already creates 5, add 15 more for pagination
	await Promise.all(
		Array.from({ length: 15 }, (_, i) =>
			db.message.create({
				data: {
					schoolId: base.school.id,
					subject: `Test Message ${i + 6}`,
					body: `This is test message ${i + 6}`,
					category: "STANDARD",
					authorId: base.user.id,
					children: { create: { childId: base.child.id } },
				},
			}),
		),
	);

	return base;
}
```

**Step 3: Commit**

```
feat: add messaging test fixtures for categories and pagination
```

---

### Task 5: Implement payment, form, calendar, and feature-toggle fixtures

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Implement `createParentWithPaymentHistory()`**

```typescript
async function createParentWithPaymentHistory() {
	const base = await createParentWithSchool();

	const paymentItem = await db.paymentItem.create({
		data: {
			schoolId: base.school.id,
			title: "School Expenses",
			amount: 1000,
			category: "TRIP",
			children: { create: { childId: base.child.id } },
		},
	});

	await db.payment.create({
		data: {
			userId: base.user.id,
			totalAmount: 1000,
			status: "COMPLETED",
			receiptNumber: "REC-001",
			completedAt: new Date(),
			lineItems: {
				create: {
					paymentItemId: paymentItem.id,
					childId: base.child.id,
					amount: 1000,
				},
			},
		},
	});

	return base;
}
```

**Step 2: Implement `createParentWithPendingForms()`**

```typescript
async function createParentWithPendingForms() {
	const base = await createParentWithSchool();

	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Permission Form",
			description: "Please complete this form",
			fields: [{ id: "1", type: "text", label: "Do you consent?", required: true }],
			isActive: true,
		},
	});

	return base;
}
```

**Step 3: Implement `createParentWithSignatureForm()`**

```typescript
async function createParentWithSignatureForm() {
	const base = await createParentWithSchool();

	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Consent Form",
			description: "Requires signature",
			fields: [
				{ id: "1", type: "text", label: "Do you consent?", required: true },
				{ id: "2", type: "signature", label: "Parent signature", required: true },
			],
			isActive: true,
		},
	});

	return base;
}
```

**Step 4: Implement `createParentWithCalendarEvents()`**

```typescript
async function createParentWithCalendarEvents() {
	const base = await createParentWithSchool();

	await db.event.createMany({
		data: [
			{
				schoolId: base.school.id,
				title: "Half Term",
				startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
				allDay: true,
				category: "TERM_DATE",
			},
			{
				schoolId: base.school.id,
				title: "Sports Day",
				body: "Annual sports day event",
				startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				allDay: true,
				category: "EVENT",
			},
			{
				schoolId: base.school.id,
				title: "Chess Club",
				startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				allDay: false,
				category: "CLUB",
			},
		],
	});

	return base;
}
```

**Step 5: Implement disabled-feature fixtures**

```typescript
async function createParentWithDisabledAttendance() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
			attendanceEnabled: false,
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);
	const user = await db.user.create({
		data: { email: TEST_CREDENTIALS.parent.email, name: "Test Parent", emailVerified: true },
	});
	await db.account.create({
		data: { userId: user.id, accountId: user.id, providerId: "credential", password: hashedPassword },
	});

	const child = await db.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: school.id,
		},
	});
	await db.parentChild.create({
		data: { userId: user.id, childId: child.id, relation: "PARENT" },
	});

	return { school, user, child };
}

async function createParentWithDisabledFeatures() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
			messagingEnabled: false,
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);
	const user = await db.user.create({
		data: { email: TEST_CREDENTIALS.parent.email, name: "Test Parent", emailVerified: true },
	});
	await db.account.create({
		data: { userId: user.id, accountId: user.id, providerId: "credential", password: hashedPassword },
	});

	const child = await db.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: school.id,
		},
	});
	await db.parentChild.create({
		data: { userId: user.id, childId: child.id, relation: "PARENT" },
	});

	return { school, user, child };
}
```

**Step 6: Commit**

```
feat: add payment, form, calendar, and feature-toggle fixtures
```

---

### Task 6: Implement admin & staff fixtures

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Implement `createAdminWithMultipleStaff()`**

```typescript
async function createAdminWithMultipleStaff() {
	const base = await createStaffWithSchool();

	// Add a TEACHER
	const teacher = await db.user.create({
		data: { email: "teacher@test.com", name: "Test Teacher", emailVerified: true },
	});
	await db.staffMember.create({
		data: { userId: teacher.id, schoolId: base.school.id, role: "TEACHER" },
	});

	// Add an OFFICE staff
	const office = await db.user.create({
		data: { email: "office@test.com", name: "Test Office", emailVerified: true },
	});
	await db.staffMember.create({
		data: { userId: office.id, schoolId: base.school.id, role: "OFFICE" },
	});

	return { ...base, teacher, office };
}
```

**Step 2: Implement `createTeacherStaff()`**

```typescript
async function createTeacherStaff() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const user = await db.user.create({
		data: { email: TEST_CREDENTIALS.staff.email, name: "Test Teacher", emailVerified: true },
	});
	await db.account.create({
		data: { userId: user.id, accountId: user.id, providerId: "credential", password: hashedPassword },
	});

	await db.staffMember.create({
		data: { userId: user.id, schoolId: school.id, role: "TEACHER" },
	});

	return { school, user };
}
```

**Step 3: Implement `createStaffWithChildren()`**

```typescript
async function createStaffWithChildren() {
	const base = await createStaffWithSchool();

	const children = await Promise.all(
		Array.from({ length: 3 }, (_, i) =>
			db.child.create({
				data: {
					firstName: `Student`,
					lastName: `${i + 1}`,
					dateOfBirth: new Date("2015-01-01"),
					yearGroup: "1",
					className: "1A",
					schoolId: base.school.id,
				},
			}),
		),
	);

	return { ...base, children };
}
```

**Step 4: Implement `createStaffWithDisabledFeatures()`**

```typescript
async function createStaffWithDisabledFeatures() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
			messagingEnabled: false,
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const user = await db.user.create({
		data: { email: TEST_CREDENTIALS.staff.email, name: "Test Staff", emailVerified: true },
	});
	await db.account.create({
		data: { userId: user.id, accountId: user.id, providerId: "credential", password: hashedPassword },
	});
	await db.staffMember.create({
		data: { userId: user.id, schoolId: school.id, role: "ADMIN" },
	});

	return { school, user };
}
```

**Step 5: Implement `createAdminWithAnalyticsData()`**

```typescript
async function createAdminWithAnalyticsData() {
	const base = await createStaffWithSchool();

	const child = await db.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: base.school.id,
		},
	});

	// Attendance records
	const today = new Date();
	await db.attendanceRecord.createMany({
		data: [
			{ childId: child.id, schoolId: base.school.id, date: today, session: "AM", mark: "PRESENT" },
			{ childId: child.id, schoolId: base.school.id, date: today, session: "PM", mark: "LATE" },
		],
	});

	// Payment item
	await db.paymentItem.create({
		data: {
			schoolId: base.school.id,
			title: "Trip Fee",
			amount: 2000,
			category: "TRIP",
			children: { create: { childId: child.id } },
		},
	});

	// Form template
	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Analytics Form",
			fields: [{ id: "1", type: "text", label: "Field", required: true }],
			isActive: true,
		},
	});

	// Messages
	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "Analytics Message",
			body: "Test message for analytics",
			category: "STANDARD",
			authorId: base.user.id,
			children: { create: { childId: child.id } },
		},
	});

	return { ...base, child };
}
```

**Step 6: Commit**

```
feat: add admin and staff management test fixtures
```

---

### Task 7: Verify fixtures compile and wire up switch cases

**Files:**
- Modify: `packages/e2e/fixtures/factories.ts`

**Step 1: Ensure all switch cases are wired**

Verify the `seedFixture()` function has a case for every fixture name in the union type:

```typescript
export async function seedFixture(name: FixtureName) {
	await cleanTestData();

	switch (name) {
		case "parent-with-school":
			return await createParentWithSchool();
		case "staff-with-school":
			return await createStaffWithSchool();
		case "staff-with-messages":
			return await createStaffWithMessages();
		case "parent-with-payments":
			return await createParentWithPayments();
		case "parent-with-posts":
			return await createParentWithPosts();
		case "staff-with-posts":
			return await createStaffWithPosts();
		case "both-roles":
			return await createBothRoles(); // existing or throw
		case "clean-db":
			return {};
		case "pending-invitation":
			return await createPendingInvitation();
		case "expired-invitation":
			return await createExpiredInvitation();
		case "parent-with-multiple-children":
			return await createParentWithMultipleChildren();
		case "parent-with-reacted-post":
			return await createParentWithReactedPost();
		case "parent-with-action-items":
			return await createParentWithActionItems();
		case "parent-with-many-posts":
			return await createParentWithManyPosts();
		case "parent-no-children":
			return await createParentNoChildren();
		case "parent-with-categorized-messages":
			return await createParentWithCategorizedMessages();
		case "parent-with-many-messages":
			return await createParentWithManyMessages();
		case "parent-with-payment-history":
			return await createParentWithPaymentHistory();
		case "parent-with-pending-forms":
			return await createParentWithPendingForms();
		case "parent-with-signature-form":
			return await createParentWithSignatureForm();
		case "parent-with-calendar-events":
			return await createParentWithCalendarEvents();
		case "parent-with-disabled-attendance":
			return await createParentWithDisabledAttendance();
		case "parent-with-disabled-features":
			return await createParentWithDisabledFeatures();
		case "admin-with-multiple-staff":
			return await createAdminWithMultipleStaff();
		case "admin-with-analytics-data":
			return await createAdminWithAnalyticsData();
		case "staff-with-disabled-features":
			return await createStaffWithDisabledFeatures();
		case "teacher-staff":
			return await createTeacherStaff();
		case "staff-with-children":
			return await createStaffWithChildren();
		default:
			throw new Error(`Unknown fixture: ${name}`);
	}
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit -p packages/e2e/tsconfig.json`
Expected: No type errors

**Step 3: Commit**

```
feat: wire up all fixture switch cases
```

---

## Phase 2: Web Test IDs

Add `data-testid` attributes to web components. Group by page.

### Task 8: Add test IDs to register page

**Files:**
- Modify: `apps/web/src/app/register/page.tsx`

**Step 1: Add test IDs to form elements**

Add these `data-testid` attributes:
- Name input: `data-testid="register-name-input"`
- Email input: `data-testid="register-email-input"`
- Password input: `data-testid="register-password-input"`
- Submit button: `data-testid="register-button"`
- Error message container: `data-testid="register-error"`
- Invitation school name display: `data-testid="invitation-school-name"` (if invitation token present)
- Invitation error: `data-testid="invitation-error"` (if token invalid/expired)

**Step 2: Verify by running dev server and checking elements**

Run: `npx pnpm dev` and inspect `/register` in browser.

**Step 3: Commit**

```
feat: add test IDs to registration page
```

---

### Task 9: Add test IDs to login page (error state)

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

**Step 1: Add error test ID**

Find the error message display element and add: `data-testid="login-error"`

**Step 2: Commit**

```
feat: add error test ID to login page
```

---

### Task 10: Add test IDs to dashboard page

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/components/feed/activity-feed.tsx` (if child-switcher or action-items are here)
- Check: Any child-switcher component, action-items-row component

**Step 1: Add dashboard test IDs**

Add to the dashboard page or its child components:
- Child switcher: `data-testid="child-switcher"`
- Child options: `data-testid="child-option-{index}"` (dynamic)
- Action items row: `data-testid="action-items-row"`
- Action item links: `data-testid="action-item-payments"`, `data-testid="action-item-forms"`, `data-testid="action-item-messages"`
- Empty dashboard state: `data-testid="empty-dashboard"`

**Step 2: Commit**

```
feat: add test IDs to dashboard child-switcher and action items
```

---

### Task 11: Add test IDs to messages page

**Files:**
- Modify: `apps/web/src/app/dashboard/messages/page.tsx`

**Step 1: Add messaging test IDs**

Add:
- Unread badge: `data-testid="unread-badge"` on unread indicator
- Category filter buttons: `data-testid="filter-urgent"`, `data-testid="filter-standard"`, `data-testid="filter-fyi"`
- Empty state: `data-testid="empty-messages"`

**Step 2: Commit**

```
feat: add filter and empty state test IDs to messages page
```

---

### Task 12: Add test IDs to messages compose page

**Files:**
- Modify: `apps/web/src/app/dashboard/messages/new/page.tsx`

**Step 1: Add compose test IDs**

Add:
- Subject input: `data-testid="message-subject-input"`
- Body textarea: `data-testid="message-body-input"`
- Category select: `data-testid="message-category-select"`
- Recipients select: `data-testid="message-recipients-select"`
- Send button: `data-testid="message-send-button"`

**Step 2: Commit**

```
feat: add test IDs to message compose page
```

---

### Task 13: Add test IDs to payments pages

**Files:**
- Modify: `apps/web/src/app/dashboard/payments/page.tsx`
- Modify: `apps/web/src/app/dashboard/payments/history/page.tsx` (if exists)
- Modify: `apps/web/src/app/dashboard/payments/new/page.tsx` (if exists)

**Step 1: Add payments test IDs**

Main payments page:
- Cart checkout button: `data-testid="cart-checkout-button"`
- History link/button: `data-testid="history-button"`
- Create payment button (staff): `data-testid="create-payment-button"`

Payment history (if page exists):
- History list: `data-testid="payment-history-list"`
- History items: `data-testid="payment-history-item"`
- Receipt view: `data-testid="receipt-view"`
- Receipt number: `data-testid="receipt-number"`

Payment creation (staff, if page exists):
- Title input: `data-testid="payment-title-input"`
- Amount input: `data-testid="payment-amount-input"`
- Category select: `data-testid="payment-category-select"`
- Submit: `data-testid="payment-create-submit"`

**Step 2: Commit**

```
feat: add test IDs to payment pages
```

---

### Task 14: Add test IDs to attendance page

**Files:**
- Modify: `apps/web/src/app/dashboard/attendance/page.tsx`

**Step 1: Add attendance test IDs**

Add:
- Report absence button: `data-testid="report-absence-button"`
- Absence date input: `data-testid="absence-date-input"`
- Absence reason input: `data-testid="absence-reason-input"`
- Absence submit: `data-testid="absence-submit"`
- Child selector: `data-testid="attendance-child-selector"`

**Step 2: Commit**

```
feat: add test IDs to attendance page
```

---

### Task 15: Add test IDs to forms pages

**Files:**
- Modify: `apps/web/src/app/dashboard/forms/page.tsx`
- Modify: `apps/web/src/app/dashboard/forms/[formId]/page.tsx`

**Step 1: Add forms test IDs**

Forms list page:
- Forms list container: `data-testid="forms-list"`
- Pending section: `data-testid="pending-forms-section"`
- Completed section: `data-testid="completed-forms-section"`
- Create form button (staff): `data-testid="create-form-button"`

Form detail page:
- Dynamic form fields: `data-testid="form-field-{fieldId}"` (on each rendered field)
- Submit button: `data-testid="form-submit-button"`
- Signature canvas: `data-testid="signature-canvas"`
- Signature clear: `data-testid="signature-clear-button"`

**Step 2: Commit**

```
feat: add test IDs to forms pages
```

---

### Task 16: Add test IDs to calendar page

**Files:**
- Modify: `apps/web/src/app/dashboard/calendar/page.tsx` and/or its EventList component

**Step 1: Add calendar test IDs**

Add:
- Calendar view container: `data-testid="calendar-view"`
- Event items: `data-testid="calendar-event"`
- Category filters: `data-testid="calendar-filter-club"`, `data-testid="calendar-filter-event"`, etc.
- Create event button (staff): `data-testid="create-event-button"`
- Event form fields: `data-testid="event-title-input"`, `data-testid="event-start-date"`, `data-testid="event-category-select"`, `data-testid="event-create-submit"`
- Delete button: `data-testid="event-delete-button"`
- Confirm delete: `data-testid="confirm-delete-event"`

**Step 2: Commit**

```
feat: add test IDs to calendar page
```

---

### Task 17: Add test IDs to settings page

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

**Step 1: Add settings test IDs**

Profile section:
- Name input: `data-testid="profile-name-input"`
- Save button: `data-testid="profile-save-button"`
- Success message: `data-testid="profile-success"`

Notifications section:
- Toggle push: `data-testid="toggle-push"`
- Toggle SMS: `data-testid="toggle-sms"`
- Toggle email: `data-testid="toggle-email"`
- Save notifications: `data-testid="notifications-save-button"`
- Quiet start: `data-testid="quiet-start-input"`
- Quiet end: `data-testid="quiet-end-input"`

School settings (admin):
- School name: `data-testid="school-name-input"`
- Save school: `data-testid="school-settings-save"`
- Stripe status: `data-testid="stripe-status"`
- Stripe connect: `data-testid="stripe-connect-button"`

Feature toggles (admin):
- `data-testid="toggle-messaging"`, `toggle-payments"`, `toggle-attendance"`, `toggle-calendar"`, `toggle-forms"`
- Save toggles: `data-testid="feature-toggles-save"`
- Payment categories: `data-testid="toggle-payment-dinner-money"`, etc.

**Step 2: Commit**

```
feat: add test IDs to settings page
```

---

### Task 18: Add test IDs to staff management page

**Files:**
- Modify: `apps/web/src/app/dashboard/staff/page.tsx`

**Step 1: Add staff management test IDs**

Add:
- Staff list: `data-testid="staff-list"`
- Staff row: `data-testid="staff-member-row"`
- Role badge: `data-testid="staff-role-badge"`
- Remove button: `data-testid="staff-remove-button"`
- Confirm remove: `data-testid="confirm-remove-button"`
- Role select: `data-testid="staff-role-select"`
- Role options: `data-testid="role-option-ADMIN"`, `role-option-TEACHER"`, `role-option-OFFICE"`
- Invite email: `data-testid="invite-email-input"`
- Invite role: `data-testid="invite-role-select"`
- Send invite: `data-testid="invite-send-button"`
- Pending invitations: `data-testid="pending-invitations-list"`

**Step 2: Commit**

```
feat: add test IDs to staff management page
```

---

### Task 19: Add test IDs to analytics page

**Files:**
- Modify: `apps/web/src/app/dashboard/analytics/page.tsx`

**Step 1: Add analytics test IDs**

Add:
- View container: `data-testid="analytics-view"`
- Cards: `data-testid="analytics-attendance-card"`, `analytics-payments-card"`, `analytics-forms-card"`, `analytics-messages-card"`
- Date range: `data-testid="analytics-date-range"`
- Range buttons: `data-testid="date-range-today"`, `date-range-week"`, `date-range-month"`, `date-range-term"`

**Step 2: Commit**

```
feat: add test IDs to analytics dashboard
```

---

### Task 20: Add test IDs to post components

**Files:**
- Modify: `apps/web/src/components/feed/class-post-card.tsx` or post detail page

**Step 1: Add post action test IDs**

Add:
- Delete button: `data-testid="post-delete-button"`
- Confirm delete dialog button: `data-testid="confirm-delete-button"`

**Step 2: Commit**

```
feat: add delete test IDs to post components
```

---

## Phase 3: Mobile Accessibility Labels

### Task 21: Add accessibility labels to mobile screens

**Files:**
- Modify: `apps/mobile/src/screens/AttendanceScreen.tsx`
- Modify: `apps/mobile/src/screens/PaymentsScreen.tsx`
- Modify: `apps/mobile/src/screens/FormsScreen.tsx`
- Modify: `apps/mobile/src/screens/MessagesScreen.tsx`
- Modify: `apps/mobile/src/screens/SettingsScreen.tsx`
- Modify: `apps/mobile/src/screens/ParentHomeScreen.tsx`
- Modify: `apps/mobile/src/components/ChildSwitcher.tsx` (or wherever it lives)

**Step 1: Add labels to interactive elements**

For each screen, add `accessibilityLabel` props to tappable/fillable elements that need E2E selectors. Follow the PRD Appendix B list. Key labels per screen:

- **ParentHome**: `"Switch Child"`, `"Action Items"`, `"Payments Due"`, `"Forms Pending"`, `"Unread Messages"`, `"No Children"`
- **Messages**: `"Urgent"`, `"Standard"`, `"FYI"`, `"Sent"`
- **Payments**: `"Pay All"`, `"History"`, `"Create Payment"`, `"Title"`, `"Amount"`, `"Category"`, `"Create"`, `"Receipt"`
- **Attendance**: `"Report Absence"`, `"Date"`, `"Reason"`, `"Submit"`, `"Sick"`, `"Appointment"`, `"Family"`, `"Other"`
- **Forms**: `"Pending Forms"`, `"Completed Forms"`, `"Sign Here"`, `"Clear Signature"`, `"Submit"`
- **Settings**: `"Name"`, `"Save Profile"`, `"Push Notifications"`, `"SMS"`, `"Email"`, `"Save Notifications"`, `"Quiet Start"`, `"Quiet End"`

**Step 2: Add labels to staff-specific screens**

- Modify: `apps/mobile/src/screens/StaffHomeScreen.tsx`
- Modify: `apps/mobile/src/screens/ComposeMessageScreen.tsx`
- Modify: `apps/mobile/src/screens/ComposePostScreen.tsx`
- Modify: `apps/mobile/src/screens/StaffPaymentsScreen.tsx`
- Modify: `apps/mobile/src/screens/StaffAttendanceScreen.tsx`
- Modify: `apps/mobile/src/screens/StaffManagementScreen.tsx`

Labels: `"Staff"`, `"Staff Member"`, `"Invite Staff"`, `"Invite Email"`, `"Send Invite"`, `"Delete Post"`, `"Confirm Delete"`, `"Create Payment"`, `"Present"`, `"Absent"`, `"Save Attendance"`

**Step 3: Commit**

```
feat: add accessibility labels to mobile screens for E2E testing
```

---

## Phase 4: Journey YAML Specs

Write all 52 new journey YAML files. Group by domain for manageable commits.

### Task 22: Write auth journey specs (A-5 through A-10)

**Files:**
- Create: `packages/e2e/journeys/auth/register-parent.yaml`
- Create: `packages/e2e/journeys/auth/register-invitation.yaml`
- Create: `packages/e2e/journeys/auth/login-invalid-credentials.yaml`
- Create: `packages/e2e/journeys/auth/login-unregistered.yaml`
- Create: `packages/e2e/journeys/auth/register-duplicate-email.yaml`
- Create: `packages/e2e/journeys/auth/invitation-expired.yaml`

Write each YAML file following the exact format in the PRD Section 1. Use the journey schema from `packages/e2e/journeys/types.ts`.

**Step 1: Write all 6 YAML files**

Follow exact content from PRD scenarios A-5 through A-10.

**Step 2: Validate YAML syntax**

Run: `npx pnpm --filter @schoolconnect/e2e generate:playwright --tags=auth 2>&1 | head -20`
Expected: No YAML parse errors

**Step 3: Commit**

```
feat: add auth E2E journey specs (registration, errors, invitations)
```

---

### Task 23: Write parent dashboard journey specs (P-D5 through P-D12)

**Files:**
- Create: `packages/e2e/journeys/dashboard/switch-children.yaml`
- Create: `packages/e2e/journeys/dashboard/remove-reaction.yaml`
- Create: `packages/e2e/journeys/dashboard/action-items.yaml`
- Create: `packages/e2e/journeys/dashboard/action-items-navigate.yaml`
- Create: `packages/e2e/journeys/dashboard/feed-pagination.yaml`
- Create: `packages/e2e/journeys/dashboard/no-children.yaml`
- Create: `packages/e2e/journeys/dashboard/empty-feed.yaml`

Write each YAML file following PRD Section 2.

**Step 1: Write all 7 YAML files**

**Step 2: Validate YAML syntax**

Run: `npx pnpm --filter @schoolconnect/e2e generate:playwright --tags=dashboard 2>&1 | head -20`

**Step 3: Commit**

```
feat: add parent dashboard E2E journey specs
```

---

### Task 24: Write parent messaging journey specs (P-M4 through P-M10)

**Files:**
- Create: `packages/e2e/journeys/messaging/mark-read.yaml`
- Create: `packages/e2e/journeys/messaging/filter-category.yaml`
- Create: `packages/e2e/journeys/messaging/empty-inbox.yaml`
- Create: `packages/e2e/journeys/messaging/search-no-results.yaml`
- Create: `packages/e2e/journeys/messaging/message-pagination.yaml`

Write each YAML file following PRD Section 3.

**Step 1: Write all 5 YAML files**

**Step 2: Validate YAML syntax**

Run: `npx pnpm --filter @schoolconnect/e2e generate:playwright --tags=messaging 2>&1 | head -20`

**Step 3: Commit**

```
feat: add parent messaging E2E journey specs
```

---

### Task 25: Write parent payments journey specs (P-P3 through P-P11)

**Files:**
- Create: `packages/e2e/journeys/payments/initiate-web-payment.yaml`
- Create: `packages/e2e/journeys/payments/view-payment-history.yaml`
- Create: `packages/e2e/journeys/payments/view-receipt.yaml`
- Create: `packages/e2e/journeys/payments/cart-checkout.yaml`
- Create: `packages/e2e/journeys/payments/no-payments.yaml`
- Create: `packages/e2e/journeys/payments/amount-display.yaml`

Write each YAML file following PRD Section 4.

**Step 1: Write all 6 YAML files**

**Step 2: Validate**

**Step 3: Commit**

```
feat: add parent payment E2E journey specs
```

---

### Task 26: Write parent attendance journey specs (P-A2 through P-A8)

**Files:**
- Create: `packages/e2e/journeys/attendance/report-absence.yaml`
- Create: `packages/e2e/journeys/attendance/switch-children-attendance.yaml`
- Create: `packages/e2e/journeys/attendance/attendance-disabled.yaml`
- Create: `packages/e2e/journeys/attendance/report-absence-mobile-reasons.yaml`

Write each YAML file following PRD Section 5.

**Step 1: Write all 4 YAML files**

**Step 2: Validate**

**Step 3: Commit**

```
feat: add parent attendance E2E journey specs
```

---

### Task 27: Write parent forms journey specs (P-F2 through P-F9)

**Files:**
- Create: `packages/e2e/journeys/forms/view-pending-forms.yaml`
- Create: `packages/e2e/journeys/forms/submit-form-web.yaml`
- Create: `packages/e2e/journeys/forms/submit-with-signature.yaml`
- Create: `packages/e2e/journeys/forms/no-forms.yaml`

Write each YAML file following PRD Section 6.

**Step 1: Write all 4 YAML files**

**Step 2: Validate**

**Step 3: Commit**

```
feat: add parent forms E2E journey specs
```

---

### Task 28: Write parent calendar journey specs (P-C1 through P-C4)

**Files:**
- Create: `packages/e2e/journeys/calendar/view-events.yaml`
- Create: `packages/e2e/journeys/calendar/filter-events.yaml`
- Create: `packages/e2e/journeys/calendar/no-events.yaml`

Write each YAML file following PRD Section 7.

**Step 1: Write all 3 YAML files**

**Step 2: Validate**

**Step 3: Commit**

```
feat: add parent calendar E2E journey specs
```

---

### Task 29: Write parent settings journey specs (P-S2 through P-S5)

**Files:**
- Create: `packages/e2e/journeys/settings/update-profile.yaml`
- Create: `packages/e2e/journeys/settings/toggle-notifications.yaml`
- Create: `packages/e2e/journeys/settings/set-quiet-hours.yaml`

Write each YAML file following PRD Section 8.

**Step 1: Write all 3 YAML files**

**Step 2: Validate**

**Step 3: Commit**

```
feat: add parent settings E2E journey specs
```

---

### Task 30: Write staff journey specs (S-D2 through S-A2)

**Files:**
- Create: `packages/e2e/journeys/dashboard/staff-stats.yaml`
- Create: `packages/e2e/journeys/dashboard/staff-recent-posts.yaml`
- Create: `packages/e2e/journeys/messaging/compose-message-web.yaml`
- Create: `packages/e2e/journeys/messaging/view-sent-messages.yaml`
- Create: `packages/e2e/journeys/posts/compose-post-web.yaml`
- Create: `packages/e2e/journeys/posts/delete-post.yaml`
- Create: `packages/e2e/journeys/payments/create-payment-item.yaml`
- Create: `packages/e2e/journeys/settings/staff-update-profile.yaml`
- Modify: `packages/e2e/journeys/messaging/view-staff-messages.yaml` (remove `skipPlatforms: [web]`)
- Modify: `packages/e2e/journeys/posts/view-staff-posts.yaml` (remove `skipPlatforms: [web]`)
- Modify: `packages/e2e/journeys/attendance/view-staff-attendance.yaml` (remove `skipPlatforms: [web]`)

Write each YAML file following PRD Sections 9-14.

**Step 1: Write all 8 new YAML files**

**Step 2: Remove skipPlatforms from 3 existing YAML files**

**Step 3: Validate**

**Step 4: Commit**

```
feat: add staff E2E journey specs and enable web parity
```

---

### Task 31: Write admin journey specs (AD-1 through AD-F1)

**Files:**
- Create: `packages/e2e/journeys/staff/view-staff-list.yaml`
- Create: `packages/e2e/journeys/staff/send-invitation.yaml`
- Create: `packages/e2e/journeys/staff/remove-staff.yaml`
- Create: `packages/e2e/journeys/staff/update-role.yaml`
- Create: `packages/e2e/journeys/staff/cannot-remove-self.yaml`
- Create: `packages/e2e/journeys/analytics/view-analytics.yaml`
- Create: `packages/e2e/journeys/analytics/change-date-range.yaml`
- Create: `packages/e2e/journeys/settings/update-school-name.yaml`
- Create: `packages/e2e/journeys/settings/toggle-features.yaml`
- Create: `packages/e2e/journeys/settings/disabled-feature-hides-nav.yaml`
- Create: `packages/e2e/journeys/settings/toggle-payment-categories.yaml`
- Create: `packages/e2e/journeys/stripe/view-stripe-status.yaml`
- Create: `packages/e2e/journeys/stripe/initiate-onboarding.yaml`
- Create: `packages/e2e/journeys/calendar/create-event.yaml`
- Create: `packages/e2e/journeys/calendar/delete-event.yaml`
- Create: `packages/e2e/journeys/forms/create-form-template.yaml`

Write each YAML file following PRD Sections 15-20.

**Step 1: Create `analytics` and `stripe` journey directories**

Run: `mkdir -p packages/e2e/journeys/analytics packages/e2e/journeys/stripe packages/e2e/journeys/staff`

**Step 2: Write all 16 YAML files**

**Step 3: Validate**

**Step 4: Commit**

```
feat: add admin E2E journey specs (staff mgmt, analytics, settings, stripe)
```

---

### Task 32: Write cross-cutting concern journey specs (CC-1 through CC-5)

**Files:**
- Create: `packages/e2e/journeys/auth/disabled-feature-staff.yaml`
- Create: `packages/e2e/journeys/auth/non-admin-no-staff-page.yaml`
- Create: `packages/e2e/journeys/auth/non-admin-no-analytics.yaml`
- Create: `packages/e2e/journeys/auth/parent-no-staff-routes.yaml`
- Create: `packages/e2e/journeys/auth/unauthenticated-redirect.yaml`

Write each YAML file following PRD Section 21.

**Step 1: Write all 5 YAML files**

**Step 2: Validate**

**Step 3: Commit**

```
feat: add cross-cutting access control E2E journey specs
```

---

## Phase 5: Validation & Cleanup

### Task 33: Generate and verify Playwright tests

**Files:**
- No files to modify

**Step 1: Generate all Playwright tests**

Run: `npx pnpm --filter @schoolconnect/e2e generate:playwright`
Expected: All YAML files parsed, `.spec.ts` files generated in `packages/e2e/generated/playwright/`

**Step 2: Count generated tests**

Run: `ls packages/e2e/generated/playwright/*.spec.ts | wc -l`
Expected: 77 (25 existing + 52 new)

**Step 3: Run test matrix**

Run: `npx pnpm --filter @schoolconnect/e2e matrix`
Expected: Report shows coverage improvement

**Step 4: Commit generated files (if checked in)**

```
chore: regenerate Playwright tests from journey specs
```

---

### Task 34: Generate and verify Maestro flows

**Files:**
- No files to modify

**Step 1: Generate all Maestro flows**

Run: `npx pnpm --filter @schoolconnect/e2e generate:maestro`
Expected: YAML flow files generated in `packages/e2e/generated/maestro/`

**Step 2: Verify no generation errors**

Check output for any parsing errors or warnings.

**Step 3: Commit generated files (if checked in)**

```
chore: regenerate Maestro flows from journey specs
```

---

### Task 35: Run lint and type check

**Step 1: Run Biome lint**

Run: `npx pnpm lint`
Expected: No lint errors in modified files

**Step 2: Fix any lint issues**

Run: `npx pnpm lint:fix` if needed

**Step 3: Run TypeScript check on e2e package**

Run: `npx tsc --noEmit -p packages/e2e/tsconfig.json`
Expected: No type errors

**Step 4: Commit any fixes**

```
chore: fix lint issues from E2E coverage expansion
```

---

### Task 36: Final summary commit and PR

**Step 1: Verify total journey count**

Run: `find packages/e2e/journeys -name "*.yaml" | wc -l`
Expected: 77

**Step 2: Run matrix report**

Run: `npx pnpm --filter @schoolconnect/e2e matrix`
Save output for PR description.

**Step 3: Create PR**

Title: `feat: expand E2E test coverage to 77 journeys across all roles`

Body should include:
- Summary of new coverage (52 new specs)
- Coverage by role (Parent 42, Staff 19, Admin 13, Cross-cutting 6)
- New fixtures (21)
- New test IDs (~100 web, ~50 mobile)
- Matrix output
