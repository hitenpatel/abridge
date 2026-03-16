import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
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

interface TimetableEntry {
	id: string;
	dayOfWeek: string;
	periodNumber: number;
	periodName: string | null;
	subject: string;
	teacher: string | null;
	room: string | null;
	startTime: string;
	endTime: string;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_LABELS: Record<string, string> = {
	MONDAY: "Mon",
	TUESDAY: "Tue",
	WEDNESDAY: "Wed",
	THURSDAY: "Thu",
	FRIDAY: "Fri",
};

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
	English: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
	Maths: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
	Mathematics: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
	Science: { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" },
	History: { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" },
	Geography: { bg: "#E0E7FF", text: "#4338CA", border: "#C7D2FE" },
	Art: { bg: "#FCE7F3", text: "#BE185D", border: "#FBCFE8" },
	Music: { bg: "#F3E8FF", text: "#7C3AED", border: "#DDD6FE" },
	PE: { bg: "#CCFBF1", text: "#0F766E", border: "#99F6E4" },
	Computing: { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD" },
	ICT: { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD" },
	French: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
	Spanish: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
	RE: { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
	DT: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
	Drama: { bg: "#FDF2F8", text: "#9D174D", border: "#FBCFE8" },
};

const DEFAULT_COLOR = { bg: "#F3F4F6", text: "#4B5563", border: "#D1D5DB" };

function getSubjectColor(subject: string) {
	const key = Object.keys(SUBJECT_COLORS).find((k) =>
		subject.toLowerCase().includes(k.toLowerCase()),
	);
	return (key ? SUBJECT_COLORS[key] : undefined) ?? DEFAULT_COLOR;
}

export function TimetableScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const { data: entries, isLoading: isLoadingTimetable } = trpc.timetable.getForChild.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	useEffect(() => {
		if (children && children.length > 0 && !selectedChildId) {
			const firstChild = children[0];
			if (firstChild) setSelectedChildId(firstChild.id);
		}
	}, [children, selectedChildId]);

	// Group entries by day
	const entriesByDay: Record<string, TimetableEntry[]> = {};
	for (const day of DAYS) {
		entriesByDay[day] = [];
	}
	if (entries) {
		for (const entry of entries as TimetableEntry[]) {
			if (entriesByDay[entry.dayOfWeek]) {
				entriesByDay[entry.dayOfWeek]?.push(entry);
			}
		}
	}

	// Get all unique period numbers sorted
	const allPeriods = entries
		? [...new Set((entries as TimetableEntry[]).map((e) => e.periodNumber))].sort((a, b) => a - b)
		: [];

	// Get current day index (0=Sunday)
	const todayIndex = new Date().getDay();
	const todayDay = DAYS[todayIndex - 1]; // Mon=1 maps to index 0

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
							<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
								Timetable
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">Weekly class schedule</Text>
						</View>
						<View className="bg-primary/10 rounded-full p-2.5">
							<MaterialIcons name="schedule" size={22} color="#f56e3d" />
						</View>
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

				{/* Timetable Grid */}
				{isLoadingTimetable ? (
					<View className="items-center py-20">
						<ActivityIndicator size="large" color="#f56e3d" />
						<Text className="text-text-muted font-sans mt-3">Loading timetable...</Text>
					</View>
				) : entries && (entries as TimetableEntry[]).length > 0 ? (
					<View className="px-4">
						{/* Day Headers */}
						<View className="flex-row mb-3 gap-1.5">
							<View className="w-12" />
							{DAYS.map((day) => {
								const isToday = day === todayDay;
								return (
									<View
										key={day}
										className={`flex-1 items-center py-2 rounded-xl ${
											isToday ? "bg-primary" : "bg-neutral-surface dark:bg-surface-dark"
										}`}
									>
										<Text
											className={`text-xs font-sans-bold ${
												isToday ? "text-white" : "text-text-muted"
											}`}
										>
											{DAY_LABELS[day]}
										</Text>
									</View>
								);
							})}
						</View>

						{/* Period Rows */}
						{allPeriods.map((period) => (
							<View key={period} className="flex-row mb-1.5 gap-1.5">
								{/* Period label */}
								<View className="w-12 items-center justify-center">
									<Text className="text-xs font-sans-bold text-text-muted">P{period}</Text>
								</View>

								{/* Day cells */}
								{DAYS.map((day) => {
									const entry = entriesByDay[day]?.find((e) => e.periodNumber === period);
									if (!entry) {
										return (
											<View
												key={day}
												className="flex-1 bg-neutral-surface/50 dark:bg-surface-dark/50 rounded-xl min-h-[72px] items-center justify-center"
											>
												<Text className="text-text-muted text-xs">-</Text>
											</View>
										);
									}

									const color = getSubjectColor(entry.subject);
									return (
										<View
											key={day}
											className="flex-1 rounded-xl p-1.5 min-h-[72px] justify-center"
											style={{
												backgroundColor: color.bg,
												borderWidth: 1,
												borderColor: color.border,
											}}
										>
											<Text
												className="text-[10px] font-sans-bold leading-tight"
												style={{ color: color.text }}
												numberOfLines={2}
											>
												{entry.subject}
											</Text>
											{entry.teacher && (
												<Text
													className="text-[9px] font-sans mt-0.5 leading-tight"
													style={{ color: color.text, opacity: 0.7 }}
													numberOfLines={1}
												>
													{entry.teacher}
												</Text>
											)}
											{entry.room && (
												<Text
													className="text-[9px] font-sans mt-0.5 leading-tight"
													style={{ color: color.text, opacity: 0.6 }}
													numberOfLines={1}
												>
													{entry.room}
												</Text>
											)}
										</View>
									);
								})}
							</View>
						))}
					</View>
				) : (
					<View className="items-center py-20">
						<MaterialIcons name="event-note" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No timetable found
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1">
							Your school hasn't published a timetable yet
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}
