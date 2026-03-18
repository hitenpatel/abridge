"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	BookOpen,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	ClipboardList,
	Filter,
	GraduationCap,
	Plus,
	Save,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";

function getDueDateColor(dueDate: Date, completed: boolean): string {
	if (completed) return "bg-green-100 text-green-800";
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);
	const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
	if (diffDays < 0) return "bg-red-100 text-red-800";
	if (diffDays <= 2) return "bg-amber-100 text-amber-800";
	return "bg-orange-100/40 text-gray-600";
}

function getDueDateLabel(dueDate: Date, completed: boolean): string {
	if (completed) return "Completed";
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);
	const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
	if (diffDays < 0) return "Overdue";
	if (diffDays === 0) return "Due today";
	if (diffDays === 1) return "Due tomorrow";
	if (diffDays <= 2) return "Due soon";
	return `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [subjectFilter, setSubjectFilter] = useState<string>("all");

	const childId = selectedChild ?? children?.[0]?.child?.id;

	const { data: homework, isLoading } = trpc.homework.listForChild.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	const utils = trpc.useUtils();

	const markCompleteMutation = trpc.homework.markComplete.useMutation({
		onSuccess: () => {
			if (childId) {
				utils.homework.listForChild.invalidate({ childId });
			}
		},
	});

	const subjects = useMemo(() => {
		if (!homework?.assignments?.length) return [];
		const unique = [...new Set(homework.assignments.map((h: { subject: string }) => h.subject))];
		return unique.sort();
	}, [homework]);

	const filteredHomework = useMemo(() => {
		if (!homework?.assignments) return [];
		let items = [...homework.assignments];
		if (subjectFilter !== "all") {
			items = items.filter((h) => h.subject === subjectFilter);
		}
		items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
		return items;
	}, [homework, subjectFilter]);

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

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

			{/* Subject Filter */}
			{subjects.length > 0 && (
				<div className="flex items-center gap-2">
					<Filter className="h-4 w-4 text-muted-foreground" />
					<Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v)}>
						<SelectTrigger className="w-48">
							<SelectValue placeholder="All Subjects" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Subjects</SelectItem>
							{subjects.map((subject) => (
								<SelectItem key={subject} value={subject}>
									{subject}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{/* Upcoming Homework */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						Upcoming Homework
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !filteredHomework.length ? (
						<p className="text-sm text-muted-foreground">No homework assignments found.</p>
					) : (
						<div className="space-y-2">
							{filteredHomework.map((item) => {
								const isExpanded = expandedId === item.id;
								const completion = item.completions?.[0];
								const isCompleted = completion?.status === "COMPLETED";
								return (
									<div key={item.id} className="rounded-md border">
										<button
											type="button"
											onClick={() => setExpandedId(isExpanded ? null : item.id)}
											className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<Badge className="bg-blue-100 text-blue-800">{item.subject}</Badge>
													<span className="font-medium text-sm">{item.title}</span>
													{item.isReadingTask && (
														<Badge className="bg-purple-100 text-purple-800">Reading</Badge>
													)}
												</div>
												<div className="flex items-center gap-2">
													<Badge className={getDueDateColor(item.dueDate, isCompleted)}>
														{getDueDateLabel(item.dueDate, isCompleted)}
													</Badge>
													<span className="text-xs text-muted-foreground">
														Due{" "}
														{new Date(item.dueDate).toLocaleDateString("en-GB", {
															weekday: "short",
															day: "numeric",
															month: "short",
														})}
													</span>
												</div>
											</div>
											{isExpanded ? (
												<ChevronUp className="h-4 w-4 text-muted-foreground" />
											) : (
												<ChevronDown className="h-4 w-4 text-muted-foreground" />
											)}
										</button>

										{isExpanded && (
											<div className="border-t px-3 py-3 space-y-3">
												{item.description && (
													<p className="text-sm text-muted-foreground">{item.description}</p>
												)}

												{completion?.grade && (
													<div className="flex items-center gap-2">
														<Badge className="bg-indigo-100 text-indigo-800">
															Grade: {completion.grade}
														</Badge>
														{completion.feedback && (
															<p className="text-sm text-muted-foreground italic">
																"{completion.feedback}"
															</p>
														)}
													</div>
												)}

												{!isCompleted && (
													<Button
														size="sm"
														onClick={() => {
															markCompleteMutation.mutate({
																assignmentId: item.id,
																childId: childId ?? "",
															});
														}}
														disabled={markCompleteMutation.isPending}
														className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
													>
														<CheckCircle2 className="h-3.5 w-3.5" />
														{markCompleteMutation.isPending ? "Marking..." : "Mark as Done"}
													</Button>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const [subject, setSubject] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [yearGroup, setYearGroup] = useState("");
	const [className, setClassName] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [isReadingTask, setIsReadingTask] = useState(false);

	const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
	const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});

	const utils = trpc.useUtils();

	const { data: assignments, isLoading: assignmentsLoading } =
		trpc.homework.listForTeacher.useQuery({
			schoolId,
		});

	const setHomeworkMutation = trpc.homework.setHomework.useMutation({
		onSuccess: () => {
			setSubject("");
			setTitle("");
			setDescription("");
			setYearGroup("");
			setClassName("");
			setDueDate("");
			setIsReadingTask(false);
			utils.homework.listForTeacher.invalidate({ schoolId });
		},
	});

	const gradeHomeworkMutation = trpc.homework.gradeHomework.useMutation({
		onSuccess: () => {
			utils.homework.listForTeacher.invalidate({ schoolId });
		},
	});

	const cancelHomeworkMutation = trpc.homework.cancelHomework.useMutation({
		onSuccess: () => {
			setExpandedAssignmentId(null);
			utils.homework.listForTeacher.invalidate({ schoolId });
		},
	});

	const handleSetHomework = () => {
		if (!subject.trim() || !title.trim() || !yearGroup.trim() || !dueDate) return;
		setHomeworkMutation.mutate({
			schoolId,
			subject: subject.trim(),
			title: title.trim(),
			description: description.trim() || undefined,
			yearGroup: yearGroup.trim(),
			className: className.trim() || undefined,
			setDate: new Date(),
			dueDate: new Date(`${dueDate}T00:00:00`),
			isReadingTask,
		});
	};

	const handleSaveGrades = (assignmentId: string) => {
		const assignmentGrades = Object.entries(grades).filter(
			([key]) => key.startsWith(`${assignmentId}:`) && grades[key],
		);
		for (const [key, value] of assignmentGrades) {
			const completionId = key.split(":")[1] ?? "";
			if (value.grade.trim() || value.feedback.trim()) {
				gradeHomeworkMutation.mutate({
					schoolId,
					completionId,
					grade: value.grade.trim() || "N/A",
					feedback: value.feedback.trim() || undefined,
				});
			}
		}
	};

	const handleCancel = (assignmentId: string) => {
		if (window.confirm("Are you sure you want to cancel this homework assignment?")) {
			cancelHomeworkMutation.mutate({ schoolId, assignmentId });
		}
	};

	const updateGrade = (
		assignmentId: string,
		childHomeworkId: string,
		field: "grade" | "feedback",
		value: string,
	) => {
		const key = `${assignmentId}:${childHomeworkId}`;
		setGrades((prev) => ({
			...prev,
			[key]: {
				grade: field === "grade" ? value : (prev[key]?.grade ?? ""),
				feedback: field === "feedback" ? value : (prev[key]?.feedback ?? ""),
			},
		}));
	};

	return (
		<div className="space-y-6">
			{/* Set Homework Form */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5" />
						Set Homework
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div>
								<label className="text-sm font-medium" htmlFor="hw-subject">
									Subject
								</label>
								<input
									id="hw-subject"
									type="text"
									value={subject}
									onChange={(e) => setSubject(e.target.value)}
									placeholder="e.g. Mathematics"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium" htmlFor="hw-title">
									Title
								</label>
								<input
									id="hw-title"
									type="text"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g. Times tables practice"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
						</div>

						<div>
							<label className="text-sm font-medium" htmlFor="hw-description">
								Description
							</label>
							<Textarea
								id="hw-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Describe the homework task..."
								className="mt-1"
								rows={3}
							/>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div>
								<label className="text-sm font-medium" htmlFor="hw-year-group">
									Year Group
								</label>
								<input
									id="hw-year-group"
									type="text"
									value={yearGroup}
									onChange={(e) => setYearGroup(e.target.value)}
									placeholder="e.g. Year 4"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium" htmlFor="hw-class">
									Class (optional)
								</label>
								<input
									id="hw-class"
									type="text"
									value={className}
									onChange={(e) => setClassName(e.target.value)}
									placeholder="e.g. 4B"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium" htmlFor="hw-due-date">
									Due Date
								</label>
								<input
									id="hw-due-date"
									type="date"
									value={dueDate}
									onChange={(e) => setDueDate(e.target.value)}
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
						</div>

						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={isReadingTask}
								onChange={(e) => setIsReadingTask(e.target.checked)}
								className="rounded border-gray-300"
							/>
							This is a reading task
						</label>

						<Button
							onClick={handleSetHomework}
							disabled={
								!subject.trim() ||
								!title.trim() ||
								!yearGroup.trim() ||
								!dueDate ||
								setHomeworkMutation.isPending
							}
							size="sm"
						>
							{setHomeworkMutation.isPending ? "Setting..." : "Set Homework"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* My Assignments */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ClipboardList className="h-5 w-5" />
						My Assignments
					</CardTitle>
				</CardHeader>
				<CardContent>
					{assignmentsLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !assignments?.length ? (
						<p className="text-sm text-muted-foreground">No assignments set yet.</p>
					) : (
						<div className="space-y-2">
							{assignments.map((assignment) => {
								const isExpanded = expandedAssignmentId === assignment.id;
								return (
									<div key={assignment.id} className="rounded-md border">
										<button
											type="button"
											onClick={() => setExpandedAssignmentId(isExpanded ? null : assignment.id)}
											className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
										>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<Badge className="bg-blue-100 text-blue-800">{assignment.subject}</Badge>
													<span className="font-medium text-sm">{assignment.title}</span>
													{assignment.isReadingTask && (
														<Badge className="bg-purple-100 text-purple-800">Reading</Badge>
													)}
												</div>
												<div className="flex items-center gap-2">
													<span className="text-xs text-muted-foreground">
														{assignment.yearGroup}
														{assignment.className ? ` - ${assignment.className}` : ""}
													</span>
													<span className="text-xs text-muted-foreground">
														Due{" "}
														{new Date(assignment.dueDate).toLocaleDateString("en-GB", {
															weekday: "short",
															day: "numeric",
															month: "short",
														})}
													</span>
													{assignment._count.completions > 0 && (
														<Badge className="bg-green-100 text-green-800">
															{assignment._count.completions} completed
														</Badge>
													)}
												</div>
											</div>
											{isExpanded ? (
												<ChevronUp className="h-4 w-4 text-muted-foreground" />
											) : (
												<ChevronDown className="h-4 w-4 text-muted-foreground" />
											)}
										</button>

										{isExpanded && (
											<div className="border-t px-3 py-3 space-y-3">
												{assignment.description && (
													<p className="text-sm text-muted-foreground mb-2">
														{assignment.description}
													</p>
												)}

												{/* Completion count summary */}
												{assignment._count.completions > 0 && (
													<p className="text-sm text-muted-foreground">
														{assignment._count.completions} completion
														{assignment._count.completions !== 1 ? "s" : ""} submitted
													</p>
												)}

												<div className="flex items-center gap-2">
													<Button
														size="sm"
														onClick={() => handleSaveGrades(assignment.id)}
														disabled={gradeHomeworkMutation.isPending}
														className="flex items-center gap-1.5"
													>
														<Save className="h-3.5 w-3.5" />
														{gradeHomeworkMutation.isPending ? "Saving..." : "Save All"}
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleCancel(assignment.id)}
														disabled={cancelHomeworkMutation.isPending}
														className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
													>
														<Trash2 className="h-3.5 w-3.5" />
														{cancelHomeworkMutation.isPending ? "Cancelling..." : "Cancel"}
													</Button>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function HomeworkPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.homeworkEnabled) {
		return <FeatureDisabled featureName="Homework Tracker" />;
	}

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={BookOpen}
					title="Homework"
					description={
						isStaff ? "Set and manage homework assignments" : "View homework and track progress"
					}
				/>

				{isStaff && session.schoolId ? <StaffView schoolId={session.schoolId} /> : <ParentView />}
			</div>
		</PageShell>
	);
}
