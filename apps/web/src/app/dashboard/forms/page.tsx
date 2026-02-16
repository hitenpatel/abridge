"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { FileText } from "lucide-react";
import Link from "next/link";

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
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-warning flex items-center gap-1">
						<span className="material-symbols-rounded text-base">schedule</span>
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
												<span className="material-symbols-rounded text-warning">description</span>
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
											<span className="material-symbols-rounded text-base">chevron_right</span>
										</div>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</div>
			)}

			{completedForms && completedForms.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-success flex items-center gap-1">
						<span className="material-symbols-rounded text-base">check_circle</span>
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

export default function FormsPage() {
	const features = useFeatureToggles();
	if (!features.formsEnabled) return <FeatureDisabled featureName="Forms" />;

	const { data: summaryData, isLoading, error } = trpc.dashboard.getSummary.useQuery(undefined);

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
		<div className="p-8 max-w-5xl mx-auto">
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
