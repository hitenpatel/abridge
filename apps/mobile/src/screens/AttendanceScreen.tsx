import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
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

interface AttendanceItem {
	date: Date;
	session: string;
	mark: string;
	note: string | null;
}

const reasons = [
	{ key: "Sick", icon: "sick" as const, color: "#EF4444" },
	{ key: "Appointment", icon: "event" as const, color: "#3B82F6" },
	{ key: "Family", icon: "groups" as const, color: "#8B5CF6" },
	{ key: "Other", icon: "more-horiz" as const, color: "#6B7280" },
];

function getMarkColor(mark: string): { bg: string; text: string; label: string } {
	switch (mark) {
		case "PRESENT":
			return { bg: "#DCFCE7", text: "#16A34A", label: "Present" };
		case "LATE":
			return { bg: "#FEF3C7", text: "#D97706", label: "Late" };
		case "ABSENT_AUTHORISED":
			return { bg: "#FEE2E2", text: "#DC2626", label: "Authorised" };
		case "ABSENT_UNAUTHORISED":
			return { bg: "#FEE2E2", text: "#DC2626", label: "Unauthorised" };
		default:
			return { bg: "#F3F4F6", text: "#6B7280", label: mark.replace(/_/g, " ") };
	}
}

export function AttendanceScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [selectedReason, setSelectedReason] = useState("Sick");
	const [startDate, setStartDate] = useState("");
	const [note, setNote] = useState("");

	const [filterStartDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return d;
	});
	const [filterEndDate] = useState(() => new Date());

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const {
		data: attendanceRecords,
		isLoading: isLoadingAttendance,
		refetch: refetchAttendance,
	} = trpc.attendance.getAttendanceForChild.useQuery(
		{
			childId: selectedChildId ?? "",
			startDate: filterStartDate,
			endDate: filterEndDate,
		},
		{ enabled: !!selectedChildId },
	);

	const reportAbsenceMutation = trpc.attendance.reportAbsence.useMutation({
		onSuccess: () => {
			setStartDate("");
			setNote("");
			Alert.alert("Success", "Absence reported successfully");
			refetchAttendance();
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

	const handleSubmitAbsence = () => {
		if (!selectedChildId || !startDate) {
			Alert.alert("Error", "Please fill in the date");
			return;
		}
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(startDate)) {
			Alert.alert("Error", "Date must be in YYYY-MM-DD format");
			return;
		}
		reportAbsenceMutation.mutate({
			childId: selectedChildId,
			startDate: new Date(startDate),
			endDate: new Date(startDate),
			reason: `${selectedReason}${note ? `: ${note}` : ""}`,
		});
	};

	const selectedChild = children?.find((c) => c.id === selectedChildId);
	const attendancePercentage =
		attendanceRecords && attendanceRecords.length > 0
			? Math.round(
					(attendanceRecords.filter((r) => r.mark === "PRESENT").length /
						attendanceRecords.length) *
						100,
				)
			: 0;

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
								Attendance Hub
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">
								Track and manage attendance
							</Text>
						</View>
						<View className="bg-primary/10 rounded-full px-3 py-1.5">
							<Text className="text-primary font-sans-bold text-sm">{attendancePercentage}%</Text>
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

				{/* Absence Form Card */}
				<View
					className="mx-6 bg-white dark:bg-surface-dark rounded-3xl p-5 mb-6"
					accessibilityLabel="Report Absence"
				>
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Report Absence
					</Text>

					{/* Reason Toggles */}
					<View className="flex-row gap-2 mb-4">
						{reasons.map((r) => (
							<Pressable
								key={r.key}
								onPress={() => setSelectedReason(r.key)}
								accessibilityLabel={r.key}
								className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 min-h-[44px] rounded-full ${
									selectedReason === r.key
										? "bg-white dark:bg-neutral-surface-dark border border-gray-200 dark:border-white/10"
										: "bg-background dark:bg-white/5"
								}`}
								style={{
									shadowColor: selectedReason === r.key ? "#000" : "transparent",
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: selectedReason === r.key ? 0.08 : 0,
									shadowRadius: 4,
									elevation: selectedReason === r.key ? 2 : 0,
								}}
							>
								<MaterialIcons
									name={r.icon}
									size={16}
									color={selectedReason === r.key ? r.color : "#9CA3AF"}
								/>
								<Text
									className={`text-xs font-sans-semibold ${
										selectedReason === r.key ? "text-foreground dark:text-white" : "text-text-muted"
									}`}
								>
									{r.key}
								</Text>
							</Pressable>
						))}
					</View>

					{/* Date Input */}
					<TextInput
						className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans mb-3"
						placeholder="Date (YYYY-MM-DD)"
						placeholderTextColor="#96867f"
						accessibilityLabel="Date"
						testID="date-input"
						value={startDate}
						onChangeText={setStartDate}
					/>

					{/* Note Input */}
					<TextInput
						className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans mb-4 min-h-[80px]"
						placeholder="Optional note..."
						placeholderTextColor="#96867f"
						accessibilityLabel="Reason"
						testID="note-input"
						value={note}
						onChangeText={setNote}
						multiline
						textAlignVertical="top"
					/>

					{/* Submit Button */}
					<Pressable
						onPress={handleSubmitAbsence}
						disabled={reportAbsenceMutation.isPending}
						accessibilityLabel="Submit"
						testID="submit-absence"
						className="h-16 rounded-[40px] flex-row items-center justify-center gap-3"
						style={{ backgroundColor: "#ccfbf1" }}
					>
						<MaterialIcons name="send" size={20} color="#0D9488" />
						<View>
							<Text className="text-base font-sans-extrabold" style={{ color: "#0D9488" }}>
								{reportAbsenceMutation.isPending ? "Submitting..." : "Report Absence"}
							</Text>
							{selectedChild && (
								<Text className="text-xs font-sans" style={{ color: "#5EEAD4" }}>
									to {selectedChild.firstName}'s teacher
								</Text>
							)}
						</View>
					</Pressable>
				</View>

				{/* Recent Records */}
				<View className="px-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Recent Records
					</Text>

					{isLoadingAttendance ? (
						<ActivityIndicator size="small" color="#f56e3d" />
					) : attendanceRecords && attendanceRecords.length > 0 ? (
						<View className="gap-3">
							{attendanceRecords.slice(0, 10).map((item, index) => {
								const markInfo = getMarkColor(item.mark);
								return (
									<View
										key={`${item.session}-${index}`}
										className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
									>
										<View
											className="w-10 h-10 rounded-full items-center justify-center"
											style={{ backgroundColor: markInfo.bg }}
										>
											<MaterialIcons
												name={item.mark === "PRESENT" ? "check-circle" : "cancel"}
												size={20}
												color={markInfo.text}
											/>
										</View>
										<View className="flex-1">
											<Text className="text-sm font-sans-bold text-foreground dark:text-white">
												{new Date(item.date).toLocaleDateString("en-GB", {
													weekday: "short",
													day: "numeric",
													month: "short",
												})}
											</Text>
											<Text className="text-xs font-sans text-text-muted">
												{item.session} Session
											</Text>
										</View>
										<View
											className="rounded-full px-2.5 py-1"
											style={{ backgroundColor: markInfo.bg }}
										>
											<Text className="text-xs font-sans-semibold" style={{ color: markInfo.text }}>
												{markInfo.label}
											</Text>
										</View>
									</View>
								);
							})}
						</View>
					) : (
						<View className="items-center py-10">
							<MaterialIcons name="event-available" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No records found
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
