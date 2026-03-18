import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
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

interface HomeworkCompletion {
	id: string;
	status: string;
	completedAt: Date | null;
}

interface HomeworkAssignment {
	id: string;
	subject: string;
	title: string;
	description: string | null;
	dueDate: Date;
	setDate: Date;
	completions: HomeworkCompletion[];
}

function getDueStatus(
	dueDate: Date,
	completions: HomeworkCompletion[],
): { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap } {
	const isCompleted = completions.some((c) => c.status === "COMPLETED");
	if (isCompleted) {
		return { bg: "#DCFCE7", text: "#16A34A", label: "Done", icon: "check-circle" };
	}

	const now = new Date();
	const due = new Date(dueDate);
	const diffMs = due.getTime() - now.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);

	if (diffDays < 0) {
		return { bg: "#FEE2E2", text: "#DC2626", label: "Overdue", icon: "error" };
	}
	if (diffDays <= 2) {
		return { bg: "#FEF3C7", text: "#D97706", label: "Due Soon", icon: "schedule" };
	}
	return { bg: "#DBEAFE", text: "#3B82F6", label: "Upcoming", icon: "event" };
}

export function HomeworkScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const {
		data: homeworkData,
		isLoading: isLoadingHomework,
		refetch: refetchHomework,
	} = trpc.homework.listForChild.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	const markCompleteMutation = trpc.homework.markComplete.useMutation({
		onSuccess: () => {
			Alert.alert("Success", "Homework marked as done!");
			refetchHomework();
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

	const handleMarkDone = (assignmentId: string) => {
		if (!selectedChildId) return;
		Alert.alert("Mark as Done", "Are you sure this homework is complete?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Yes, Done!",
				onPress: () =>
					markCompleteMutation.mutate({
						assignmentId,
						childId: selectedChildId,
					}),
			},
		]);
	};

	const assignments = (homeworkData?.assignments as HomeworkAssignment[] | undefined) ?? [];

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
								Homework
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">
								Track assignments and progress
							</Text>
						</View>
						<View className="bg-primary/10 rounded-full px-3 py-1.5">
							<Text className="text-primary font-sans-bold text-sm">
								{assignments.length} tasks
							</Text>
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

				{/* Assignments List */}
				<View className="px-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Assignments
					</Text>

					{isLoadingHomework ? (
						<ActivityIndicator size="small" color="#f56e3d" />
					) : assignments.length > 0 ? (
						<View className="gap-4">
							{assignments.map((item) => {
								const status = getDueStatus(item.dueDate, item.completions);
								const isExpanded = expandedId === item.id;
								const isCompleted = item.completions.some((c) => c.status === "COMPLETED");

								return (
									<Pressable
										key={item.id}
										onPress={() => setExpandedId(isExpanded ? null : item.id)}
										accessibilityLabel={item.title}
										className="bg-white dark:bg-surface-dark rounded-3xl p-5"
										style={{
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 2 },
											shadowOpacity: 0.05,
											shadowRadius: 8,
											elevation: 2,
										}}
									>
										{/* Top row */}
										<View className="flex-row items-center gap-3">
											<View
												className="w-10 h-10 rounded-full items-center justify-center"
												style={{ backgroundColor: status.bg }}
											>
												<MaterialIcons name={status.icon} size={20} color={status.text} />
											</View>
											<View className="flex-1">
												<Text className="text-base font-sans-bold text-foreground dark:text-white">
													{item.title}
												</Text>
												<Text className="text-xs font-sans text-text-muted">
													{item.subject} &middot; Due{" "}
													{new Date(item.dueDate).toLocaleDateString("en-GB", {
														weekday: "short",
														day: "numeric",
														month: "short",
													})}
												</Text>
											</View>
											<View
												className="rounded-full px-2.5 py-1"
												style={{ backgroundColor: status.bg }}
											>
												<Text className="text-xs font-sans-semibold" style={{ color: status.text }}>
													{status.label}
												</Text>
											</View>
										</View>

										{/* Expanded content */}
										{isExpanded && (
											<View className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
												{item.description ? (
													<Text className="text-sm font-sans text-foreground dark:text-white mb-4">
														{item.description}
													</Text>
												) : (
													<Text className="text-sm font-sans text-text-muted italic mb-4">
														No description provided
													</Text>
												)}

												<View className="flex-row items-center gap-2 mb-4">
													<MaterialIcons name="event" size={14} color="#96867f" />
													<Text className="text-xs font-sans text-text-muted">
														Set{" "}
														{new Date(item.setDate).toLocaleDateString("en-GB", {
															day: "numeric",
															month: "short",
															year: "numeric",
														})}
													</Text>
												</View>

												{!isCompleted && (
													<Pressable
														onPress={() => handleMarkDone(item.id)}
														disabled={markCompleteMutation.isPending}
														testID={`mark-done-${item.id}`}
														accessibilityLabel="Mark Done"
														className="h-12 rounded-full flex-row items-center justify-center gap-2"
														style={{ backgroundColor: "#DCFCE7" }}
													>
														<MaterialIcons name="check-circle" size={20} color="#16A34A" />
														<Text className="text-sm font-sans-bold" style={{ color: "#16A34A" }}>
															{markCompleteMutation.isPending ? "Saving..." : "Mark Done"}
														</Text>
													</Pressable>
												)}
											</View>
										)}
									</Pressable>
								);
							})}
						</View>
					) : (
						<View className="items-center py-10">
							<MaterialIcons name="assignment-turned-in" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No homework assigned
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
