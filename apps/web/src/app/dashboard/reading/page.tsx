"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { BookOpen, ChevronLeft, Flame, MessageSquare, PenLine, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";

const READ_WITH_OPTIONS = ["ALONE", "PARENT", "TEACHER", "SIBLING", "OTHER"] as const;

const READ_WITH_LABELS: Record<string, string> = {
	ALONE: "Alone",
	PARENT: "With Parent",
	TEACHER: "With Teacher",
	SIBLING: "With Sibling",
	OTHER: "Other",
};

function getMonday(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function getSunday(monday: Date): Date {
	const d = new Date(monday);
	d.setDate(d.getDate() + 6);
	d.setHours(23, 59, 59, 999);
	return d;
}

function formatDate(date: Date): string {
	return new Date(date).toLocaleDateString("en-GB", {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
}

function todayString(): string {
	const d = new Date();
	return d.toISOString().split("T")[0] ?? "";
}

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);
	const [showLogForm, setShowLogForm] = useState(false);

	// Log form state
	const [logDate, setLogDate] = useState(todayString());
	const [logBookTitle, setLogBookTitle] = useState("");
	const [logPagesOrChapter, setLogPagesOrChapter] = useState("");
	const [logMinutes, setLogMinutes] = useState("");
	const [logReadWith, setLogReadWith] = useState<(typeof READ_WITH_OPTIONS)[number]>("PARENT");
	const [logComment, setLogComment] = useState("");

	const childId = selectedChild ?? children?.[0]?.child?.id;

	const weekStart = useMemo(() => getMonday(new Date()), []);
	const weekEnd = useMemo(() => getSunday(weekStart), [weekStart]);

	const { data: diary, isLoading: diaryLoading } = trpc.readingDiary.getDiary.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	const { data: entries, isLoading: entriesLoading } = trpc.readingDiary.getEntries.useQuery(
		{ childId: childId ?? "", startDate: weekStart, endDate: weekEnd },
		{ enabled: !!childId },
	);

	const { data: stats, isLoading: statsLoading } = trpc.readingDiary.getStats.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	const utils = trpc.useUtils();

	const logReadingMutation = trpc.readingDiary.logReading.useMutation({
		onSuccess: () => {
			if (childId) {
				utils.readingDiary.getEntries.invalidate({
					childId,
					startDate: weekStart,
					endDate: weekEnd,
				});
				utils.readingDiary.getStats.invalidate({ childId });
				utils.readingDiary.getDiary.invalidate({ childId });
			}
			setShowLogForm(false);
			setLogDate(todayString());
			setLogBookTitle("");
			setLogPagesOrChapter("");
			setLogMinutes("");
			setLogReadWith("PARENT");
			setLogComment("");
		},
	});

	// Weekly calendar strip data
	const entryDates = useMemo(() => {
		if (!entries) return new Set<string>();
		return new Set(entries.map((e) => new Date(e.date).toISOString().slice(0, 10)));
	}, [entries]);

	const weekDays = useMemo(() => {
		const days: { date: Date; label: string; dateStr: string }[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStart);
			d.setDate(d.getDate() + i);
			days.push({
				date: d,
				label: d.toLocaleDateString("en-GB", { weekday: "short" }),
				dateStr: d.toISOString().slice(0, 10),
			});
		}
		return days;
	}, [weekStart]);

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	const handleSubmitLog = () => {
		if (!childId || !logBookTitle.trim()) return;
		logReadingMutation.mutate({
			childId,
			date: new Date(`${logDate}T00:00:00`),
			bookTitle: logBookTitle.trim(),
			pagesOrChapter: logPagesOrChapter.trim() || undefined,
			minutesRead: logMinutes ? Number.parseInt(logMinutes, 10) : undefined,
			readWith: logReadWith,
			parentComment: logComment.trim() || undefined,
		});
	};

	return (
		<div className="space-y-6">
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<Button
							key={pc.child.id}
							size="sm"
							variant={childId === pc.child.id ? "default" : "outline"}
							onClick={() => setSelectedChild(pc.child.id)}
						>
							{pc.child.firstName}
						</Button>
					))}
				</div>
			)}

			{/* Current Book & Reading Level */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						Current Reading
					</CardTitle>
				</CardHeader>
				<CardContent>
					{diaryLoading ? (
						<Skeleton className="h-16 w-full" />
					) : diary ? (
						<div className="flex items-center gap-4">
							<div className="flex-1">
								<p className="text-sm font-medium">{diary.currentBook || "No book set"}</p>
								{diary.targetMinsPerDay && (
									<p className="text-xs text-muted-foreground">
										Target: {diary.targetMinsPerDay} mins/day
									</p>
								)}
							</div>
							{diary.readingLevel && (
								<Badge className="bg-purple-100 text-purple-800">Level: {diary.readingLevel}</Badge>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No reading diary set up yet. Log your first reading to get started!
						</p>
					)}
				</CardContent>
			</Card>

			{/* Streak & Weekly Calendar */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Flame className="h-5 w-5" />
						This Week
					</CardTitle>
				</CardHeader>
				<CardContent>
					{statsLoading ? (
						<Skeleton className="h-24 w-full" />
					) : (
						<div className="space-y-4">
							{(stats?.currentStreak ?? 0) > 0 && (
								<div className="text-center">
									<span className="text-2xl font-bold">
										{stats?.currentStreak} days in a row! 🔥
									</span>
								</div>
							)}
							<div className="grid grid-cols-7 gap-1">
								{weekDays.map((day) => {
									const hasEntry = entryDates.has(day.dateStr);
									const isToday = day.dateStr === todayString();
									return (
										<div
											key={day.dateStr}
											className={`flex flex-col items-center rounded-md border px-1 py-2 min-w-0 ${
												hasEntry
													? "bg-green-100 border-green-300"
													: isToday
														? "border-primary border-2"
														: "border-orange-100/60"
											}`}
										>
											<span className="text-[10px] sm:text-xs font-medium truncate">
												{day.label}
											</span>
											<span className="text-[10px] sm:text-xs text-muted-foreground">
												{day.date.getDate()}
											</span>
											{hasEntry && (
												<span className="text-green-600 text-[10px] sm:text-xs mt-1">✓</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Log Reading Form */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<PenLine className="h-5 w-5" />
						Log Reading
					</CardTitle>
				</CardHeader>
				<CardContent>
					{!showLogForm ? (
						<Button
							onClick={() => {
								setLogBookTitle(diary?.currentBook ?? "");
								setShowLogForm(true);
							}}
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Log Reading Session
						</Button>
					) : (
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div>
									<label className="text-sm font-medium" htmlFor="log-date">
										Date
									</label>
									<input
										id="log-date"
										type="date"
										value={logDate}
										onChange={(e) => setLogDate(e.target.value)}
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="log-book">
										Book Title
									</label>
									<input
										id="log-book"
										type="text"
										value={logBookTitle}
										onChange={(e) => setLogBookTitle(e.target.value)}
										placeholder="e.g. Charlotte's Web"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="log-pages">
										Pages / Chapter
									</label>
									<input
										id="log-pages"
										type="text"
										value={logPagesOrChapter}
										onChange={(e) => setLogPagesOrChapter(e.target.value)}
										placeholder="e.g. Ch. 3 or pp. 15-20"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="log-minutes">
										Minutes
									</label>
									<input
										id="log-minutes"
										type="number"
										min="1"
										value={logMinutes}
										onChange={(e) => setLogMinutes(e.target.value)}
										placeholder="15"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
							</div>

							<div>
								<label className="text-sm font-medium" htmlFor="log-readwith">
									Read With
								</label>
								<select
									id="log-readwith"
									value={logReadWith}
									onChange={(e) =>
										setLogReadWith(e.target.value as (typeof READ_WITH_OPTIONS)[number])
									}
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								>
									{READ_WITH_OPTIONS.map((opt) => (
										<option key={opt} value={opt}>
											{READ_WITH_LABELS[opt]}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-sm font-medium" htmlFor="log-comment">
									Comment
								</label>
								<Textarea
									id="log-comment"
									value={logComment}
									onChange={(e) => setLogComment(e.target.value)}
									placeholder="How did the reading go?"
									maxLength={500}
									className="mt-1"
									rows={3}
								/>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={handleSubmitLog}
									disabled={!logBookTitle.trim() || logReadingMutation.isPending}
									size="sm"
								>
									{logReadingMutation.isPending ? "Saving..." : "Save Entry"}
								</Button>
								<Button variant="outline" size="sm" onClick={() => setShowLogForm(false)}>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Stats */}
			<Card>
				<CardHeader>
					<CardTitle>Reading Stats</CardTitle>
				</CardHeader>
				<CardContent>
					{statsLoading ? (
						<Skeleton className="h-16 w-full" />
					) : stats ? (
						<div className="grid grid-cols-3 gap-4 text-center">
							<div>
								<p className="text-2xl font-bold">{stats.totalEntriesThisTerm}</p>
								<p className="text-xs text-muted-foreground">Total Entries</p>
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.avgMinutes}</p>
								<p className="text-xs text-muted-foreground">Avg Minutes</p>
							</div>
							<div>
								<p className="text-2xl font-bold">{stats.daysReadThisWeek}</p>
								<p className="text-xs text-muted-foreground">Days This Week</p>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No stats available yet.</p>
					)}
				</CardContent>
			</Card>

			{/* Entry List */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Entries</CardTitle>
				</CardHeader>
				<CardContent>
					{entriesLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !entries?.length ? (
						<p className="text-sm text-muted-foreground">No entries this week.</p>
					) : (
						<div className="space-y-3">
							{entries.map((entry) => (
								<div key={entry.id} className="rounded-md border p-3 space-y-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium">{formatDate(entry.date)}</span>
										<Badge className="bg-blue-100 text-blue-800">
											{READ_WITH_LABELS[entry.readWith] ?? entry.readWith}
										</Badge>
										{entry.minutesRead && (
											<span className="text-xs text-muted-foreground">{entry.minutesRead} min</span>
										)}
									</div>
									<p className="text-sm">{entry.bookTitle}</p>
									{entry.pagesOrChapter && (
										<p className="text-xs text-muted-foreground">{entry.pagesOrChapter}</p>
									)}
									{entry.parentComment && (
										<p className="text-sm text-muted-foreground italic">"{entry.parentComment}"</p>
									)}
									{entry.teacherComment && (
										<div className="flex items-start gap-1.5 mt-1 bg-amber-50 rounded p-2">
											<MessageSquare className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
											<p className="text-sm text-amber-800">{entry.teacherComment}</p>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [filterNotRead, setFilterNotRead] = useState(false);
	const [commentEntryId, setCommentEntryId] = useState<string | null>(null);
	const [commentText, setCommentText] = useState("");
	const [showTeacherEntryForm, setShowTeacherEntryForm] = useState(false);

	// Teacher entry form state
	const [teacherEntryChildId, setTeacherEntryChildId] = useState("");
	const [teacherEntryDate, setTeacherEntryDate] = useState(todayString());
	const [teacherEntryBook, setTeacherEntryBook] = useState("");
	const [teacherEntryMinutes, setTeacherEntryMinutes] = useState("");
	const [teacherEntryReadWith, setTeacherEntryReadWith] =
		useState<(typeof READ_WITH_OPTIONS)[number]>("TEACHER");
	const [teacherEntryComment, setTeacherEntryComment] = useState("");

	// Update diary form state
	const [updateCurrentBook, setUpdateCurrentBook] = useState("");
	const [updateReadingLevel, setUpdateReadingLevel] = useState("");
	const [updateTargetMins, setUpdateTargetMins] = useState("");

	const utils = trpc.useUtils();

	const { data: overview, isLoading: overviewLoading } =
		trpc.readingDiary.getClassOverview.useQuery({ schoolId });

	const weekStart = useMemo(() => getMonday(new Date()), []);
	const weekEnd = useMemo(() => getSunday(weekStart), [weekStart]);

	const { data: childEntries, isLoading: childEntriesLoading } =
		trpc.readingDiary.getEntries.useQuery(
			{ childId: selectedChildId ?? "", startDate: weekStart, endDate: weekEnd },
			{ enabled: !!selectedChildId },
		);

	const { data: childDiary } = trpc.readingDiary.getDiary.useQuery(
		{ childId: selectedChildId ?? "" },
		{ enabled: !!selectedChildId },
	);

	const addCommentMutation = trpc.readingDiary.addTeacherComment.useMutation({
		onSuccess: () => {
			if (selectedChildId) {
				utils.readingDiary.getEntries.invalidate({
					childId: selectedChildId,
					startDate: weekStart,
					endDate: weekEnd,
				});
			}
			setCommentEntryId(null);
			setCommentText("");
		},
	});

	const updateDiaryMutation = trpc.readingDiary.updateDiary.useMutation({
		onSuccess: () => {
			if (selectedChildId) {
				utils.readingDiary.getDiary.invalidate({ childId: selectedChildId });
				utils.readingDiary.getClassOverview.invalidate({ schoolId });
			}
		},
	});

	const createTeacherEntryMutation = trpc.readingDiary.createTeacherEntry.useMutation({
		onSuccess: () => {
			utils.readingDiary.getClassOverview.invalidate({ schoolId });
			if (selectedChildId) {
				utils.readingDiary.getEntries.invalidate({
					childId: selectedChildId,
					startDate: weekStart,
					endDate: weekEnd,
				});
				utils.readingDiary.getStats.invalidate({ childId: selectedChildId });
			}
			setShowTeacherEntryForm(false);
			setTeacherEntryChildId("");
			setTeacherEntryDate(todayString());
			setTeacherEntryBook("");
			setTeacherEntryMinutes("");
			setTeacherEntryReadWith("TEACHER");
			setTeacherEntryComment("");
		},
	});

	// Populate update form when child diary loads
	const handleSelectChild = (childId: string) => {
		setSelectedChildId(childId);
		setCommentEntryId(null);
		setCommentText("");
	};

	// Sync update form with diary data
	const populateUpdateForm = () => {
		setUpdateCurrentBook(childDiary?.currentBook ?? "");
		setUpdateReadingLevel(childDiary?.readingLevel ?? "");
		setUpdateTargetMins(childDiary?.targetMinsPerDay?.toString() ?? "");
	};

	const filteredOverview = useMemo(() => {
		if (!overview) return [];
		if (!filterNotRead) return overview;
		return overview.filter((c) => c.entriesThisWeek === 0);
	}, [overview, filterNotRead]);

	const getStatusColor = (entriesThisWeek: number): string => {
		if (entriesThisWeek >= 5) return "bg-green-100 text-green-800";
		if (entriesThisWeek >= 3) return "bg-amber-100 text-amber-800";
		return "bg-red-100 text-red-800";
	};

	// Child detail view
	if (selectedChildId) {
		const childInfo = overview?.find((c) => c.childId === selectedChildId);

		return (
			<div className="space-y-6">
				<button
					type="button"
					onClick={() => setSelectedChildId(null)}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ChevronLeft className="h-4 w-4" />
					Back to class overview
				</button>

				<div>
					<h2 className="text-lg font-semibold">{childInfo?.childName ?? "Child"}</h2>
					{childInfo?.readingLevel && (
						<Badge className="bg-purple-100 text-purple-800 mt-1">
							Level: {childInfo.readingLevel}
						</Badge>
					)}
				</div>

				{/* Update Diary */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BookOpen className="h-5 w-5" />
							Update Reading Diary
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
								<div>
									<label className="text-sm font-medium" htmlFor="update-book">
										Current Book
									</label>
									<input
										id="update-book"
										type="text"
										value={updateCurrentBook}
										onFocus={populateUpdateForm}
										onChange={(e) => setUpdateCurrentBook(e.target.value)}
										placeholder="e.g. The BFG"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="update-level">
										Reading Level
									</label>
									<input
										id="update-level"
										type="text"
										value={updateReadingLevel}
										onFocus={populateUpdateForm}
										onChange={(e) => setUpdateReadingLevel(e.target.value)}
										placeholder="e.g. Turquoise"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="update-target">
										Target (mins/day)
									</label>
									<input
										id="update-target"
										type="number"
										min="1"
										value={updateTargetMins}
										onFocus={populateUpdateForm}
										onChange={(e) => setUpdateTargetMins(e.target.value)}
										placeholder="15"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
							</div>
							<Button
								onClick={() => {
									if (selectedChildId) {
										updateDiaryMutation.mutate({
											schoolId,
											childId: selectedChildId,
											currentBook: updateCurrentBook || undefined,
											readingLevel: updateReadingLevel || undefined,
											targetMinsPerDay: updateTargetMins
												? Number.parseInt(updateTargetMins, 10)
												: undefined,
										});
									}
								}}
								disabled={updateDiaryMutation.isPending}
								size="sm"
							>
								{updateDiaryMutation.isPending ? "Saving..." : "Update Diary"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Child Entries */}
				<Card>
					<CardHeader>
						<CardTitle>This Week's Entries</CardTitle>
					</CardHeader>
					<CardContent>
						{childEntriesLoading ? (
							<Skeleton className="h-48 w-full" />
						) : !childEntries?.length ? (
							<p className="text-sm text-muted-foreground">No entries this week.</p>
						) : (
							<div className="space-y-3">
								{childEntries.map((entry) => (
									<div key={entry.id} className="rounded-md border p-3 space-y-2">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">{formatDate(entry.date)}</span>
											<Badge className="bg-blue-100 text-blue-800">
												{READ_WITH_LABELS[entry.readWith] ?? entry.readWith}
											</Badge>
											<Badge className="bg-orange-100/40 text-gray-600">
												{entry.entryBy === "TEACHER" ? "Teacher" : "Parent"}
											</Badge>
											{entry.minutesRead && (
												<span className="text-xs text-muted-foreground">
													{entry.minutesRead} min
												</span>
											)}
										</div>
										<p className="text-sm">{entry.bookTitle}</p>
										{entry.pagesOrChapter && (
											<p className="text-xs text-muted-foreground">{entry.pagesOrChapter}</p>
										)}
										{entry.parentComment && (
											<p className="text-sm text-muted-foreground italic">
												Parent: "{entry.parentComment}"
											</p>
										)}
										{entry.teacherComment && (
											<div className="flex items-start gap-1.5 bg-amber-50 rounded p-2">
												<MessageSquare className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
												<p className="text-sm text-amber-800">{entry.teacherComment}</p>
											</div>
										)}

										{/* Add comment */}
										{!entry.teacherComment && commentEntryId !== entry.id && (
											<button
												type="button"
												onClick={() => setCommentEntryId(entry.id)}
												className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
											>
												<MessageSquare className="h-3 w-3" />
												Add comment
											</button>
										)}
										{commentEntryId === entry.id && (
											<div className="flex gap-2">
												<input
													type="text"
													value={commentText}
													onChange={(e) => setCommentText(e.target.value)}
													placeholder="Add a comment..."
													maxLength={500}
													className="flex-1 rounded-md border p-2 text-sm"
												/>
												<Button
													size="sm"
													onClick={() => {
														if (commentText.trim()) {
															addCommentMutation.mutate({
																schoolId,
																entryId: entry.id,
																teacherComment: commentText.trim(),
															});
														}
													}}
													disabled={!commentText.trim() || addCommentMutation.isPending}
												>
													{addCommentMutation.isPending ? "..." : "Save"}
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setCommentEntryId(null);
														setCommentText("");
													}}
												>
													Cancel
												</Button>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	// Class overview
	return (
		<div className="space-y-6">
			{/* Class Overview */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Class Overview
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Button
							size="sm"
							variant={filterNotRead ? "default" : "outline"}
							onClick={() => setFilterNotRead(!filterNotRead)}
							className={
								filterNotRead ? "bg-red-100 text-red-800 border-red-300 hover:bg-red-200" : ""
							}
						>
							{filterNotRead ? "Show All" : "Who hasn't read this week?"}
						</Button>

						{overviewLoading ? (
							<Skeleton className="h-48 w-full" />
						) : !filteredOverview.length ? (
							<p className="text-sm text-muted-foreground">
								{filterNotRead ? "Everyone has read this week!" : "No children found."}
							</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b">
											<th className="text-left py-2 pr-4 font-medium">Name</th>
											<th className="text-left py-2 pr-4 font-medium">Level</th>
											<th className="text-left py-2 pr-4 font-medium">Last Entry</th>
											<th className="text-left py-2 pr-4 font-medium">This Week</th>
										</tr>
									</thead>
									<tbody>
										{filteredOverview.map((child) => (
											<tr
												key={child.childId}
												className="border-b cursor-pointer hover:bg-muted/50"
												onClick={() => handleSelectChild(child.childId)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") handleSelectChild(child.childId);
												}}
											>
												<td className="py-2 pr-4 font-medium">{child.childName}</td>
												<td className="py-2 pr-4">
													{child.readingLevel ? (
														<Badge className="bg-purple-100 text-purple-800">
															{child.readingLevel}
														</Badge>
													) : (
														<span className="text-muted-foreground">-</span>
													)}
												</td>
												<td className="py-2 pr-4">
													{child.lastEntryDate ? formatDate(child.lastEntryDate) : "Never"}
												</td>
												<td className="py-2 pr-4">
													<Badge className={getStatusColor(child.entriesThisWeek)}>
														{child.entriesThisWeek} entries
													</Badge>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Add Teacher Entry */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5" />
						Log Teacher Reading Session
					</CardTitle>
				</CardHeader>
				<CardContent>
					{!showTeacherEntryForm ? (
						<Button
							onClick={() => setShowTeacherEntryForm(true)}
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Add Reading Session
						</Button>
					) : (
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div>
									<label className="text-sm font-medium" htmlFor="teacher-child">
										Child
									</label>
									<select
										id="teacher-child"
										value={teacherEntryChildId}
										onChange={(e) => setTeacherEntryChildId(e.target.value)}
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									>
										<option value="">Select child...</option>
										{overview?.map((child) => (
											<option key={child.childId} value={child.childId}>
												{child.childName}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="teacher-date">
										Date
									</label>
									<input
										id="teacher-date"
										type="date"
										value={teacherEntryDate}
										onChange={(e) => setTeacherEntryDate(e.target.value)}
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="teacher-book">
										Book Title
									</label>
									<input
										id="teacher-book"
										type="text"
										value={teacherEntryBook}
										onChange={(e) => setTeacherEntryBook(e.target.value)}
										placeholder="e.g. Guided reading group book"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-sm font-medium" htmlFor="teacher-minutes">
										Minutes
									</label>
									<input
										id="teacher-minutes"
										type="number"
										min="1"
										value={teacherEntryMinutes}
										onChange={(e) => setTeacherEntryMinutes(e.target.value)}
										placeholder="15"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
							</div>

							<div>
								<label className="text-sm font-medium" htmlFor="teacher-readwith">
									Read With
								</label>
								<select
									id="teacher-readwith"
									value={teacherEntryReadWith}
									onChange={(e) =>
										setTeacherEntryReadWith(e.target.value as (typeof READ_WITH_OPTIONS)[number])
									}
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								>
									{READ_WITH_OPTIONS.map((opt) => (
										<option key={opt} value={opt}>
											{READ_WITH_LABELS[opt]}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-sm font-medium" htmlFor="teacher-comment">
									Comment
								</label>
								<Textarea
									id="teacher-comment"
									value={teacherEntryComment}
									onChange={(e) => setTeacherEntryComment(e.target.value)}
									placeholder="Notes from the session..."
									maxLength={500}
									className="mt-1"
									rows={3}
								/>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={() => {
										if (teacherEntryChildId && teacherEntryBook.trim()) {
											createTeacherEntryMutation.mutate({
												schoolId,
												childId: teacherEntryChildId,
												date: new Date(`${teacherEntryDate}T00:00:00`),
												bookTitle: teacherEntryBook.trim(),
												minutesRead: teacherEntryMinutes
													? Number.parseInt(teacherEntryMinutes, 10)
													: undefined,
												readWith: teacherEntryReadWith,
												teacherComment: teacherEntryComment.trim() || undefined,
											});
										}
									}}
									disabled={
										!teacherEntryChildId ||
										!teacherEntryBook.trim() ||
										createTeacherEntryMutation.isPending
									}
									size="sm"
								>
									{createTeacherEntryMutation.isPending ? "Saving..." : "Save Entry"}
								</Button>
								<Button variant="outline" size="sm" onClick={() => setShowTeacherEntryForm(false)}>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function ReadingPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.readingDiaryEnabled) {
		return <FeatureDisabled featureName="Reading Diary" />;
	}

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={BookOpen}
					title="Reading Diary"
					description={
						isStaff
							? "Monitor and support reading across the class"
							: "Track daily reading and build a streak"
					}
				/>

				{isStaff && session.schoolId ? <StaffView schoolId={session.schoolId} /> : <ParentView />}
			</div>
		</PageShell>
	);
}
