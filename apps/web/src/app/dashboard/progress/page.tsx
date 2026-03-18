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

function Sparkline({
	data,
	color,
	height = 40,
	width = 120,
}: { data: number[]; color: string; height?: number; width?: number }) {
	if (data.length < 2) return null;
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min || 1;
	const padding = 2;
	const stepX = (width - padding * 2) / (data.length - 1);

	const points = data
		.map((v, i) => {
			const x = padding + i * stepX;
			const y = height - padding - ((v - min) / range) * (height - padding * 2);
			return `${x},${y}`;
		})
		.join(" ");

	return (
		<svg
			width={width}
			height={height}
			className="inline-block"
			role="img"
			aria-label="Trend sparkline"
		>
			<title>Trend sparkline</title>
			<polyline
				points={points}
				fill="none"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{data.length > 0 &&
				(() => {
					const lastVal = data[data.length - 1] ?? 0;
					const lastX = padding + (data.length - 1) * stepX;
					const lastY = height - padding - ((lastVal - min) / range) * (height - padding * 2);
					return <circle cx={lastX} cy={lastY} r={3} fill={color} />;
				})()}
		</svg>
	);
}

function TrendSection({
	summaries,
}: { summaries: Array<{ templateData: unknown; weekStart: string | Date }> }) {
	const sorted = [...summaries].reverse(); // oldest first
	if (sorted.length < 2) return null;

	const metrics = sorted
		.map((s) => s.templateData as TemplateMetrics | null)
		.filter((m): m is TemplateMetrics => m !== null);

	if (metrics.length < 2) return null;

	const attendanceData = metrics.map((m) => m.attendance.percentage);
	const homeworkData = metrics.map((m) =>
		m.homework.total > 0 ? Math.round((m.homework.completed / m.homework.total) * 100) : 0,
	);
	const readingData = metrics.map((m) => m.reading.currentStreak);

	const latest = metrics.at(-1);
	const prev = metrics.at(-2);

	if (!latest || !prev) return null;

	const delta = (curr: number, previous: number) => {
		const diff = curr - previous;
		if (diff === 0) return null;
		return diff > 0 ? `+${diff}` : `${diff}`;
	};

	const attDelta = delta(latest.attendance.percentage, prev.attendance.percentage);
	const hwCurr =
		latest.homework.total > 0
			? Math.round((latest.homework.completed / latest.homework.total) * 100)
			: 0;
	const hwPrev =
		prev.homework.total > 0 ? Math.round((prev.homework.completed / prev.homework.total) * 100) : 0;
	const hwDelta = delta(hwCurr, hwPrev);
	const readDelta = delta(latest.reading.currentStreak, prev.reading.currentStreak);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base flex items-center gap-2">
					<TrendingUp className="h-4 w-4" />
					Trends ({metrics.length} weeks)
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
					<div className="flex items-center gap-3">
						<div>
							<p className="text-xs text-muted-foreground mb-1">Attendance</p>
							<div className="flex items-center gap-2">
								<Sparkline data={attendanceData} color="#2563eb" />
								{attDelta && (
									<span
										className={`text-xs font-medium ${Number(attDelta) > 0 ? "text-green-600" : "text-red-600"}`}
									>
										{attDelta}%
									</span>
								)}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div>
							<p className="text-xs text-muted-foreground mb-1">Homework</p>
							<div className="flex items-center gap-2">
								<Sparkline data={homeworkData} color="#16a34a" />
								{hwDelta && (
									<span
										className={`text-xs font-medium ${Number(hwDelta) > 0 ? "text-green-600" : "text-red-600"}`}
									>
										{hwDelta}%
									</span>
								)}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<div>
							<p className="text-xs text-muted-foreground mb-1">Reading Streak</p>
							<div className="flex items-center gap-2">
								<Sparkline data={readingData} color="#d97706" />
								{readDelta && (
									<span
										className={`text-xs font-medium ${Number(readDelta) > 0 ? "text-green-600" : "text-red-600"}`}
									>
										{readDelta} days
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
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

			{/* Trends */}
			{history.length >= 2 && <TrendSection summaries={history} />}

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
	const [yearFilter, setYearFilter] = useState<string>("all");
	const utils = trpc.useUtils();

	const { data: schoolChildren, isLoading: childrenLoading } =
		trpc.progressSummary.listChildrenWithSummaryStatus.useQuery({ schoolId });

	const { data: childSummary, isLoading: summaryLoading } =
		trpc.progressSummary.getLatestSummary.useQuery(
			{ childId: selectedChildId ?? "" },
			{ enabled: !!selectedChildId },
		);

	const { data: historyData } = trpc.progressSummary.getSummaryHistory.useQuery(
		{ childId: selectedChildId ?? "", limit: 10 },
		{ enabled: !!selectedChildId },
	);

	const generateBatch = trpc.progressSummary.generateWeeklyBatch.useMutation({
		onMutate: () => setGenerating(true),
		onSettled: () => {
			setGenerating(false);
			utils.progressSummary.listChildrenWithSummaryStatus.invalidate({ schoolId });
		},
	});

	// Get unique year groups for filtering
	const yearGroups = schoolChildren
		? [...new Set(schoolChildren.map((c) => c.yearGroup).filter(Boolean))].sort()
		: [];

	const filteredChildren =
		yearFilter === "all"
			? schoolChildren
			: schoolChildren?.filter((c) => c.yearGroup === yearFilter);

	const summaryCount = schoolChildren?.filter((c) => c.hasSummaryThisWeek).length ?? 0;
	const totalCount = schoolChildren?.length ?? 0;

	// Child detail view
	if (selectedChildId) {
		const selectedChild = schoolChildren?.find((c) => c.id === selectedChildId);
		const history = historyData?.items ?? [];
		const pastSummaries = childSummary ? history.filter((s) => s.id !== childSummary.id) : history;

		return (
			<div className="space-y-6">
				<button
					type="button"
					onClick={() => setSelectedChildId(null)}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ChevronRight className="h-4 w-4 rotate-180" />
					Back to class overview
				</button>

				{selectedChild && (
					<h2 className="text-lg font-semibold">
						{selectedChild.firstName} {selectedChild.lastName}
						{selectedChild.yearGroup && (
							<span className="text-sm font-normal text-muted-foreground ml-2">
								{selectedChild.yearGroup}
								{selectedChild.className && ` - ${selectedChild.className}`}
							</span>
						)}
					</h2>
				)}

				{summaryLoading ? (
					<Skeleton className="h-64 w-full" />
				) : childSummary ? (
					<SummaryCard summary={childSummary} defaultExpanded />
				) : (
					<Card>
						<CardContent className="py-8 text-center">
							<TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
							<p className="text-muted-foreground">
								No summary available for this child yet. Try generating summaries first.
							</p>
						</CardContent>
					</Card>
				)}

				{pastSummaries.length > 0 && (
					<div>
						<h3 className="text-base font-semibold mb-3">Previous Weeks</h3>
						<div className="space-y-3">
							{pastSummaries.map((summary) => (
								<SummaryCard key={summary.id} summary={summary} />
							))}
						</div>
					</div>
				)}
			</div>
		);
	}

	// Class overview
	return (
		<div className="space-y-6">
			{/* Generate + Stats */}
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
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span>
							{summaryCount}/{totalCount} children have summaries this week
						</span>
						{totalCount > 0 && (
							<div className="flex-1 max-w-xs h-2 bg-muted rounded-full overflow-hidden">
								<div
									className="h-full bg-primary rounded-full transition-all"
									style={{ width: `${(summaryCount / totalCount) * 100}%` }}
								/>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Year Group Filter */}
			{yearGroups.length > 1 && (
				<div className="flex gap-2 flex-wrap">
					<Button
						size="sm"
						variant={yearFilter === "all" ? "default" : "outline"}
						onClick={() => setYearFilter("all")}
					>
						All
					</Button>
					{yearGroups.map((yg) => (
						<Button
							key={yg}
							size="sm"
							variant={yearFilter === yg ? "default" : "outline"}
							onClick={() => setYearFilter(yg ?? "all")}
						>
							{yg}
						</Button>
					))}
				</div>
			)}

			{/* Children List */}
			<Card>
				<CardContent className="pt-6">
					{childrenLoading && <Skeleton className="h-48 w-full" />}
					{!childrenLoading && (!filteredChildren || filteredChildren.length === 0) && (
						<p className="text-sm text-muted-foreground text-center py-4">
							No children found in this school.
						</p>
					)}
					<div className="space-y-2">
						{filteredChildren?.map((child) => (
							<button
								key={child.id}
								type="button"
								onClick={() => setSelectedChildId(child.id)}
								className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-orange-50/40 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
										{child.firstName[0]}
										{child.lastName[0]}
									</div>
									<div>
										<p className="font-medium">
											{child.firstName} {child.lastName}
										</p>
										<p className="text-xs text-muted-foreground">
											{child.yearGroup}
											{child.className && ` - ${child.className}`}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{child.hasSummaryThisWeek ? (
										<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
											Summary ready
										</span>
									) : (
										<span className="inline-flex items-center rounded-full bg-orange-100/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
											No summary
										</span>
									)}
									<ChevronRight className="h-4 w-4 text-muted-foreground" />
								</div>
							</button>
						))}
					</div>
				</CardContent>
			</Card>
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
