import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChildSelector } from "../components/ChildSelector";
import { trpc } from "../lib/trpc";

interface Child {
	id: string;
	firstName: string;
	lastName: string;
}

interface ChildWrapper {
	child: Child;
}

interface ReadingEntry {
	id: string;
	date: Date;
	bookTitle: string;
	minutesRead: number | null;
	readWith: string;
	parentComment: string | null;
	teacherComment: string | null;
}

const readWithOptions = [
	{ key: "ALONE" as const, label: "Alone", icon: "person" as const },
	{ key: "PARENT" as const, label: "Parent", icon: "family-restroom" as const },
	{ key: "SIBLING" as const, label: "Sibling", icon: "people" as const },
	{ key: "TEACHER" as const, label: "Teacher", icon: "school" as const },
	{ key: "OTHER" as const, label: "Other", icon: "more-horiz" as const },
];

function getReadWithLabel(value: string): string {
	return readWithOptions.find((o) => o.key === value)?.label ?? value;
}

export function ReadingDiaryScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);

	// Form state
	const [bookTitle, setBookTitle] = useState("");
	const [minutes, setMinutes] = useState("");
	const [readWith, setReadWith] = useState<"ALONE" | "PARENT" | "TEACHER" | "SIBLING" | "OTHER">(
		"PARENT",
	);
	const [comment, setComment] = useState("");

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const { data: diary, isLoading: isLoadingDiary } = trpc.readingDiary.getDiary.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	const { data: stats } = trpc.readingDiary.getStats.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	const [entriesStartDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return d;
	});
	const [entriesEndDate] = useState(() => new Date());

	const {
		data: entries,
		isLoading: isLoadingEntries,
		refetch: refetchEntries,
	} = trpc.readingDiary.getEntries.useQuery(
		{
			childId: selectedChildId ?? "",
			startDate: entriesStartDate,
			endDate: entriesEndDate,
		},
		{ enabled: !!selectedChildId },
	);

	const logReadingMutation = trpc.readingDiary.logReading.useMutation({
		onSuccess: () => {
			setBookTitle("");
			setMinutes("");
			setComment("");
			setShowForm(false);
			Alert.alert("Success", "Reading logged!");
			refetchEntries();
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	useEffect(() => {
		if (children && children.length > 0 && !selectedChildId) {
			const firstChild = children[0];
			if (firstChild) setSelectedChildId(firstChild.id);
		}
	}, [children, selectedChildId]);

	const handleLogReading = () => {
		if (!selectedChildId || !bookTitle.trim()) {
			Alert.alert("Error", "Please enter a book title");
			return;
		}
		const parsedMinutes = minutes ? Number.parseInt(minutes, 10) : undefined;
		if (minutes && (Number.isNaN(parsedMinutes ?? Number.NaN) || (parsedMinutes ?? 0) < 0)) {
			Alert.alert("Error", "Minutes must be a valid number");
			return;
		}
		logReadingMutation.mutate({
			childId: selectedChildId,
			date: new Date(),
			bookTitle: bookTitle.trim(),
			minutesRead: parsedMinutes,
			readWith,
			parentComment: comment.trim() || undefined,
		});
	};

	const readingEntries = (entries as ReadingEntry[] | undefined) ?? [];

	if (isLoadingChildren) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<View className="flex-row items-center justify-between">
						<View>
							<Text className="text-2xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
								Reading Diary
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">Track reading progress</Text>
						</View>
						{stats && stats.currentStreak > 0 && (
							<View className="bg-amber-100 rounded-full px-3 py-1.5 flex-row items-center gap-1">
								<MaterialIcons name="local-fire-department" size={16} color="#D97706" />
								<Text className="text-amber-700 font-sans-bold text-sm">
									{stats.currentStreak} day streak
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Child Selector */}
				{children && children.length > 0 && (
					<View className="px-6 mb-6">
						<ChildSelector
							items={children}
							selectedChildId={selectedChildId ?? ""}
							onSelect={setSelectedChildId}
						/>
					</View>
				)}

				{/* Current Book & Reading Level */}
				{isLoadingDiary ? (
					<ActivityIndicator size="small" color="#f56e3d" />
				) : diary ? (
					<View className="px-6 mb-6">
						<View
							className="bg-white dark:bg-surface-dark rounded-3xl p-5"
							style={{
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 2 },
								shadowOpacity: 0.05,
								shadowRadius: 8,
								elevation: 2,
							}}
						>
							<View className="flex-row items-center gap-3">
								<View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
									<MaterialIcons name="menu-book" size={24} color="#3B82F6" />
								</View>
								<View className="flex-1">
									<Text className="text-base font-sans-bold text-foreground dark:text-white">
										{diary.currentBook ?? "No book set"}
									</Text>
									<Text className="text-xs font-sans text-text-muted">Current Book</Text>
								</View>
								{diary.readingLevel && (
									<View className="bg-purple-100 rounded-full px-3 py-1">
										<Text className="text-xs font-sans-bold text-purple-700">
											{diary.readingLevel}
										</Text>
									</View>
								)}
							</View>
						</View>
					</View>
				) : null}

				{/* Stats Row */}
				{stats && (
					<View className="px-6 mb-6">
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={{ gap: 12 }}
						>
							<View className="bg-white dark:bg-surface-dark rounded-2xl p-4 items-center min-w-[90px]">
								<Text className="text-2xl font-sans-extrabold text-primary">
									{stats.totalEntriesThisTerm}
								</Text>
								<Text className="text-xs font-sans text-text-muted mt-1">This Term</Text>
							</View>
							<View className="bg-white dark:bg-surface-dark rounded-2xl p-4 items-center min-w-[90px]">
								<Text className="text-2xl font-sans-extrabold text-blue-500">
									{stats.avgMinutes}
								</Text>
								<Text className="text-xs font-sans text-text-muted mt-1">Avg Mins</Text>
							</View>
							<View className="bg-white dark:bg-surface-dark rounded-2xl p-4 items-center min-w-[90px]">
								<Text className="text-2xl font-sans-extrabold text-green-500">
									{stats.daysReadThisWeek}
								</Text>
								<Text className="text-xs font-sans text-text-muted mt-1">This Week</Text>
							</View>
							<View className="bg-white dark:bg-surface-dark rounded-2xl p-4 items-center min-w-[90px]">
								<Text className="text-2xl font-sans-extrabold text-amber-500">
									{stats.currentStreak}
								</Text>
								<Text className="text-xs font-sans text-text-muted mt-1">Streak</Text>
							</View>
						</ScrollView>
					</View>
				)}

				{/* Log Reading Button / Form */}
				<View className="px-6 mb-6">
					{!showForm ? (
						<Pressable
							onPress={() => setShowForm(true)}
							accessibilityLabel="Log Reading"
							testID="log-reading-button"
							className="h-16 rounded-[40px] flex-row items-center justify-center gap-3"
							style={{ backgroundColor: "#DBEAFE" }}
						>
							<MaterialIcons name="add" size={24} color="#3B82F6" />
							<Text className="text-base font-sans-extrabold" style={{ color: "#3B82F6" }}>
								Log Reading
							</Text>
						</Pressable>
					) : (
						<View
							className="bg-white dark:bg-surface-dark rounded-3xl p-5"
							accessibilityLabel="Log Reading Form"
						>
							<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
								Log Reading
							</Text>

							{/* Book Title */}
							<TextInput
								className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans mb-3"
								placeholder="Book title"
								placeholderTextColor="#96867f"
								accessibilityLabel="Book Title"
								testID="book-title-input"
								value={bookTitle}
								onChangeText={setBookTitle}
							/>

							{/* Minutes */}
							<TextInput
								className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans mb-3"
								placeholder="Minutes read"
								placeholderTextColor="#96867f"
								accessibilityLabel="Minutes"
								testID="minutes-input"
								value={minutes}
								onChangeText={setMinutes}
								keyboardType="number-pad"
							/>

							{/* Read With Picker */}
							<Text className="text-xs font-sans-semibold text-text-muted mb-2 ml-1">
								Read with
							</Text>
							<View className="flex-row flex-wrap gap-2 mb-4">
								{readWithOptions.map((opt) => (
									<Pressable
										key={opt.key}
										onPress={() => setReadWith(opt.key)}
										accessibilityLabel={opt.label}
										className={`flex-row items-center gap-1.5 px-4 py-3 min-h-[44px] rounded-full ${
											readWith === opt.key
												? "bg-white dark:bg-neutral-surface-dark border border-gray-200 dark:border-white/10"
												: "bg-background dark:bg-white/5"
										}`}
										style={{
											shadowColor: readWith === opt.key ? "#000" : "transparent",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: readWith === opt.key ? 0.08 : 0,
											shadowRadius: 4,
											elevation: readWith === opt.key ? 2 : 0,
										}}
									>
										<MaterialIcons
											name={opt.icon}
											size={14}
											color={readWith === opt.key ? "#3B82F6" : "#9CA3AF"}
										/>
										<Text
											className={`text-xs font-sans-semibold ${
												readWith === opt.key ? "text-foreground dark:text-white" : "text-text-muted"
											}`}
										>
											{opt.label}
										</Text>
									</Pressable>
								))}
							</View>

							{/* Comment */}
							<TextInput
								className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans mb-4 min-h-[80px]"
								placeholder="Optional comment..."
								placeholderTextColor="#96867f"
								accessibilityLabel="Comment"
								testID="comment-input"
								value={comment}
								onChangeText={setComment}
								multiline
								textAlignVertical="top"
							/>

							{/* Submit */}
							<View className="flex-row gap-3">
								<Pressable
									onPress={() => setShowForm(false)}
									className="flex-1 h-12 rounded-full items-center justify-center bg-background dark:bg-white/5"
								>
									<Text className="text-sm font-sans-bold text-text-muted">Cancel</Text>
								</Pressable>
								<Pressable
									onPress={handleLogReading}
									disabled={logReadingMutation.isPending}
									testID="submit-reading"
									accessibilityLabel="Submit Reading"
									className="flex-1 h-12 rounded-full flex-row items-center justify-center gap-2"
									style={{ backgroundColor: "#DCFCE7" }}
								>
									<MaterialIcons name="check" size={18} color="#16A34A" />
									<Text className="text-sm font-sans-bold" style={{ color: "#16A34A" }}>
										{logReadingMutation.isPending ? "Saving..." : "Save"}
									</Text>
								</Pressable>
							</View>
						</View>
					)}
				</View>

				{/* Recent Entries */}
				<View className="px-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Recent Entries
					</Text>

					{isLoadingEntries ? (
						<ActivityIndicator size="small" color="#f56e3d" />
					) : readingEntries.length > 0 ? (
						<View className="gap-3">
							{readingEntries.slice(0, 15).map((entry) => (
								<View
									key={entry.id}
									className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
								>
									<View className="flex-row items-center gap-3">
										<View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
											<MaterialIcons name="auto-stories" size={20} color="#3B82F6" />
										</View>
										<View className="flex-1">
											<Text className="text-sm font-sans-bold text-foreground dark:text-white">
												{entry.bookTitle}
											</Text>
											<Text className="text-xs font-sans text-text-muted">
												{new Date(entry.date).toLocaleDateString("en-GB", {
													weekday: "short",
													day: "numeric",
													month: "short",
												})}
												{entry.minutesRead ? ` \u00b7 ${entry.minutesRead} mins` : ""}
												{" \u00b7 "}
												{getReadWithLabel(entry.readWith)}
											</Text>
										</View>
									</View>
									{entry.parentComment && (
										<Text className="text-xs font-sans text-text-muted mt-2 ml-14">
											{entry.parentComment}
										</Text>
									)}
									{entry.teacherComment && (
										<View className="mt-2 ml-14 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2">
											<Text className="text-xs font-sans text-purple-700 dark:text-purple-300">
												Teacher: {entry.teacherComment}
											</Text>
										</View>
									)}
								</View>
							))}
						</View>
					) : (
						<View className="items-center py-10">
							<MaterialIcons name="auto-stories" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No reading entries yet
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
