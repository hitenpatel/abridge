"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	ArrowLeft,
	BookOpen,
	CheckCircle,
	Download,
	FileText,
	Plus,
	Send,
	XCircle,
} from "lucide-react";
import { useState } from "react";

const LEVEL_COLORS: Record<string, string> = {
	EMERGING: "bg-red-100 text-red-800",
	DEVELOPING: "bg-amber-100 text-amber-800",
	EXPECTED: "bg-green-100 text-green-800",
	EXCEEDING: "bg-blue-100 text-blue-800",
};

const EFFORT_LABELS: Record<string, string> = {
	OUTSTANDING: "Outstanding",
	GOOD: "Good",
	SATISFACTORY: "Satisfactory",
	NEEDS_IMPROVEMENT: "Needs Improvement",
};

const STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-yellow-100 text-yellow-800",
	PUBLISHED: "bg-green-100 text-green-800",
	ARCHIVED: "bg-gray-100 text-gray-800",
};

const CYCLE_TYPE_LABELS: Record<string, string> = {
	TERMLY: "Termly",
	HALF_TERMLY: "Half-Termly",
	END_OF_YEAR: "End of Year",
	MOCK: "Mock",
	CUSTOM: "Custom",
};

type CycleType = "TERMLY" | "HALF_TERMLY" | "END_OF_YEAR" | "MOCK" | "CUSTOM";
type AssessmentModel = "PRIMARY_DESCRIPTIVE" | "SECONDARY_GRADES";
type PrimaryLevel = "EMERGING" | "DEVELOPING" | "EXPECTED" | "EXCEEDING";
type Effort = "OUTSTANDING" | "GOOD" | "SATISFACTORY" | "NEEDS_IMPROVEMENT";

interface GradeEntry {
	subject: string;
	level?: PrimaryLevel;
	effort?: Effort;
	currentGrade?: string;
	targetGrade?: string;
	comment?: string;
}

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);
	const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

	const childId = selectedChild ?? children?.[0]?.child.id;

	const { data: reports, isLoading: reportsLoading } = trpc.reportCard.listReportsForChild.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	const { data: reportCard, isLoading: reportCardLoading } = trpc.reportCard.getReportCard.useQuery(
		{ childId: childId ?? "", cycleId: selectedCycleId ?? "" },
		{ enabled: !!childId && !!selectedCycleId },
	);

	const generatePdf = trpc.reportCard.generatePdf.useMutation({
		onSuccess: (data) => {
			const blob = new Blob([Uint8Array.from(atob(data.pdf), (c) => c.charCodeAt(0))], {
				type: "application/pdf",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = data.filename;
			a.click();
			URL.revokeObjectURL(url);
		},
	});

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	// Report card detail view
	if (selectedCycleId && childId) {
		if (reportCardLoading) {
			return <Skeleton className="h-96 w-full" />;
		}

		if (!reportCard) {
			return (
				<div className="space-y-4">
					<button
						type="button"
						onClick={() => setSelectedCycleId(null)}
						className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to reports
					</button>
					<p className="text-muted-foreground">Report card not found.</p>
				</div>
			);
		}

		const isPrimary = reportCard.cycle.assessmentModel === "PRIMARY_DESCRIPTIVE";

		return (
			<div className="space-y-6">
				<button
					type="button"
					onClick={() => setSelectedCycleId(null)}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to reports
				</button>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>
									{reportCard.child.firstName} {reportCard.child.lastName}
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									{reportCard.child.yearGroup && `Year ${reportCard.child.yearGroup}`}
									{reportCard.child.className && ` - ${reportCard.child.className}`}
								</p>
								<p className="text-sm text-muted-foreground mt-1">{reportCard.cycle.name}</p>
							</div>
							<div className="flex items-center gap-2">
								{reportCard.attendancePct != null && (
									<Badge className="bg-blue-100 text-blue-800">
										Attendance: {reportCard.attendancePct}%
									</Badge>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{reportCard.subjectGrades.length > 0 && (
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b">
											<th className="py-2 text-left font-medium">Subject</th>
											{isPrimary ? (
												<>
													<th className="py-2 text-left font-medium">Level</th>
													<th className="py-2 text-left font-medium">Effort</th>
												</>
											) : (
												<>
													<th className="py-2 text-left font-medium">Current Grade</th>
													<th className="py-2 text-left font-medium">Target Grade</th>
												</>
											)}
											<th className="py-2 text-left font-medium">Comment</th>
										</tr>
									</thead>
									<tbody>
										{reportCard.subjectGrades.map((grade) => (
											<tr key={grade.id} className="border-b last:border-0">
												<td className="py-2 font-medium">{grade.subject}</td>
												{isPrimary ? (
													<>
														<td className="py-2">
															{grade.level && (
																<Badge className={LEVEL_COLORS[grade.level]}>
																	{grade.level.charAt(0) + grade.level.slice(1).toLowerCase()}
																</Badge>
															)}
														</td>
														<td className="py-2">
															{grade.effort && (
																<span className="text-muted-foreground">
																	{EFFORT_LABELS[grade.effort]}
																</span>
															)}
														</td>
													</>
												) : (
													<>
														<td className="py-2">{grade.currentGrade ?? "-"}</td>
														<td className="py-2">{grade.targetGrade ?? "-"}</td>
													</>
												)}
												<td className="py-2 text-muted-foreground">{grade.comment ?? "-"}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{reportCard.generalComment && (
							<div className="mt-4 rounded-md border p-4">
								<p className="text-sm font-medium mb-1">General Comment</p>
								<p className="text-sm text-muted-foreground">{reportCard.generalComment}</p>
							</div>
						)}

						<div className="mt-4">
							<Button
								onClick={() => {
									if (childId && selectedCycleId) {
										generatePdf.mutate({
											childId,
											cycleId: selectedCycleId,
										});
									}
								}}
								disabled={generatePdf.isPending}
								className="flex items-center gap-2"
							>
								<Download className="h-4 w-4" />
								{generatePdf.isPending ? "Generating..." : "Download Report"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Reports list view
	return (
		<div className="space-y-6">
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<Button
							key={pc.child.id}
							size="sm"
							variant={childId === pc.child.id ? "default" : "outline"}
							onClick={() => {
								setSelectedChild(pc.child.id);
								setSelectedCycleId(null);
							}}
						>
							{pc.child.firstName}
						</Button>
					))}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Report Cards
					</CardTitle>
				</CardHeader>
				<CardContent>
					{reportsLoading && <Skeleton className="h-24 w-full" />}
					{!reportsLoading && reports?.length === 0 && (
						<EmptyState
							icon={FileText}
							title="No reports available yet"
							description="Your child's report cards will appear here when published"
						/>
					)}
					<div className="space-y-2">
						{reports?.map((report) => (
							<button
								key={report.id}
								type="button"
								onClick={() => setSelectedCycleId(report.cycle.id)}
								className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted transition-colors"
							>
								<div>
									<p className="font-medium">{report.cycle.name}</p>
									<p className="text-xs text-muted-foreground">
										Published {new Date(report.cycle.publishDate).toLocaleDateString("en-GB")}
									</p>
								</div>
								<Badge className="bg-gray-100 text-gray-800">
									{CYCLE_TYPE_LABELS[report.cycle.type] ?? report.cycle.type}
								</Badge>
							</button>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const utils = trpc.useUtils();
	const { data: cycles, isLoading: cyclesLoading } = trpc.reportCard.listCycles.useQuery({
		schoolId,
	});

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	// Create cycle form state
	const [cycleName, setCycleName] = useState("");
	const [cycleType, setCycleType] = useState<CycleType>("TERMLY");
	const [assessmentModel, setAssessmentModel] = useState<AssessmentModel>("PRIMARY_DESCRIPTIVE");
	const [publishDate, setPublishDate] = useState("");

	const createCycleMutation = trpc.reportCard.createCycle.useMutation({
		onSuccess: () => {
			utils.reportCard.listCycles.invalidate({ schoolId });
			setShowCreateForm(false);
			setCycleName("");
			setCycleType("TERMLY");
			setAssessmentModel("PRIMARY_DESCRIPTIVE");
			setPublishDate("");
		},
	});

	const publishCycleMutation = trpc.reportCard.publishCycle.useMutation({
		onSuccess: () => {
			utils.reportCard.listCycles.invalidate({ schoolId });
		},
	});

	const selectedCycle = cycles?.find((c) => c.id === selectedCycleId);

	// Children for cycle
	const { data: childrenForCycle, isLoading: childrenLoading } =
		trpc.reportCard.getChildrenForCycle.useQuery(
			{ schoolId, cycleId: selectedCycleId ?? "" },
			{ enabled: !!selectedCycleId },
		);

	// Grade entry state
	const [grades, setGrades] = useState<GradeEntry[]>([{ subject: "" }]);
	const [generalComment, setGeneralComment] = useState("");
	const [attendancePct, setAttendancePct] = useState("");

	const saveGradesMutation = trpc.reportCard.saveGrades.useMutation({
		onSuccess: () => {
			utils.reportCard.getChildrenForCycle.invalidate({
				schoolId,
				cycleId: selectedCycleId ?? "",
			});
			setSelectedChildId(null);
			setGrades([{ subject: "" }]);
			setGeneralComment("");
			setAttendancePct("");
		},
	});

	// Load existing report card for editing
	const { data: existingReport } = trpc.reportCard.getReportCard.useQuery(
		{ childId: selectedChildId ?? "", cycleId: selectedCycleId ?? "" },
		{ enabled: !!selectedChildId && !!selectedCycleId },
	);

	// Populate form when existing report loads
	const [loadedReportId, setLoadedReportId] = useState<string | null>(null);
	if (existingReport && existingReport.id !== loadedReportId && selectedChildId) {
		setLoadedReportId(existingReport.id);
		setGeneralComment(existingReport.generalComment ?? "");
		setAttendancePct(
			existingReport.attendancePct != null ? String(existingReport.attendancePct) : "",
		);
		if (existingReport.subjectGrades.length > 0) {
			setGrades(
				existingReport.subjectGrades.map((g) => ({
					subject: g.subject,
					level: (g.level as PrimaryLevel) ?? undefined,
					effort: (g.effort as Effort) ?? undefined,
					currentGrade: g.currentGrade ?? undefined,
					targetGrade: g.targetGrade ?? undefined,
					comment: g.comment ?? undefined,
				})),
			);
		}
	}

	if (cyclesLoading) {
		return <Skeleton className="h-96 w-full" />;
	}

	// Grade entry form for a child
	if (selectedChildId && selectedCycleId && selectedCycle) {
		const isPrimary = selectedCycle.assessmentModel === "PRIMARY_DESCRIPTIVE";
		const childInfo = childrenForCycle?.find((c) => c.id === selectedChildId);

		return (
			<div className="space-y-6">
				<button
					type="button"
					onClick={() => {
						setSelectedChildId(null);
						setGrades([{ subject: "" }]);
						setGeneralComment("");
						setAttendancePct("");
						setLoadedReportId(null);
					}}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to children
				</button>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BookOpen className="h-5 w-5" />
							Grade Entry: {childInfo?.firstName} {childInfo?.lastName}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{selectedCycle.name} - {isPrimary ? "Primary Descriptive" : "Secondary Grades"}
						</p>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{grades.map((grade, index) => (
								<div key={`grade-${index}`} className="rounded-md border p-3 space-y-3">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">Subject {index + 1}</span>
										{grades.length > 1 && (
											<button
												type="button"
												onClick={() => setGrades(grades.filter((_, i) => i !== index))}
												className="text-red-500 hover:text-red-700"
											>
												<XCircle className="h-4 w-4" />
											</button>
										)}
									</div>

									<input
										type="text"
										placeholder="Subject name"
										value={grade.subject}
										onChange={(e) => {
											const updated = [...grades];
											updated[index] = { ...updated[index], subject: e.target.value };
											setGrades(updated);
										}}
										className="w-full rounded-md border px-3 py-1.5 text-sm"
									/>

									{isPrimary ? (
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label
													htmlFor={`level-${index}`}
													className="text-xs font-medium text-muted-foreground"
												>
													Level
												</label>
												<select
													id={`level-${index}`}
													value={grade.level ?? ""}
													onChange={(e) => {
														const updated = [...grades];
														updated[index] = {
															...updated[index]!,
															level: (e.target.value || undefined) as PrimaryLevel | undefined,
														};
														setGrades(updated);
													}}
													className="w-full rounded-md border px-3 py-1.5 text-sm"
												>
													<option value="">Select level</option>
													<option value="EMERGING">Emerging</option>
													<option value="DEVELOPING">Developing</option>
													<option value="EXPECTED">Expected</option>
													<option value="EXCEEDING">Exceeding</option>
												</select>
											</div>
											<div>
												<label
													htmlFor={`effort-${index}`}
													className="text-xs font-medium text-muted-foreground"
												>
													Effort
												</label>
												<select
													id={`effort-${index}`}
													value={grade.effort ?? ""}
													onChange={(e) => {
														const updated = [...grades];
														updated[index] = {
															...updated[index]!,
															effort: (e.target.value || undefined) as Effort | undefined,
														};
														setGrades(updated);
													}}
													className="w-full rounded-md border px-3 py-1.5 text-sm"
												>
													<option value="">Select effort</option>
													<option value="OUTSTANDING">Outstanding</option>
													<option value="GOOD">Good</option>
													<option value="SATISFACTORY">Satisfactory</option>
													<option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
												</select>
											</div>
										</div>
									) : (
										<div className="grid grid-cols-2 gap-3">
											<div>
												<label
													htmlFor={`currentGrade-${index}`}
													className="text-xs font-medium text-muted-foreground"
												>
													Current Grade
												</label>
												<input
													id={`currentGrade-${index}`}
													type="text"
													placeholder="e.g. B+"
													value={grade.currentGrade ?? ""}
													onChange={(e) => {
														const updated = [...grades];
														updated[index] = {
															...updated[index]!,
															currentGrade: e.target.value || undefined,
														};
														setGrades(updated);
													}}
													className="w-full rounded-md border px-3 py-1.5 text-sm"
												/>
											</div>
											<div>
												<label
													htmlFor={`targetGrade-${index}`}
													className="text-xs font-medium text-muted-foreground"
												>
													Target Grade
												</label>
												<input
													id={`targetGrade-${index}`}
													type="text"
													placeholder="e.g. A"
													value={grade.targetGrade ?? ""}
													onChange={(e) => {
														const updated = [...grades];
														updated[index] = {
															...updated[index]!,
															targetGrade: e.target.value || undefined,
														};
														setGrades(updated);
													}}
													className="w-full rounded-md border px-3 py-1.5 text-sm"
												/>
											</div>
										</div>
									)}

									<div>
										<label
											htmlFor={`comment-${index}`}
											className="text-xs font-medium text-muted-foreground"
										>
											Comment
										</label>
										<Textarea
											id={`comment-${index}`}
											placeholder="Subject comment (max 500 characters)"
											maxLength={500}
											value={grade.comment ?? ""}
											onChange={(e) => {
												const updated = [...grades];
												updated[index] = {
													...updated[index]!,
													comment: e.target.value || undefined,
												};
												setGrades(updated);
											}}
											rows={2}
										/>
									</div>
								</div>
							))}

							<Button
								variant="outline"
								size="sm"
								onClick={() => setGrades([...grades, { subject: "" }])}
								className="flex items-center gap-1"
							>
								<Plus className="h-4 w-4" />
								Add Subject
							</Button>

							<div className="border-t pt-4 space-y-3">
								<div>
									<label htmlFor="generalComment" className="text-sm font-medium">
										General Comment
									</label>
									<Textarea
										id="generalComment"
										placeholder="Overall comment (max 1000 characters)"
										maxLength={1000}
										value={generalComment}
										onChange={(e) => setGeneralComment(e.target.value)}
										className="mt-1"
										rows={3}
									/>
								</div>

								<div>
									<label htmlFor="attendancePct" className="text-sm font-medium">
										Attendance %
									</label>
									<input
										id="attendancePct"
										type="number"
										placeholder="e.g. 95"
										min={0}
										max={100}
										value={attendancePct}
										onChange={(e) => setAttendancePct(e.target.value)}
										className="w-full rounded-md border px-3 py-1.5 text-sm mt-1"
									/>
								</div>
							</div>

							<Button
								onClick={() => {
									saveGradesMutation.mutate({
										schoolId,
										cycleId: selectedCycleId,
										childId: selectedChildId,
										generalComment: generalComment || undefined,
										attendancePct: attendancePct ? Number(attendancePct) : undefined,
										grades: grades
											.filter((g) => g.subject.trim() !== "")
											.map((g, i) => ({
												subject: g.subject,
												sortOrder: i,
												level: g.level,
												effort: g.effort,
												currentGrade: g.currentGrade,
												targetGrade: g.targetGrade,
												comment: g.comment,
											})),
									});
								}}
								disabled={saveGradesMutation.isPending}
								size="sm"
							>
								{saveGradesMutation.isPending ? "Saving..." : "Save"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Children list for a cycle
	if (selectedCycleId && selectedCycle) {
		return (
			<div className="space-y-6">
				<button
					type="button"
					onClick={() => setSelectedCycleId(null)}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to cycles
				</button>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>{selectedCycle.name}</CardTitle>
								<p className="text-sm text-muted-foreground">
									{CYCLE_TYPE_LABELS[selectedCycle.type]} -{" "}
									{selectedCycle.assessmentModel === "PRIMARY_DESCRIPTIVE"
										? "Primary Descriptive"
										: "Secondary Grades"}
								</p>
							</div>
							{selectedCycle.status === "DRAFT" && (
								<Button
									onClick={() =>
										publishCycleMutation.mutate({
											schoolId,
											cycleId: selectedCycleId,
										})
									}
									disabled={publishCycleMutation.isPending}
									className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
								>
									<Send className="h-4 w-4" />
									{publishCycleMutation.isPending ? "Publishing..." : "Publish"}
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{childrenLoading && <Skeleton className="h-24 w-full" />}
						{!childrenLoading && childrenForCycle?.length === 0 && (
							<p className="text-sm text-muted-foreground">No children found in this school.</p>
						)}
						<div className="space-y-2">
							{childrenForCycle?.map((child) => (
								<button
									key={child.id}
									type="button"
									onClick={() => {
										setSelectedChildId(child.id);
										setLoadedReportId(null);
										setGrades([{ subject: "" }]);
										setGeneralComment("");
										setAttendancePct("");
									}}
									className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted transition-colors"
								>
									<div>
										<p className="font-medium">
											{child.firstName} {child.lastName}
										</p>
										<p className="text-xs text-muted-foreground">
											{child.yearGroup && `Year ${child.yearGroup}`}
										</p>
									</div>
									<div className="flex items-center gap-2">
										{child.hasReport ? (
											<Badge className="bg-green-100 text-green-800">
												<CheckCircle className="h-3 w-3 mr-1" />
												{child.gradeCount} subject{child.gradeCount !== 1 ? "s" : ""}
											</Badge>
										) : (
											<Badge className="bg-gray-100 text-gray-800">No report</Badge>
										)}
									</div>
								</button>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Cycles list view
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Report Cycles
						</CardTitle>
						<Button
							size="sm"
							onClick={() => setShowCreateForm(!showCreateForm)}
							className="flex items-center gap-1"
						>
							<Plus className="h-4 w-4" />
							Create Cycle
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{showCreateForm && (
						<div className="mb-6 rounded-md border p-4 space-y-3">
							<div>
								<label htmlFor="cycleName" className="text-sm font-medium">
									Cycle Name
								</label>
								<input
									id="cycleName"
									type="text"
									placeholder="e.g. Autumn Term 2026"
									value={cycleName}
									onChange={(e) => setCycleName(e.target.value)}
									className="w-full rounded-md border px-3 py-1.5 text-sm mt-1"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label htmlFor="cycleType" className="text-sm font-medium">
										Type
									</label>
									<select
										id="cycleType"
										value={cycleType}
										onChange={(e) => setCycleType(e.target.value as CycleType)}
										className="w-full rounded-md border px-3 py-1.5 text-sm mt-1"
									>
										<option value="TERMLY">Termly</option>
										<option value="HALF_TERMLY">Half-Termly</option>
										<option value="END_OF_YEAR">End of Year</option>
										<option value="MOCK">Mock</option>
										<option value="CUSTOM">Custom</option>
									</select>
								</div>
								<div>
									<label htmlFor="assessmentModel" className="text-sm font-medium">
										Assessment Model
									</label>
									<select
										id="assessmentModel"
										value={assessmentModel}
										onChange={(e) => setAssessmentModel(e.target.value as AssessmentModel)}
										className="w-full rounded-md border px-3 py-1.5 text-sm mt-1"
									>
										<option value="PRIMARY_DESCRIPTIVE">Primary Descriptive</option>
										<option value="SECONDARY_GRADES">Secondary Grades</option>
									</select>
								</div>
							</div>
							<div>
								<label htmlFor="publishDate" className="text-sm font-medium">
									Publish Date
								</label>
								<input
									id="publishDate"
									type="date"
									value={publishDate}
									onChange={(e) => setPublishDate(e.target.value)}
									className="w-full rounded-md border px-3 py-1.5 text-sm mt-1"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={() => {
										if (cycleName && publishDate) {
											createCycleMutation.mutate({
												schoolId,
												name: cycleName,
												type: cycleType,
												assessmentModel,
												publishDate: new Date(publishDate),
											});
										}
									}}
									disabled={createCycleMutation.isPending || !cycleName || !publishDate}
								>
									{createCycleMutation.isPending ? "Creating..." : "Save"}
								</Button>
								<Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
									Cancel
								</Button>
							</div>
						</div>
					)}

					{cycles?.length === 0 && !showCreateForm && (
						<EmptyState
							icon={FileText}
							title="No report cycles yet"
							description="Create a cycle to get started"
						/>
					)}

					<div className="space-y-2">
						{cycles?.map((cycle) => (
							<button
								key={cycle.id}
								type="button"
								onClick={() => setSelectedCycleId(cycle.id)}
								className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted transition-colors"
							>
								<div>
									<p className="font-medium">{cycle.name}</p>
									<p className="text-xs text-muted-foreground">
										{CYCLE_TYPE_LABELS[cycle.type]} - Published{" "}
										{new Date(cycle.publishDate).toLocaleDateString("en-GB")}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Badge className={STATUS_COLORS[cycle.status]}>
										{cycle.status.toLowerCase()}
									</Badge>
									<span className="text-xs text-muted-foreground">
										{cycle._count.reportCards} report
										{cycle._count.reportCards !== 1 ? "s" : ""}
									</span>
								</div>
							</button>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function ReportsPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.reportCardsEnabled) {
		return <FeatureDisabled featureName="Report Cards" />;
	}

	return (
		<PageShell>
			<PageHeader
				icon={FileText}
				title="Reports"
				description={isStaff ? "Manage report cards and cycles" : "Student report cards"}
			/>
			{isStaff && session.schoolId ? <StaffView schoolId={session.schoolId} /> : <ParentView />}
		</PageShell>
	);
}
