import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChildSelector } from "../components/ChildSelector";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface Child {
	id: string;
	firstName: string;
	lastName: string;
}

interface ChildWrapper {
	child: Child;
}

interface SubjectGrade {
	id: string;
	subject: string;
	level: string | null;
	effort: string | null;
	currentGrade: string | null;
	targetGrade: string | null;
	comment: string | null;
}

interface ReportCycle {
	id: string;
	name: string;
	type: string;
	assessmentModel: string;
	publishDate: Date;
}

interface ReportCard {
	id: string;
	generalComment: string | null;
	attendancePct: number | null;
	cycle: ReportCycle;
	subjectGrades: SubjectGrade[];
}

function formatCycleType(type: string): string {
	switch (type) {
		case "TERMLY":
			return "Termly";
		case "HALF_TERMLY":
			return "Half Termly";
		case "END_OF_YEAR":
			return "End of Year";
		case "MOCK":
			return "Mock";
		case "CUSTOM":
			return "Custom";
		default:
			return type;
	}
}

function getCycleTypeColor(type: string): { bg: string; text: string } {
	switch (type) {
		case "END_OF_YEAR":
			return { bg: "#FEF3C7", text: "#D97706" };
		case "TERMLY":
			return { bg: "#DBEAFE", text: "#2563EB" };
		case "HALF_TERMLY":
			return { bg: "#EDE9FE", text: "#7C3AED" };
		case "MOCK":
			return { bg: "#FCE7F3", text: "#DB2777" };
		default:
			return { bg: "#F3F4F6", text: "#6B7280" };
	}
}

function formatLevel(level: string | null): string {
	if (!level) return "";
	switch (level) {
		case "EMERGING":
			return "Emerging";
		case "DEVELOPING":
			return "Developing";
		case "EXPECTED":
			return "Expected";
		case "EXCEEDING":
			return "Exceeding";
		default:
			return level;
	}
}

function getLevelColor(level: string | null): string {
	switch (level) {
		case "EXCEEDING":
			return "#16A34A";
		case "EXPECTED":
			return "#2563EB";
		case "DEVELOPING":
			return "#D97706";
		case "EMERGING":
			return "#DC2626";
		default:
			return "#6B7280";
	}
}

function formatEffort(effort: string | null): string {
	if (!effort) return "";
	switch (effort) {
		case "OUTSTANDING":
			return "Outstanding";
		case "GOOD":
			return "Good";
		case "SATISFACTORY":
			return "Satisfactory";
		case "NEEDS_IMPROVEMENT":
			return "Needs Improvement";
		default:
			return effort;
	}
}

function getEffortIcon(effort: string | null): keyof typeof MaterialIcons.glyphMap {
	switch (effort) {
		case "OUTSTANDING":
			return "star";
		case "GOOD":
			return "thumb-up";
		case "SATISFACTORY":
			return "check-circle";
		case "NEEDS_IMPROVEMENT":
			return "trending-up";
		default:
			return "remove";
	}
}

function getEffortColor(effort: string | null): string {
	switch (effort) {
		case "OUTSTANDING":
			return "#D97706";
		case "GOOD":
			return "#16A34A";
		case "SATISFACTORY":
			return "#2563EB";
		case "NEEDS_IMPROVEMENT":
			return "#DC2626";
		default:
			return "#9CA3AF";
	}
}

interface SubjectGradeCardProps {
	grade: SubjectGrade;
	assessmentModel: string;
}

function SubjectGradeCard({ grade, assessmentModel }: SubjectGradeCardProps) {
	const isSecondary = assessmentModel === "SECONDARY_GRADES";

	return (
		<View
			className="bg-white dark:bg-surface-dark rounded-2xl p-4 mb-3"
			style={{
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.04,
				shadowRadius: 4,
				elevation: 1,
			}}
		>
			<View className="flex-row items-center justify-between mb-2">
				<Text className="text-base font-sans-bold text-foreground dark:text-white flex-1 mr-2">
					{grade.subject}
				</Text>
				{isSecondary ? (
					<View className="flex-row gap-2">
						{grade.currentGrade && (
							<View className="bg-blue-50 rounded-full px-2.5 py-0.5">
								<Text className="text-xs font-sans-bold text-blue-700">{grade.currentGrade}</Text>
							</View>
						)}
						{grade.targetGrade && (
							<View className="bg-purple-50 rounded-full px-2.5 py-0.5">
								<Text className="text-xs font-sans text-purple-600">
									Target: {grade.targetGrade}
								</Text>
							</View>
						)}
					</View>
				) : (
					grade.level && (
						<View
							className="rounded-full px-2.5 py-0.5"
							style={{ backgroundColor: `${getLevelColor(grade.level)}20` }}
						>
							<Text
								className="text-xs font-sans-bold"
								style={{ color: getLevelColor(grade.level) }}
							>
								{formatLevel(grade.level)}
							</Text>
						</View>
					)
				)}
			</View>

			{grade.effort && (
				<View className="flex-row items-center gap-1.5 mb-2">
					<MaterialIcons
						name={getEffortIcon(grade.effort)}
						size={14}
						color={getEffortColor(grade.effort)}
					/>
					<Text className="text-xs font-sans text-text-muted">
						Effort:{" "}
						<Text className="font-sans-semibold" style={{ color: getEffortColor(grade.effort) }}>
							{formatEffort(grade.effort)}
						</Text>
					</Text>
				</View>
			)}

			{grade.comment && (
				<Text className="text-sm font-sans text-foreground dark:text-white leading-5 mt-1">
					{grade.comment}
				</Text>
			)}
		</View>
	);
}

interface ReportCardSectionProps {
	report: ReportCard;
	expanded: boolean;
	onToggle: () => void;
}

function ReportCardSection({ report, expanded, onToggle }: ReportCardSectionProps) {
	const cycleColor = getCycleTypeColor(report.cycle.type);
	const publishDate = new Date(report.cycle.publishDate).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

	return (
		<View
			className="bg-neutral-surface dark:bg-surface-dark rounded-3xl mb-4 overflow-hidden"
			style={{
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.06,
				shadowRadius: 8,
				elevation: 2,
			}}
		>
			<TouchableOpacity
				onPress={onToggle}
				activeOpacity={0.7}
				accessibilityLabel={report.cycle.name}
				className="p-5"
			>
				<View className="flex-row items-start gap-3">
					<View className="bg-primary/10 w-10 h-10 rounded-full items-center justify-center mt-0.5">
						<MaterialIcons name="description" size={20} color="#f56e3d" />
					</View>
					<View className="flex-1">
						<Text className="text-base font-sans-bold text-foreground dark:text-white">
							{report.cycle.name}
						</Text>
						<View className="flex-row items-center gap-2 mt-1">
							<View className="rounded-full px-2 py-0.5" style={{ backgroundColor: cycleColor.bg }}>
								<Text className="text-xs font-sans-semibold" style={{ color: cycleColor.text }}>
									{formatCycleType(report.cycle.type)}
								</Text>
							</View>
							<View className="flex-row items-center gap-1">
								<MaterialIcons name="calendar-today" size={12} color="#96867f" />
								<Text className="text-xs font-sans text-text-muted">{publishDate}</Text>
							</View>
						</View>
						{report.subjectGrades.length > 0 && (
							<Text className="text-xs font-sans text-text-muted mt-1">
								{report.subjectGrades.length} subject{report.subjectGrades.length !== 1 ? "s" : ""}
							</Text>
						)}
					</View>
					<MaterialIcons
						name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
						size={22}
						color="#96867f"
					/>
				</View>
			</TouchableOpacity>

			{expanded && (
				<View className="px-5 pb-5 border-t border-orange-100 dark:border-white/10 pt-4">
					{report.attendancePct != null && (
						<View className="flex-row items-center gap-2 mb-4">
							<MaterialIcons name="check-circle" size={16} color="#16A34A" />
							<Text className="text-sm font-sans text-text-muted">
								Attendance:{" "}
								<Text className="font-sans-bold text-green-700">{report.attendancePct}%</Text>
							</Text>
						</View>
					)}

					{report.subjectGrades.length > 0 ? (
						<>
							<Text className="text-xs font-sans-bold uppercase tracking-wider text-text-muted mb-3">
								Subject Grades
							</Text>
							{report.subjectGrades.map((grade) => (
								<SubjectGradeCard
									key={grade.id}
									grade={grade}
									assessmentModel={report.cycle.assessmentModel}
								/>
							))}
						</>
					) : (
						<View className="items-center py-6">
							<Text className="text-text-muted font-sans text-sm">No subject grades recorded</Text>
						</View>
					)}

					{report.generalComment && (
						<View className="mt-2">
							<Text className="text-xs font-sans-bold uppercase tracking-wider text-text-muted mb-2">
								General Comment
							</Text>
							<View className="bg-primary/5 rounded-2xl p-4">
								<Text className="text-sm font-sans text-foreground dark:text-white leading-5">
									{report.generalComment}
								</Text>
							</View>
						</View>
					)}
				</View>
			)}
		</View>
	);
}

export function ReportCardsScreen() {
	const insets = useSafeAreaInsets();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const {
		data: reports,
		isLoading: isLoadingReports,
		refetch,
		isRefetching,
	} = trpc.reportCard.listReportsForChild.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	useEffect(() => {
		if (children && children.length > 0 && !selectedChildId) {
			const firstChild = children[0];
			if (firstChild) setSelectedChildId(firstChild.id);
		}
	}, [children, selectedChildId]);

	const reportList = (reports as ReportCard[] | undefined) ?? [];

	if (isLoadingChildren) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<View testID="report-cards-screen" className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f56e3d" />
				}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<View className="flex-row items-center justify-between">
						<View>
							<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
								Report Cards
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">
								View published school reports
							</Text>
						</View>
						{!isLoadingReports && reportList.length > 0 && (
							<View className="bg-primary/10 rounded-full px-3 py-1.5">
								<Text className="text-primary font-sans-bold text-sm">
									{reportList.length} report{reportList.length !== 1 ? "s" : ""}
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
							onSelect={(id) => {
								setSelectedChildId(id);
								setExpandedId(null);
							}}
						/>
					</View>
				)}

				{/* Report List */}
				<View className="px-6">
					{isLoadingReports ? (
						<View className="gap-4">
							<Skeleton className="h-24 w-full rounded-3xl" />
							<Skeleton className="h-24 w-full rounded-3xl" />
							<Skeleton className="h-24 w-full rounded-3xl" />
						</View>
					) : reportList.length > 0 ? (
						<>
							<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
								Published Reports
							</Text>
							{reportList.map((report) => (
								<ReportCardSection
									key={report.id}
									report={report}
									expanded={expandedId === report.id}
									onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
								/>
							))}
						</>
					) : (
						<View className="items-center py-20">
							<MaterialIcons name="description" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4 text-center">
								No report cards available
							</Text>
							<Text className="text-text-muted font-sans text-sm mt-1 text-center">
								Reports will appear here once published by the school
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
