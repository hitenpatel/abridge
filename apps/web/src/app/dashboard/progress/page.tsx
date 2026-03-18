"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	Award,
	BookOpen,
	CalendarCheck,
	ChevronDown,
	ChevronRight,
	ClipboardCheck,
	Heart,
	Lightbulb,
	RefreshCw,
	TrendingUp,
	Users,
} from "lucide-react";
import { useState } from "react";

interface TemplateMetrics {
	childName: string;
	weekStart: string;
	attendance: { percentage: number; daysPresent: number; daysTotal: number; lateCount: number };
	homework: { completed: number; total: number; overdue: number };
	reading: {
		daysRead: number;
		totalMinutes: number;
		avgMinutes: number;
		currentStreak: number;
		currentBook: string | null;
	};
	achievements: { pointsEarned: number; awardsReceived: number; categories: string[] };
	wellbeing: {
		avgMood: string | null;
		checkInCount: number;
		trend: "improving" | "stable" | "declining" | null;
	};
}

const MOOD_LABELS: Record<string, string> = {
	GREAT: "Great",
	GOOD: "Good",
	OK: "OK",
	LOW: "Low",
	STRUGGLING: "Struggling",
};

const TREND_ICONS: Record<string, string> = {
	improving: "trending up",
	stable: "steady",
	declining: "trending down",
};

function MetricCard({
	icon,
	label,
	value,
	subtitle,
	color,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	subtitle?: string;
	color: string;
}) {
	return (
		<div className={`rounded-lg border p-3 ${color}`}>
			<div className="flex items-center gap-2 mb-1">
				{icon}
				<span className="text-xs font-medium text-muted-foreground">{label}</span>
			</div>
			<p className="text-lg font-bold">{value}</p>
			{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
		</div>
	);
}

function SummaryCard({
	summary,
	defaultExpanded = false,
}: {
	summary: {
		id: string;
		weekStart: string | Date;
		summary: string;
		insight: string | null;
		templateData: unknown;
	};
	defaultExpanded?: boolean;
}) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const metrics = summary.templateData as TemplateMetrics | null;
	const weekDate = new Date(summary.weekStart);

	return (
		<Card>
			<CardHeader
				className="cursor-pointer"
				onClick={() => !defaultExpanded && setExpanded(!expanded)}
			>
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						Week of{" "}
						{weekDate.toLocaleDateString("en-GB", {
							day: "numeric",
							month: "long",
							year: "numeric",
						})}
					</CardTitle>
					{!defaultExpanded &&
						(expanded ? (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronRight className="h-4 w-4 text-muted-foreground" />
						))}
				</div>
			</CardHeader>
			{(expanded || defaultExpanded) && (
				<CardContent className="space-y-4">
					{/* Metrics Grid */}
					{metrics && (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
							<MetricCard
								icon={<CalendarCheck className="h-4 w-4 text-blue-600" />}
								label="Attendance"
								value={`${metrics.attendance.percentage}%`}
								subtitle={`${metrics.attendance.daysPresent}/${metrics.attendance.daysTotal} days`}
								color="bg-blue-50"
							/>
							<MetricCard
								icon={<ClipboardCheck className="h-4 w-4 text-green-600" />}
								label="Homework"
								value={`${metrics.homework.completed}/${metrics.homework.total}`}
								subtitle={
									metrics.homework.overdue > 0
										? `${metrics.homework.overdue} overdue`
										: "All on track"
								}
								color="bg-green-50"
							/>
							<MetricCard
								icon={<BookOpen className="h-4 w-4 text-amber-600" />}
								label="Reading Streak"
								value={`${metrics.reading.currentStreak} days`}
								subtitle={
									metrics.reading.currentBook
										? `Reading: ${metrics.reading.currentBook}`
										: `${metrics.reading.avgMinutes} min/day avg`
								}
								color="bg-amber-50"
							/>
							<MetricCard
								icon={<Award className="h-4 w-4 text-purple-600" />}
								label="Achievements"
								value={`${metrics.achievements.pointsEarned} pts`}
								subtitle={
									metrics.achievements.categories.length > 0
										? metrics.achievements.categories.join(", ")
										: "No awards this week"
								}
								color="bg-purple-50"
							/>
							<MetricCard
								icon={<Heart className="h-4 w-4 text-rose-600" />}
								label="Wellbeing"
								value={
									metrics.wellbeing.avgMood
										? MOOD_LABELS[metrics.wellbeing.avgMood] || metrics.wellbeing.avgMood
										: "N/A"
								}
								subtitle={
									metrics.wellbeing.trend
										? TREND_ICONS[metrics.wellbeing.trend]
										: `${metrics.wellbeing.checkInCount} check-ins`
								}
								color="bg-rose-50"
							/>
						</div>
					)}

					{/* AI Insight Callout */}
					{summary.insight && (
						<div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
							<div className="flex items-start gap-2">
								<Lightbulb className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm font-medium text-indigo-900">AI Insight</p>
									<p className="text-sm text-indigo-700 mt-1">{summary.insight}</p>
								</div>
							</div>
						</div>
					)}

					{/* Full Summary Text */}
					<div className="rounded-md bg-muted/50 p-4">
						<p className="text-sm whitespace-pre-line">{summary.summary}</p>
					</div>
				</CardContent>
			)}
		</Card>
	);
}

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);

	const childId = selectedChild ?? children?.[0]?.child?.id;

	const { data: latestSummary, isLoading: latestLoading } =
		trpc.progressSummary.getLatestSummary.useQuery(
			{ childId: childId ?? "" },
			{ enabled: !!childId },
		);

	const { data: historyData, isLoading: historyLoading } =
		trpc.progressSummary.getSummaryHistory.useQuery(
			{ childId: childId ?? "", limit: 10 },
			{ enabled: !!childId },
		);

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	const history = historyData?.items ?? [];
	// Filter out the latest from history to avoid duplication
	const pastSummaries = latestSummary ? history.filter((s) => s.id !== latestSummary.id) : history;

	return (
		<div className="space-y-6">
			{/* Child Selector */}
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<Button
							key={pc.child.id}
							type="button"
							size="sm"
							variant={childId === pc.child.id ? "default" : "outline"}
							onClick={() => setSelectedChild(pc.child.id)}
						>
							{pc.child.firstName}
						</Button>
					))}
				</div>
			)}

			{/* Latest Summary */}
			{latestLoading ? (
				<Skeleton className="h-64 w-full" />
			) : latestSummary ? (
				<div>
					<h2 className="text-lg font-semibold mb-3">Latest Summary</h2>
					<SummaryCard summary={latestSummary} defaultExpanded />
				</div>
			) : (
				<Card>
					<CardContent className="py-8 text-center">
						<TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
						<p className="text-muted-foreground">
							No progress summaries available yet. Summaries are generated weekly.
						</p>
					</CardContent>
				</Card>
			)}

			{/* History */}
			{pastSummaries.length > 0 && (
				<div>
					<h2 className="text-lg font-semibold mb-3">Previous Weeks</h2>
					<div className="space-y-3">
						{historyLoading ? (
							<Skeleton className="h-16 w-full" />
						) : (
							pastSummaries.map((summary) => <SummaryCard key={summary.id} summary={summary} />)
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [generating, setGenerating] = useState(false);

	const { data: children } = trpc.user.listChildren.useQuery();

	// For staff, we use a simple approach: list children from school
	// The router will handle authorization
	const { data: childSummary, isLoading: summaryLoading } =
		trpc.progressSummary.getLatestSummary.useQuery(
			{ childId: selectedChildId ?? "" },
			{ enabled: !!selectedChildId },
		);

	const generateBatch = trpc.progressSummary.generateWeeklyBatch.useMutation({
		onMutate: () => setGenerating(true),
		onSettled: () => setGenerating(false),
	});

	return (
		<div className="space-y-6">
			{/* Generate Button */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Class Overview
						</CardTitle>
						<Button
							type="button"
							onClick={() => generateBatch.mutate({ schoolId })}
							disabled={generating}
							className="flex items-center gap-2"
						>
							<RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
							{generating ? "Generating..." : "Generate Summaries"}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{generateBatch.isSuccess && (
						<div className="rounded-md bg-green-50 border border-green-200 p-3 mb-4">
							<p className="text-sm text-green-700">
								Summary generation started for {generateBatch.data?.childCount ?? 0} children.
							</p>
						</div>
					)}
					{generateBatch.isError && (
						<div className="rounded-md bg-red-50 border border-red-200 p-3 mb-4">
							<p className="text-sm text-red-700">Failed to start generation. Please try again.</p>
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Click "Generate Summaries" to create weekly progress summaries for all children in your
						school. This runs in the background.
					</p>
				</CardContent>
			</Card>

			{/* Selected Child Detail */}
			{selectedChildId && (
				<div>
					<div className="flex items-center gap-2 mb-3">
						<button
							type="button"
							onClick={() => setSelectedChildId(null)}
							className="text-sm text-primary hover:underline"
						>
							Back to overview
						</button>
					</div>
					{summaryLoading ? (
						<Skeleton className="h-64 w-full" />
					) : childSummary ? (
						<SummaryCard summary={childSummary} defaultExpanded />
					) : (
						<Card>
							<CardContent className="py-8 text-center">
								<p className="text-muted-foreground">No summary available for this child yet.</p>
							</CardContent>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}

export default function ProgressPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.progressSummariesEnabled) {
		return <FeatureDisabled featureName="Progress Summaries" />;
	}

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={TrendingUp}
					title="Progress"
					description={
						isStaff
							? "View and generate weekly progress summaries"
							: "Weekly progress summaries for your children"
					}
				/>

				{isStaff && session.schoolId ? <StaffView schoolId={session.schoolId} /> : <ParentView />}
			</div>
		</PageShell>
	);
}
