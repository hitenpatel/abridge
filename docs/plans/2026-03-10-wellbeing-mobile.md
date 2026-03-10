# Wellbeing Mobile Check-in — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a parent-facing wellbeing check-in screen to the mobile app, accessible from a card on ParentHomeScreen, gated by `wellbeingEnabled` feature toggle.

**Architecture:** New `WellbeingScreen` stack screen with mood picker + history list. Entry via a card on ParentHomeScreen that shows today's check-in status. Uses existing `wellbeing.submitCheckIn` and `wellbeing.getCheckIns` tRPC procedures. Feature-gated via `settings.getFeatureTogglesForParent` (already wired up in `App.tsx`).

**Tech Stack:** React Native (Expo), NativeWind/Tailwind, tRPC, Maestro YAML

---

### Task 1: Add Wellbeing route to navigation

**Files:**
- Modify: `apps/mobile/App.tsx`

**Step 1: Add route to RootStackParamList**

At line 76, before the closing `};` of `RootStackParamList`, add:

```typescript
	Wellbeing: { childId: string };
```

**Step 2: Add Stack.Screen registration**

After the `PostDetail` Stack.Screen (around line 307), add:

```tsx
<Stack.Screen name="Wellbeing" component={WellbeingScreen} options={{ title: "Wellbeing" }} />
```

**Step 3: Add import**

Add to the imports section (around line 35):

```typescript
import { WellbeingScreen } from "./src/screens/WellbeingScreen";
```

**Step 4: Verify no TypeScript errors**

This will fail until WellbeingScreen exists, which is expected. Just verify the route type is correct:

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -i wellbeing`
Expected: Only error should be the missing module `./src/screens/WellbeingScreen`

**Step 5: Commit**

```bash
git add apps/mobile/App.tsx
git commit -m "feat: add Wellbeing route to mobile navigation"
```

---

### Task 2: Create WellbeingScreen

**Files:**
- Create: `apps/mobile/src/screens/WellbeingScreen.tsx`

**Step 1: Create the screen**

```tsx
import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import type { RootStackParamList } from "../../App";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Props = NativeStackScreenProps<RootStackParamList, "Wellbeing">;

type Mood = "GREAT" | "GOOD" | "OK" | "LOW" | "STRUGGLING";

const MOODS: { value: Mood; emoji: string; label: string; bg: string; activeBg: string; text: string }[] = [
	{ value: "GREAT", emoji: "😄", label: "Great", bg: "bg-green-50", activeBg: "bg-green-100", text: "text-green-800" },
	{ value: "GOOD", emoji: "🙂", label: "Good", bg: "bg-emerald-50", activeBg: "bg-emerald-100", text: "text-emerald-800" },
	{ value: "OK", emoji: "😐", label: "OK", bg: "bg-yellow-50", activeBg: "bg-yellow-100", text: "text-yellow-800" },
	{ value: "LOW", emoji: "😟", label: "Low", bg: "bg-orange-50", activeBg: "bg-orange-100", text: "text-orange-800" },
	{ value: "STRUGGLING", emoji: "😢", label: "Struggling", bg: "bg-red-50", activeBg: "bg-red-100", text: "text-red-800" },
];

function getMoodConfig(mood: string) {
	return MOODS.find((m) => m.value === mood) ?? MOODS[2];
}

export function WellbeingScreen({ route }: Props) {
	const { childId } = route.params;
	const utils = trpc.useUtils();
	const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
	const [note, setNote] = useState("");

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const {
		data: checkIns,
		isLoading,
		refetch,
		isRefetching,
	} = trpc.wellbeing.getCheckIns.useQuery({
		childId,
		startDate: thirtyDaysAgo,
		endDate: new Date(),
	});

	const submitMutation = trpc.wellbeing.submitCheckIn.useMutation({
		onSuccess: () => {
			Alert.alert("Saved!", "Check-in recorded successfully.");
			setSelectedMood(null);
			setNote("");
			utils.wellbeing.getCheckIns.invalidate();
		},
		onError: (err) => Alert.alert("Error", err.message),
	});

	const onRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	const handleSubmit = () => {
		if (!selectedMood) return;
		submitMutation.mutate({ childId, mood: selectedMood, note: note || undefined });
	};

	// Check if already checked in today
	const todayStr = today.toISOString().split("T")[0];
	const todayCheckIn = checkIns?.find(
		(c) => new Date(c.date).toISOString().split("T")[0] === todayStr,
	);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background px-6 pt-6">
				<Skeleton className="h-6 w-48 mb-4" />
				<View className="flex-row gap-3 mb-6">
					{MOODS.map((m) => (
						<Skeleton key={m.value} className="h-20 flex-1 rounded-2xl" />
					))}
				</View>
				<Skeleton className="h-12 w-full rounded-2xl mb-6" />
				<Skeleton className="h-48 w-full rounded-2xl" />
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 40 }}
			showsVerticalScrollIndicator={false}
			refreshControl={
				<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
			}
		>
			{/* Mood Picker */}
			<View className="px-6 pt-6">
				<Text className="text-lg font-sans-bold text-foreground dark:text-white mb-4">
					How are they feeling today?
				</Text>
				<View className="flex-row gap-2">
					{MOODS.map((mood) => {
						const isSelected = selectedMood === mood.value;
						return (
							<Pressable
								key={mood.value}
								onPress={() => setSelectedMood(mood.value)}
								accessibilityLabel={mood.label}
								className={`flex-1 items-center py-3 rounded-2xl border-2 ${
									isSelected
										? `${mood.activeBg} border-current`
										: `${mood.bg} border-transparent`
								}`}
								style={isSelected ? { borderColor: "#f56e3d" } : undefined}
							>
								<Text className="text-2xl mb-1">{mood.emoji}</Text>
								<Text
									className={`text-xs font-sans-semibold ${isSelected ? mood.text : "text-text-muted"}`}
								>
									{mood.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			{/* Note Input */}
			<View className="px-6 mt-4">
				<TextInput
					placeholder="Add a note (optional)"
					placeholderTextColor="#96867f"
					value={note}
					onChangeText={setNote}
					maxLength={200}
					multiline
					className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 py-3 text-foreground dark:text-white font-sans text-base min-h-[80px]"
					style={{ textAlignVertical: "top" }}
				/>
				<Text className="text-xs text-text-muted font-sans mt-1 text-right">
					{note.length}/200
				</Text>
			</View>

			{/* Submit Button */}
			<View className="px-6 mt-2">
				<Pressable
					onPress={handleSubmit}
					disabled={!selectedMood || submitMutation.isPending}
					accessibilityLabel={todayCheckIn ? "Update Check-in" : "Save Check-in"}
					className={`rounded-2xl py-4 items-center ${
						selectedMood ? "bg-primary" : "bg-neutral-surface"
					}`}
				>
					<Text
						className={`font-sans-bold text-base ${
							selectedMood ? "text-white" : "text-text-muted"
						}`}
					>
						{submitMutation.isPending
							? "Saving..."
							: todayCheckIn
								? "Update Check-in"
								: "Save Check-in"}
					</Text>
				</Pressable>
			</View>

			{/* Dev-only test button */}
			{(__DEV__ || process.env.EXPO_PUBLIC_E2E) && (
				<View className="px-6 mt-2">
					<Pressable
						onPress={() => {
							setSelectedMood("GOOD");
							setNote("Feeling happy today");
						}}
						className="bg-neutral-surface rounded-full py-2 items-center"
					>
						<Text className="text-text-muted font-sans-semibold text-sm">Test Fill</Text>
					</Pressable>
				</View>
			)}

			{/* History */}
			<View className="px-6 mt-8">
				<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
					Recent Check-ins
				</Text>
				{checkIns && checkIns.length > 0 ? (
					checkIns.map((checkIn) => {
						const config = getMoodConfig(checkIn.mood);
						const date = new Date(checkIn.date);
						const dateLabel = date.toLocaleDateString("en-GB", {
							weekday: "short",
							day: "numeric",
							month: "short",
						});
						return (
							<View
								key={checkIn.id}
								className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-2 flex-row items-center gap-3"
							>
								<Text className="text-xl">{config.emoji}</Text>
								<View className="flex-1">
									<View className="flex-row items-center gap-2">
										<View className={`${config.activeBg} rounded-full px-2 py-0.5`}>
											<Text className={`text-xs font-sans-bold ${config.text}`}>
												{config.label}
											</Text>
										</View>
										<Text className="text-xs font-sans text-text-muted">{dateLabel}</Text>
									</View>
									{checkIn.note && (
										<Text className="text-sm font-sans text-foreground dark:text-white mt-1">
											{checkIn.note}
										</Text>
									)}
								</View>
							</View>
						);
					})
				) : (
					<View className="items-center py-12">
						<MaterialIcons name="favorite-border" size={40} color="#D1D5DB" />
						<Text className="text-text-muted font-sans-medium text-sm mt-3">
							No check-ins yet
						</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -c "WellbeingScreen"`
Expected: 0 new errors from WellbeingScreen

**Step 3: Commit**

```bash
git add apps/mobile/src/screens/WellbeingScreen.tsx
git commit -m "feat: add WellbeingScreen with mood picker and history"
```

---

### Task 3: Add wellbeing card to ParentHomeScreen

**Files:**
- Modify: `apps/mobile/src/screens/ParentHomeScreen.tsx`

**Step 1: Add feature toggle query**

After the existing `actionItems` query (around line 67), add:

```tsx
const { data: features } = trpc.settings.getFeatureTogglesForParent.useQuery();
```

**Step 2: Add today's check-in query**

After the feature toggle query:

```tsx
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayEnd = new Date(today);
todayEnd.setHours(23, 59, 59, 999);

const { data: todayCheckIns } = trpc.wellbeing.getCheckIns.useQuery(
	{ childId: selectedChildId ?? "", startDate: today, endDate: todayEnd },
	{ enabled: !!selectedChildId && !!features?.wellbeingEnabled },
);
const todayCheckIn = todayCheckIns?.[0];
```

**Step 3: Add wellbeing card JSX**

Inside the `<ScrollView>`, after the Action Items section closing `</View>` (the `{actionItems && actionItems.length > 0 && (` block) and before `{/* Activity Feed */}`, add:

```tsx
{/* Wellbeing Check-in Card */}
{features?.wellbeingEnabled && selectedChildId && (
	<View className="px-6 mb-4">
		<Pressable
			onPress={() => navigation.navigate("Wellbeing", { childId: selectedChildId })}
			testID="wellbeing-card"
			className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
		>
			<View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center">
				<Text className="text-xl">{todayCheckIn ? getMoodEmoji(todayCheckIn.mood) : "💗"}</Text>
			</View>
			<View className="flex-1">
				<Text className="text-base font-sans-bold text-foreground dark:text-white">
					{todayCheckIn
						? `${children.find((c) => c.id === selectedChildId)?.firstName ?? "Child"} is feeling ${todayCheckIn.mood.charAt(0) + todayCheckIn.mood.slice(1).toLowerCase()}`
						: `How is ${children.find((c) => c.id === selectedChildId)?.firstName ?? "your child"} feeling?`}
				</Text>
				<Text className="text-xs font-sans text-text-muted">
					{todayCheckIn ? "Tap to update or view history" : "Daily wellbeing check-in"}
				</Text>
			</View>
			<MaterialIcons name="chevron-right" size={24} color="#96867f" />
		</Pressable>
	</View>
)}
```

**Step 4: Add getMoodEmoji helper**

Above the `ParentHomeScreen` function (around line 17), add:

```tsx
function getMoodEmoji(mood: string): string {
	switch (mood) {
		case "GREAT": return "😄";
		case "GOOD": return "🙂";
		case "OK": return "😐";
		case "LOW": return "😟";
		case "STRUGGLING": return "😢";
		default: return "💗";
	}
}
```

**Step 5: Add dev nav button**

In the dev-only nav buttons section (alongside nav-calendar, nav-forms), add:

```tsx
<Pressable testID="nav-wellbeing" onPress={() => navigation.navigate("Wellbeing", { childId: selectedChildId ?? "" })} className="bg-neutral-surface rounded-full px-3 py-1">
	<Text className="text-text-muted text-xs">Wellbeing</Text>
</Pressable>
```

**Step 6: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep -i "ParentHome"`
Expected: No new errors from ParentHomeScreen

**Step 7: Commit**

```bash
git add apps/mobile/src/screens/ParentHomeScreen.tsx
git commit -m "feat: add wellbeing card and dev nav button to parent home"
```

---

### Task 4: Write Maestro flow

**Files:**
- Create: `apps/mobile/.maestro/parent/wellbeing-checkin.yaml`

**Step 1: Write the flow**

```yaml
appId: com.abridge.app
name: Parent Wellbeing Check-in
tags:
  - parent
  - wellbeing
---
- runFlow: ../_helpers/login-parent.yaml

# Verify home loaded
- extendedWaitUntil:
    visible: "feeling"
    timeout: 30000

# Navigate via dev nav button
- tapOn:
    id: "nav-wellbeing"

# Verify wellbeing screen loaded
- extendedWaitUntil:
    visible: "How are they feeling today?"
    timeout: 30000

# Use Test Fill to select mood and note
- tapOn:
    text: "Test Fill"

# Verify mood selected
- extendedWaitUntil:
    visible: "Feeling happy today"
    timeout: 30000

# Submit check-in
- tapOn:
    label: "Save Check-in"

# Verify success
- extendedWaitUntil:
    visible: "Saved!"
    timeout: 30000

# Dismiss alert
- tapOn:
    text: "OK"
```

**Step 2: Commit**

```bash
git add apps/mobile/.maestro/parent/wellbeing-checkin.yaml
git commit -m "test: add Maestro flow for parent wellbeing check-in"
```

---

## Summary of All Changes

| Category | Files Changed | Description |
|---|---|---|
| Navigation | `apps/mobile/App.tsx` | Add `Wellbeing` route + Stack.Screen |
| Screen | `apps/mobile/src/screens/WellbeingScreen.tsx` | Mood picker, note, submit, history list |
| Home card | `apps/mobile/src/screens/ParentHomeScreen.tsx` | Wellbeing card + dev nav button |
| Test | `apps/mobile/.maestro/parent/wellbeing-checkin.yaml` | Full check-in Maestro flow |
| **Total** | **29 Maestro flows** | Up from 28 |
