"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Clock, Download, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";

function DownloadPdfButton({ responseId, formTitle }: { responseId: string; formTitle: string }) {
	const [loading, setLoading] = useState(false);
	const utils = trpc.useUtils();

	const handleDownload = useCallback(async () => {
		setLoading(true);
		try {
			const result = await utils.forms.getFormPdf.fetch({ responseId });
			const byteChars = atob(result.pdfData);
			const byteNumbers = new Array(byteChars.length);
			for (let i = 0; i < byteChars.length; i++) {
				byteNumbers[i] = byteChars.charCodeAt(i);
			}
			const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${formTitle.replace(/\s+/g, "-")}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error("PDF not available for this form");
		} finally {
			setLoading(false);
		}
	}, [responseId, formTitle, utils.forms.getFormPdf]);

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleDownload}
			disabled={loading}
			data-testid="download-pdf-button"
		>
			<Download className="h-4 w-4 mr-1" />
			{loading ? "Loading..." : "PDF"}
		</Button>
	);
}

function ChildFormsList({ childId, childName }: { childId: string; childName: string }) {
	const { data: pendingForms, isLoading: isPendingLoading } = trpc.forms.getPendingForms.useQuery({
		childId,
	});
	const { data: completedForms, isLoading: isCompletedLoading } =
		trpc.forms.getCompletedForms.useQuery({ childId });

	if (isPendingLoading || isCompletedLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-1/4" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}

	const hasForms =
		(pendingForms && pendingForms.length > 0) || (completedForms && completedForms.length > 0);

	if (!hasForms) return null;

	return (
		<div className="space-y-6 mb-10">
			<div className="flex items-center gap-2 border-b border-border pb-2">
				<h2 className="text-xl font-semibold text-foreground">{childName}</h2>
			</div>

			{pendingForms && pendingForms.length > 0 && (
				<div className="space-y-3" data-testid="pending-forms-section">
					<h3 className="text-sm font-medium text-warning flex items-center gap-1">
						<Clock className="h-4 w-4" aria-hidden="true" />
						Action Required
					</h3>
					<div className="grid gap-3">
						{pendingForms.map((template) => (
							<Link
								key={template.id}
								href={`/dashboard/forms/${template.id}?childId=${childId}`}
								className="group"
								data-testid="form-item"
							>
								<Card className="hover-lift hover:border-warning transition-colors border-warning/30">
									<CardContent className="flex items-center justify-between p-4">
										<div className="flex items-center gap-3">
											<div className="p-2 bg-warning/10 rounded-xl">
												<FileText className="h-5 w-5 text-warning" aria-hidden="true" />
											</div>
											<div>
												<h4 className="font-medium text-foreground">{template.title}</h4>
												{template.description && (
													<p className="text-sm text-muted-foreground line-clamp-1">
														{template.description}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2 text-warning font-medium text-sm">
											Complete
											<ChevronRight className="h-4 w-4" aria-hidden="true" />
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</div>
			)}

			{completedForms && completedForms.length > 0 && (
				<div className="space-y-3" data-testid="completed-forms-section">
					<h3 className="text-sm font-medium text-success flex items-center gap-1">
						<FileText className="h-4 w-4" aria-hidden="true" />
						Completed
					</h3>
					<div className="grid gap-3">
						{/* biome-ignore lint/suspicious/noExplicitAny: UI component */}
						{completedForms.map((response: any) => (
							<Card key={response.id} className="opacity-75">
								<CardContent className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-muted rounded-lg">
											<FileText className="h-5 w-5 text-muted-foreground" />
										</div>
										<div>
											<h4 className="font-medium text-muted-foreground">
												{response.template.title}
											</h4>
											<p className="text-xs text-muted-foreground">
												Submitted on {new Date(response.submittedAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<DownloadPdfButton
											responseId={response.id}
											formTitle={response.template.title}
										/>
										<Badge variant="success">Submitted</Badge>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function StaffFormsView({
	schoolId,
	showCreate,
	setShowCreate,
}: {
	schoolId: string;
	showCreate: boolean;
	setShowCreate: (open: boolean) => void;
}) {
	const utils = trpc.useUtils();
	const { data: templates, isLoading } = trpc.forms.getTemplates.useQuery({ schoolId });
	const [title, setTitle] = useState("");
	const [fields, setFields] = useState<
		Array<{ id: string; type: string; label: string; required: boolean }>
	>([]);

	const createMutation = trpc.forms.createTemplate.useMutation({
		onSuccess: () => {
			toast.success("Form template created");
			utils.forms.getTemplates.invalidate();
			setShowCreate(false);
			setTitle("");
			setFields([]);
		},
		onError: (err) => toast.error(err.message),
	});

	const addField = () => {
		setFields([...fields, { id: crypto.randomUUID(), type: "text", label: "", required: false }]);
	};

	const removeField = (id: string) => {
		setFields(fields.filter((f) => f.id !== id));
	};

	const updateFieldLabel = (id: string, label: string) => {
		setFields(fields.map((f) => (f.id === id ? { ...f, label } : f)));
	};

	const handleCreate = () => {
		if (!title.trim() || fields.length === 0) return;
		createMutation.mutate({
			schoolId,
			title: title.trim(),
			fields: fields.map((f) => ({
				id: f.id,
				type: f.type,
				label: f.label,
				required: f.required,
			})),
		});
	};

	return (
		<div data-testid="forms-list">
			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : templates && templates.length > 0 ? (
				<div className="grid gap-3">
					{/* biome-ignore lint/suspicious/noExplicitAny: UI component */}
					{templates.map((template: any) => (
						<Card key={template.id} className="hover-lift">
							<CardContent className="flex items-center justify-between p-4">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-xl">
										<FileText className="h-5 w-5 text-primary" />
									</div>
									<div>
										<h4 className="font-medium text-foreground">{template.title}</h4>
										{template.description && (
											<p className="text-sm text-muted-foreground">{template.description}</p>
										)}
									</div>
								</div>
								<Badge variant={template.isActive ? "success" : "secondary"}>
									{template.isActive ? "Active" : "Inactive"}
								</Badge>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<EmptyState
					icon={FileText}
					title="No form templates yet"
					description="Create one to get started."
					actionLabel="Create Form"
					onAction={() => setShowCreate(true)}
				/>
			)}

			<Dialog open={showCreate} onOpenChange={setShowCreate}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Form Template</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="form-title">Title</Label>
							<Input
								id="form-title"
								data-testid="form-title-input"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Form title"
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Fields</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									data-testid="add-field-button"
									onClick={addField}
								>
									<Plus className="h-3 w-3 mr-1" />
									Add Field
								</Button>
							</div>
							{fields.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No fields yet. Add at least one field.
								</p>
							)}
							<div className="space-y-2">
								{fields.map((field) => (
									<div key={field.id} className="flex items-center gap-2">
										<Input
											data-testid="field-label-input"
											value={field.label}
											onChange={(e) => updateFieldLabel(field.id, e.target.value)}
											placeholder="Field label"
											className="flex-1"
										/>
										<button
											type="button"
											onClick={() => removeField(field.id)}
											className="p-2 text-muted-foreground hover:text-destructive transition-colors"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreate(false)}>
							Cancel
						</Button>
						<Button
							data-testid="form-create-submit"
							onClick={handleCreate}
							disabled={createMutation.isPending || !title.trim() || fields.length === 0}
						>
							{createMutation.isPending ? "Creating..." : "Create Form"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function FormsPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;
	const [staffCreateOpen, setStaffCreateOpen] = useState(false);
	const {
		data: summaryData,
		isLoading,
		error,
	} = trpc.dashboard.getSummary.useQuery(undefined, { enabled: !isStaff });

	if (!features.formsEnabled) return <FeatureDisabled featureName="Forms" />;

	if (isStaff && session.schoolId) {
		return (
			<PageShell>
				<PageHeader
					icon={FileText}
					title="Forms & Consent"
					description="Review and sign important documents"
				>
					<Button data-testid="create-form-button" onClick={() => setStaffCreateOpen(true)}>
						<Plus className="h-4 w-4 mr-1" />
						Create Form
					</Button>
				</PageHeader>
				<StaffFormsView
					schoolId={session.schoolId}
					showCreate={staffCreateOpen}
					setShowCreate={setStaffCreateOpen}
				/>
			</PageShell>
		);
	}

	if (isLoading) {
		return (
			<PageShell>
				<PageHeader
					icon={FileText}
					title="Forms & Consent"
					description="Review and sign important documents"
				/>
				<div className="space-y-8">
					<Skeleton className="h-10 w-1/4" />
					<div className="space-y-4">
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				</div>
			</PageShell>
		);
	}

	if (error) {
		return (
			<PageShell>
				<PageHeader
					icon={FileText}
					title="Forms & Consent"
					description="Review and sign important documents"
				/>
				<div className="text-center text-destructive">Error loading forms: {error.message}</div>
			</PageShell>
		);
	}

	const children = summaryData?.children || [];

	return (
		<PageShell>
			<PageHeader
				icon={FileText}
				title="Forms & Consent"
				description="Review and sign important documents"
			/>
			<div data-testid="forms-list">
				{children.length > 0 ? (
					children.map((child) => (
						<ChildFormsList
							key={child.id}
							childId={child.id}
							childName={`${child.firstName} ${child.lastName}`}
						/>
					))
				) : (
					<EmptyState
						icon={FileText}
						title="No forms available"
						description="There are no forms to complete at this time."
					/>
				)}
			</div>
		</PageShell>
	);
}
