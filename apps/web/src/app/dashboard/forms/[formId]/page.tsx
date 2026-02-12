"use client";

import { FormRenderer, type FormTemplate } from "@/components/forms/form-renderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import React from "react";

export default function SingleFormPage() {
	const params = useParams();
	const searchParams = useSearchParams();
	const templateId = params.formId as string;
	const initialChildId = searchParams.get("childId");

	const [isSubmitted, setIsSubmitted] = React.useState(false);
	const [applyToAll, setApplyToAll] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const { data: template, isLoading: isTemplateLoading } = trpc.forms.getTemplate.useQuery({
		templateId,
	});
	const { data: summaryData } = trpc.dashboard.getSummary.useQuery(undefined);

	const submitMutation = trpc.forms.submitForm.useMutation();

	const children = summaryData?.children || [];
	const currentChild = children.find((c) => c.id === initialChildId);
	const otherChildren = children.filter((c) => c.id !== initialChildId);

	const handleSubmit = async (
		formData: Record<string, string | boolean>,
		signature: string | null,
	) => {
		try {
			setError(null);
			if (!initialChildId) {
				setError("No child selected");
				return;
			}

			// Submit for initial child
			await submitMutation.mutateAsync({
				templateId,
				childId: initialChildId,
				data: formData,
				signature: signature || undefined,
			});

			// Submit for other children if "Apply to all" is checked
			if (applyToAll && otherChildren.length > 0) {
				await Promise.all(
					otherChildren.map((child) =>
						submitMutation.mutateAsync({
							templateId,
							childId: child.id,
							data: formData,
							signature: signature || undefined,
						}),
					),
				);
			}

			setIsSubmitted(true);
		} catch (err) {
			console.error("Submission error:", err);
			setError("Failed to submit form. Please try again.");
		}
	};

	if (isTemplateLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	if (!template || !initialChildId || !currentChild) {
		return (
			<div className="p-8 max-w-2xl mx-auto text-center">
				<h2 className="text-2xl font-bold text-foreground mb-4">Form Not Found</h2>
				<p className="text-muted-foreground mb-6">
					The form you are looking for does not exist or you do not have permission to view it.
				</p>
				<Link href="/dashboard/forms">
					<Button variant="outline">Back to Forms</Button>
				</Link>
			</div>
		);
	}

	if (isSubmitted) {
		return (
			<div className="p-8 max-w-2xl mx-auto text-center space-y-6">
				<div className="bg-success/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
					<CheckCircle2 className="h-10 w-10 text-success" />
				</div>
				<div className="space-y-2">
					<h2 className="text-3xl font-bold text-foreground">Form Submitted!</h2>
					<p className="text-muted-foreground">
						Thank you for completing the <strong>{template.title}</strong> form
						{applyToAll ? " for all your children." : ` for ${currentChild.firstName}.`}
					</p>
				</div>
				<div className="pt-4">
					<Link href="/dashboard/forms">
						<Button className="w-full sm:w-auto">Back to Forms Dashboard</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="p-8 max-w-3xl mx-auto">
			<div className="mb-6">
				<Link
					href="/dashboard/forms"
					className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to all forms
				</Link>
			</div>

			<div className="mb-8">
				<div className="flex items-center gap-2 mb-2">
					<Badge variant="info">Form for {currentChild.firstName}</Badge>
				</div>
				<h1 className="text-3xl font-bold text-foreground">{template.title}</h1>
				{template.description && (
					<p className="text-muted-foreground mt-2">{template.description}</p>
				)}
			</div>

			{error && (
				<Alert variant="destructive" className="mb-6">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-8">
				<FormRenderer
					template={template as unknown as FormTemplate}
					onSubmit={handleSubmit}
					isSubmitting={submitMutation.isPending}
				/>

				{children.length > 1 && (
					<div className="bg-info/10 border border-info/20 p-4 rounded-lg flex items-start gap-3">
						<div className="p-2 bg-info/20 rounded-lg">
							<Users className="h-5 w-5 text-info" />
						</div>
						<div className="flex-1">
							<h4 className="font-semibold text-foreground">Apply to all children?</h4>
							<p className="text-sm text-muted-foreground mb-3">
								You have {otherChildren.length} other{" "}
								{otherChildren.length === 1 ? "child" : "children"} at this school. Would you like
								to submit this same response for them as well?
							</p>
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={applyToAll}
									onChange={(e) => setApplyToAll(e.target.checked)}
									className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
								/>
								<span className="text-sm font-medium text-foreground">
									Yes, submit for all my children
								</span>
							</label>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
