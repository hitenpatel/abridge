# Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a settings page (web + mobile) where users manage profile, notification preferences, and admins configure school-level settings.

**Architecture:** New `settingsRouter` with 6 tRPC procedures. Three new boolean fields on `School` model. Web page at `/dashboard/settings` with per-section save cards. Mobile `SettingsScreen` with same layout. Invitation acceptance applies school notification defaults to new users.

**Tech Stack:** Prisma, tRPC, Zod, Next.js (React), Expo React Native, Tailwind, sonner (toasts), shadcn/ui components.

---

### Task 1: Schema — Add default notification fields to School model

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (School model)

**Step 1: Add fields to School model**

In `packages/db/prisma/schema.prisma`, add three fields to the `School` model after `stripeAccountId`:

```prisma
  defaultNotifyByPush   Boolean  @default(true)
  defaultNotifyBySms    Boolean  @default(false)
  defaultNotifyByEmail  Boolean  @default(true)
```

**Step 2: Push schema to database**

Run:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push
```
Expected: Schema synced, no data loss.

**Step 3: Regenerate Prisma client**

Run:
```bash
npx pnpm --filter @schoolconnect/db db:generate
```
Expected: Prisma Client generated successfully.

**Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(schema): add default notification prefs to School model"
```

---

### Task 2: API — Create settingsRouter with profile procedures

**Files:**
- Create: `apps/api/src/router/settings.ts`
- Modify: `apps/api/src/router/index.ts`

**Step 1: Create the settings router file**

Create `apps/api/src/router/settings.ts`:

```typescript
import { z } from "zod";
import { protectedProcedure, router, schoolAdminProcedure } from "../trpc";

export const settingsRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUniqueOrThrow({
			where: { id: ctx.user.id },
			select: { name: true, email: true, phone: true },
		});
		return user;
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, "Name is required"),
				phone: z.string().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: { name: input.name, phone: input.phone },
			});
			return { success: true };
		}),

	getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findUniqueOrThrow({
			where: { id: ctx.user.id },
			select: {
				notifyByPush: true,
				notifyBySms: true,
				notifyByEmail: true,
				quietStart: true,
				quietEnd: true,
			},
		});
		return user;
	}),

	updateNotificationPreferences: protectedProcedure
		.input(
			z.object({
				notifyByPush: z.boolean(),
				notifyBySms: z.boolean(),
				notifyByEmail: z.boolean(),
				quietStart: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
					.nullable(),
				quietEnd: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.user.update({
				where: { id: ctx.user.id },
				data: {
					notifyByPush: input.notifyByPush,
					notifyBySms: input.notifyBySms,
					notifyByEmail: input.notifyByEmail,
					quietStart: input.quietStart,
					quietEnd: input.quietEnd,
				},
			});
			return { success: true };
		}),

	getSchoolSettings: schoolAdminProcedure.query(async ({ ctx }) => {
		const school = await ctx.prisma.school.findUniqueOrThrow({
			where: { id: ctx.schoolId },
			select: {
				name: true,
				defaultNotifyByPush: true,
				defaultNotifyBySms: true,
				defaultNotifyByEmail: true,
			},
		});
		return school;
	}),

	updateSchoolSettings: schoolAdminProcedure
		.input(
			z.object({
				name: z.string().min(1, "School name is required"),
				defaultNotifyByPush: z.boolean(),
				defaultNotifyBySms: z.boolean(),
				defaultNotifyByEmail: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.school.update({
				where: { id: ctx.schoolId },
				data: {
					name: input.name,
					defaultNotifyByPush: input.defaultNotifyByPush,
					defaultNotifyBySms: input.defaultNotifyBySms,
					defaultNotifyByEmail: input.defaultNotifyByEmail,
				},
			});
			return { success: true };
		}),
});
```

**Step 2: Register the router**

In `apps/api/src/router/index.ts`, add the import and register:

```typescript
import { settingsRouter } from "./settings";
```

Add to the `router({})` call:
```typescript
settings: settingsRouter,
```

**Step 3: Remove old notification preferences from user router**

In `apps/api/src/router/user.ts`, remove the `updateNotificationPreferences` procedure entirely. Keep `updatePushToken` and `listChildren`.

**Step 4: Verify build**

Run:
```bash
npx pnpm build
```
Expected: Build succeeds with no type errors.

**Step 5: Commit**

```bash
git add apps/api/src/router/settings.ts apps/api/src/router/index.ts apps/api/src/router/user.ts
git commit -m "feat(api): add settingsRouter with profile and notification procedures"
```

---

### Task 3: API — Update invitation acceptance to apply school notification defaults

**Files:**
- Modify: `apps/api/src/router/invitation.ts` (accept procedure)

**Step 1: Update the accept procedure**

In `apps/api/src/router/invitation.ts`, in the `accept` procedure, after the user upsert and before the staff member creation, fetch the school's default notification preferences and apply them to the user:

After the line `const user = await ctx.prisma.user.upsert({...})`, add:

```typescript
// Apply school default notification preferences for new users
if (!existingUser) {
	const school = await ctx.prisma.school.findUnique({
		where: { id: invitation.schoolId },
		select: {
			defaultNotifyByPush: true,
			defaultNotifyBySms: true,
			defaultNotifyByEmail: true,
		},
	});
	if (school) {
		await ctx.prisma.user.update({
			where: { id: user.id },
			data: {
				notifyByPush: school.defaultNotifyByPush,
				notifyBySms: school.defaultNotifyBySms,
				notifyByEmail: school.defaultNotifyByEmail,
			},
		});
	}
}
```

**Step 2: Verify build**

Run:
```bash
npx pnpm build
```
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/api/src/router/invitation.ts
git commit -m "feat(api): apply school notification defaults on invitation acceptance"
```

---

### Task 4: Web — Add notification preference fields to User model

**Note:** The User model in the Prisma schema is missing the `notifyByPush`, `notifyBySms`, `notifyByEmail` fields. Check if they exist first. If they don't exist, add them:

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (User model, if fields missing)

**Step 1: Check and add fields if needed**

Add to the User model after `language` field (if not already present):

```prisma
  notifyByPush  Boolean  @default(true)
  notifyBySms   Boolean  @default(false)
  notifyByEmail Boolean  @default(true)
```

**Step 2: Push and regenerate (if changes made)**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:push
npx pnpm --filter @schoolconnect/db db:generate
```

**Step 3: Commit (if changes made)**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(schema): add notification preference fields to User model"
```

---

### Task 5: Web — Create settings page

**Files:**
- Create: `apps/web/src/app/dashboard/settings/page.tsx`

**Step 1: Create the settings page**

Create `apps/web/src/app/dashboard/settings/page.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

function Toggle({
	checked,
	onChange,
	label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<label className="flex items-center justify-between py-2 cursor-pointer">
			<span className="text-sm font-medium text-gray-700">{label}</span>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
					checked ? "bg-primary" : "bg-gray-200"
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
						checked ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</label>
	);
}

function ProfileCard() {
	const { data, isLoading } = trpc.settings.getProfile.useQuery();
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");

	useEffect(() => {
		if (data) {
			setName(data.name ?? "");
			setPhone(data.phone ?? "");
		}
	}, [data]);

	const updateProfile = trpc.settings.updateProfile.useMutation({
		onSuccess: () => toast.success("Profile saved"),
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-2xl border border-gray-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">person</span>
					Profile
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateProfile.mutate({ name, phone: phone || null });
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Label htmlFor="settings-name">Name</Label>
						<Input
							id="settings-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="settings-email">Email</Label>
						<Input
							id="settings-email"
							value={data?.email ?? ""}
							disabled
							className="bg-gray-50 text-gray-500"
						/>
						<p className="text-xs text-gray-400">Contact admin to change your email</p>
					</div>
					<div className="space-y-1">
						<Label htmlFor="settings-phone">Phone</Label>
						<Input
							id="settings-phone"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="Optional"
						/>
					</div>
					<Button type="submit" disabled={updateProfile.isPending}>
						{updateProfile.isPending ? "Saving..." : "Save Profile"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function NotificationsCard() {
	const { data, isLoading } = trpc.settings.getNotificationPreferences.useQuery();
	const [push, setPush] = useState(true);
	const [sms, setSms] = useState(false);
	const [email, setEmail] = useState(true);
	const [quietEnabled, setQuietEnabled] = useState(false);
	const [quietStart, setQuietStart] = useState("21:00");
	const [quietEnd, setQuietEnd] = useState("07:00");

	useEffect(() => {
		if (data) {
			setPush(data.notifyByPush);
			setSms(data.notifyBySms);
			setEmail(data.notifyByEmail);
			setQuietEnabled(!!data.quietStart);
			setQuietStart(data.quietStart ?? "21:00");
			setQuietEnd(data.quietEnd ?? "07:00");
		}
	}, [data]);

	const updatePrefs = trpc.settings.updateNotificationPreferences.useMutation({
		onSuccess: () => toast.success("Notification preferences saved"),
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-2xl border border-gray-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">notifications</span>
					Notifications
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updatePrefs.mutate({
							notifyByPush: push,
							notifyBySms: sms,
							notifyByEmail: email,
							quietStart: quietEnabled ? quietStart : null,
							quietEnd: quietEnabled ? quietEnd : null,
						});
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Toggle checked={push} onChange={setPush} label="Push notifications" />
						<Toggle checked={sms} onChange={setSms} label="SMS notifications" />
						<Toggle checked={email} onChange={setEmail} label="Email notifications" />
					</div>

					<div className="border-t pt-4">
						<Toggle checked={quietEnabled} onChange={setQuietEnabled} label="Quiet hours" />
						{quietEnabled && (
							<div className="mt-3 flex items-center gap-3">
								<div className="space-y-1">
									<Label htmlFor="quiet-start">From</Label>
									<Input
										id="quiet-start"
										type="time"
										value={quietStart}
										onChange={(e) => setQuietStart(e.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="quiet-end">To</Label>
									<Input
										id="quiet-end"
										type="time"
										value={quietEnd}
										onChange={(e) => setQuietEnd(e.target.value)}
									/>
								</div>
							</div>
						)}
						<p className="text-xs text-gray-400 mt-2">
							Urgent messages will still be delivered during quiet hours
						</p>
					</div>

					<Button type="submit" disabled={updatePrefs.isPending}>
						{updatePrefs.isPending ? "Saving..." : "Save Notifications"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function SchoolSettingsCard({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.settings.getSchoolSettings.useQuery({ schoolId });
	const [schoolName, setSchoolName] = useState("");
	const [defPush, setDefPush] = useState(true);
	const [defSms, setDefSms] = useState(false);
	const [defEmail, setDefEmail] = useState(true);

	useEffect(() => {
		if (data) {
			setSchoolName(data.name);
			setDefPush(data.defaultNotifyByPush);
			setDefSms(data.defaultNotifyBySms);
			setDefEmail(data.defaultNotifyByEmail);
		}
	}, [data]);

	const updateSchool = trpc.settings.updateSchoolSettings.useMutation({
		onSuccess: () => toast.success("School settings saved"),
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-2xl border border-gray-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">school</span>
					School Settings
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateSchool.mutate({
							schoolId,
							name: schoolName,
							defaultNotifyByPush: defPush,
							defaultNotifyBySms: defSms,
							defaultNotifyByEmail: defEmail,
						});
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Label htmlFor="school-name">School Name</Label>
						<Input
							id="school-name"
							value={schoolName}
							onChange={(e) => setSchoolName(e.target.value)}
							required
						/>
					</div>

					<div className="border-t pt-4">
						<p className="text-sm font-medium text-gray-700 mb-2">
							Default notification preferences for new members
						</p>
						<Toggle checked={defPush} onChange={setDefPush} label="Push notifications" />
						<Toggle checked={defSms} onChange={setDefSms} label="SMS notifications" />
						<Toggle checked={defEmail} onChange={setDefEmail} label="Email notifications" />
					</div>

					<Button type="submit" disabled={updateSchool.isPending}>
						{updateSchool.isPending ? "Saving..." : "Save School Settings"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

export default function SettingsPage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();

	if (isLoading) {
		return (
			<div className="max-w-2xl mx-auto space-y-6">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-64 w-full rounded-2xl" />
				<Skeleton className="h-48 w-full rounded-2xl" />
			</div>
		);
	}

	const isAdmin = session?.staffRole === "ADMIN";
	const schoolId = session?.schoolId;

	return (
		<div className="max-w-2xl mx-auto">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
				<p className="text-gray-500 mt-1">Manage your account and preferences</p>
			</div>

			<div className="space-y-6">
				<ProfileCard />
				<NotificationsCard />
				{isAdmin && schoolId && <SchoolSettingsCard schoolId={schoolId} />}
			</div>
		</div>
	);
}
```

**Step 2: Verify the page loads**

Run the dev server and navigate to `/dashboard/settings`:
```bash
npx pnpm dev
```
Expected: Page renders with Profile and Notifications cards (School Settings for admin only).

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/settings/page.tsx
git commit -m "feat(web): add settings page with profile, notifications, and school settings cards"
```

---

### Task 6: Web — Update navigation to show Settings for all roles

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx`

**Step 1: Add Settings to parent and staff nav arrays**

In `apps/web/src/app/dashboard/layout.tsx`, add to the `parentNav` array:
```typescript
{ name: "Settings", href: "/dashboard/settings", icon: "settings" },
```

Add to the `staffNav` array:
```typescript
{ name: "Settings", href: "/dashboard/settings", icon: "settings" },
```

The `adminNav` already has Settings, so no change needed there. But since staff and parent now include Settings directly, remove the duplicate from `adminNav`:
```typescript
const adminNav: NavItem[] = [
	{ name: "Staff Management", href: "/dashboard/staff", icon: "shield_person" },
];
```

**Step 2: Verify navigation**

Log in as a parent — should see Settings in nav.
Log in as staff — should see Settings in nav.
Log in as admin — should see Settings in nav (from staffNav) plus Staff Management (from adminNav).

**Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/layout.tsx
git commit -m "feat(web): add Settings nav link for all user roles"
```

---

### Task 7: Mobile — Add SettingsScreen

**Files:**
- Create: `apps/mobile/src/screens/SettingsScreen.tsx`
- Modify: `apps/mobile/src/navigation/AppNavigator.tsx` (add Settings route)

**Step 1: Create the SettingsScreen**

Create `apps/mobile/src/screens/SettingsScreen.tsx` following existing patterns (SafeAreaView, ScrollView, tRPC hooks, theme-aware colors). The screen should have:

- Profile section: name (editable), email (read-only), phone (editable), save button
- Notifications section: three toggles (push, SMS, email), quiet hours toggle with native time pickers, save button
- School Settings section (admin only): school name, default notification toggles, save button

Use the same tRPC procedures as web: `settings.getProfile`, `settings.updateProfile`, `settings.getNotificationPreferences`, `settings.updateNotificationPreferences`, `settings.getSchoolSettings`, `settings.updateSchoolSettings`.

Follow the component structure and styling from `ParentHomeScreen.tsx` — SafeAreaView, ScrollView with RefreshControl, card-style sections with shadows and rounded corners.

**Step 2: Add Settings to the navigation stack**

In `apps/mobile/src/navigation/AppNavigator.tsx`, add `Settings` to `RootStackParamList`:
```typescript
Settings: undefined;
```

Add the screen inside the authenticated navigator:
```typescript
<Stack.Screen
	name="Settings"
	component={SettingsScreen}
	options={{ title: "Settings" }}
/>
```

Import the screen:
```typescript
import { SettingsScreen } from "../screens/SettingsScreen";
```

**Step 3: Add Settings to the mobile tab/menu navigation**

Ensure the Settings screen is accessible from the tab bar or profile menu area. Check the existing floating tab bar or bottom navigation component and add a Settings entry.

**Step 4: Verify on simulator**

Run the Expo dev server and verify the Settings screen:
```bash
npx pnpm --filter mobile start
```

**Step 5: Commit**

```bash
git add apps/mobile/src/screens/SettingsScreen.tsx apps/mobile/src/navigation/AppNavigator.tsx
git commit -m "feat(mobile): add SettingsScreen with profile, notifications, and school settings"
```

---

### Task 8: Seed — Update seed script with notification defaults

**Files:**
- Modify: `packages/db/prisma/seed.ts`

**Step 1: Add default notification prefs to school seed data**

In the school upsert/create in `packages/db/prisma/seed.ts`, add:

```typescript
defaultNotifyByPush: true,
defaultNotifyBySms: false,
defaultNotifyByEmail: true,
```

**Step 2: Add notification prefs to seed users**

For the seed users (parent and staff), add notification preference fields if the User model now has them:

```typescript
notifyByPush: true,
notifyBySms: false,
notifyByEmail: true,
```

**Step 3: Run seed to verify**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/schoolconnect npx pnpm --filter @schoolconnect/db db:seed
```
Expected: Seed completes without errors.

**Step 4: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(seed): add notification preference defaults to seed data"
```

---

### Task 9: E2E Tests — Web settings flows

**Files:**
- Create: `apps/web/e2e/settings.spec.ts` (or add to existing E2E spec file, following existing patterns)

**Step 1: Write E2E tests**

Write Playwright tests covering:

1. **Parent settings**: Login as parent, navigate to /dashboard/settings, verify Profile and Notifications cards visible, verify School Settings NOT visible
2. **Update profile**: Change name, click Save, verify success toast
3. **Update notifications**: Toggle push off, enable quiet hours, set times, save, verify success toast
4. **Admin school settings**: Login as admin, navigate to settings, verify School Settings card IS visible, update school name, save, verify success toast
5. **Non-admin no school settings**: Login as teacher, verify School Settings card not rendered

Follow the existing E2E test patterns in the project (check `apps/web/e2e/` for examples).

**Step 2: Run E2E tests**

```bash
npx pnpm --filter web test:e2e
```
Expected: All settings tests pass.

**Step 3: Commit**

```bash
git add apps/web/e2e/settings.spec.ts
git commit -m "test(e2e): add settings page E2E tests"
```

---

### Task 10: Final verification and lint

**Step 1: Run linter**

```bash
npx pnpm lint
```
Expected: No lint errors.

**Step 2: Fix any lint issues**

```bash
npx pnpm lint:fix
```

**Step 3: Run full build**

```bash
npx pnpm build
```
Expected: Build succeeds for all packages.

**Step 4: Run all tests**

```bash
npx pnpm test
```
Expected: All tests pass.

**Step 5: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: fix lint issues from settings page implementation"
```
