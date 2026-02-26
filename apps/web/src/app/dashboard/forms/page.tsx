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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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
						<span className="material-symbols-rounded text-base" aria-hidden="true">
							schedule
						</span>
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
								<Card className="hover:border-warning transition-colors border-warning/30">
									<CardContent className="flex items-center justify-between p-4">
										<div className="flex items-center gap-3">
											<div className="p-2 bg-warning/10 rounded-xl">
												<span className="material-symbols-rounded text-warning" aria-hidden="true">
													description
												</span>
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
											<span className="material-symbols-rounded text-base" aria-hidden="true">
												chevron_right
											</span>
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
						<span className="material-symbols-rounded text-base" aria-hidden="true">
							check_circle
						</span>
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
									<Badge variant="success">Submitted</Badge>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function StaffFormsView({ schoolId }: { schoolId: string }) {
	const utils = trpc.useUtils();
	const { data: templates, isLoading } = trpc.forms.getTemplates.useQuery({ schoolId });
	const [showCreate, setShowCreate] = useState(false);
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
		<div className="p-8 max-w-5xl mx-auto" data-testid="forms-list">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Form Templates</h1>
					<p className="text-muted-foreground mt-1">
						Create and manage forms for parents to complete.
					</p>
				</div>
				<Button data-testid="create-form-button" onClick={() => setShowCreate(true)}>
					<Plus className="h-4 w-4 mr-1" />
					Create Form
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : templates && templates.length > 0 ? (
				<div className="grid gap-3">
					{/* biome-ignore lint/suspicious/noExplicitAny: UI component */}
					{templates.map((template: any) => (
						<Card key={template.id}>
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
				<div className="bg-muted rounded-lg p-12 text-center border border-dashed border-border">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">No form templates yet. Create one to get started.</p>
				</div>
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
	const {
		data: summaryData,
		isLoading,
		error,
	} = trpc.dashboard.getSummary.useQuery(undefined, { enabled: !isStaff });

	if (!features.formsEnabled) return <FeatureDisabled featureName="Forms" />;

	if (isStaff && session.schoolId) {
		return <StaffFormsView schoolId={session.schoolId} />;
	}

	if (isLoading) {
		return (
			<div className="p-8 max-w-5xl mx-auto space-y-8">
				<Skeleton className="h-10 w-1/4" />
				<div className="space-y-4">
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8 max-w-5xl mx-auto text-center text-destructive">
				Error loading forms: {error.message}
			</div>
		);
	}

	const children = summaryData?.children || [];

	return (
		<div className="p-8 max-w-5xl mx-auto" data-testid="forms-list">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Forms & Consent</h1>
				<p className="text-muted-foreground mt-1">
					Review and sign important documents from your children&apos;s school.
				</p>
			</div>

			{children.length > 0 ? (
				children.map((child) => (
					<ChildFormsList
						key={child.id}
						childId={child.id}
						childName={`${child.firstName} ${child.lastName}`}
					/>
				))
			) : (
				<div className="bg-muted rounded-lg p-12 text-center border border-dashed border-border">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">No forms available at this time.</p>
				</div>
			)}
		</div>
	);
}
