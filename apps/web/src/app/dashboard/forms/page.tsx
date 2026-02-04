"use client";

import { trpc } from "@/lib/trpc";
import { CheckCircle, ChevronRight, Clock, FileText } from "lucide-react";
import Link from "next/link";

function ChildFormsList({ childId, childName }: { childId: string; childName: string }) {
	const { data: pendingForms, isLoading: isPendingLoading } = trpc.forms.getPendingForms.useQuery({
		childId,
	});
	const { data: completedForms, isLoading: isCompletedLoading } =
		trpc.forms.getCompletedForms.useQuery({ childId });

	if (isPendingLoading || isCompletedLoading) {
		return (
			<div className="animate-pulse space-y-4">
				<div className="h-8 bg-gray-200 rounded w-1/4" />
				<div className="h-20 bg-gray-100 rounded" />
			</div>
		);
	}

	const hasForms =
		(pendingForms && pendingForms.length > 0) || (completedForms && completedForms.length > 0);

	if (!hasForms) return null;

	return (
		<div className="space-y-6 mb-10">
			<div className="flex items-center gap-2 border-b border-gray-100 pb-2">
				<h2 className="text-xl font-semibold text-gray-900">{childName}</h2>
			</div>

			{pendingForms && pendingForms.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-amber-600 flex items-center gap-1">
						<Clock className="h-4 w-4" />
						Action Required
					</h3>
					<div className="grid gap-3">
						{pendingForms.map((template) => (
							<Link
								key={template.id}
								href={`/dashboard/forms/${template.id}?childId=${childId}`}
								className="group flex items-center justify-between p-4 bg-white border border-amber-100 rounded-lg shadow-sm hover:border-amber-300 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-amber-50 rounded-lg">
										<FileText className="h-5 w-5 text-amber-600" />
									</div>
									<div>
										<h4 className="font-medium text-gray-900">{template.title}</h4>
										{template.description && (
											<p className="text-sm text-gray-500 line-clamp-1">{template.description}</p>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
									Complete
									<ChevronRight className="h-4 w-4" />
								</div>
							</Link>
						))}
					</div>
				</div>
			)}

			{completedForms && completedForms.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-emerald-600 flex items-center gap-1">
						<CheckCircle className="h-4 w-4" />
						Completed
					</h3>
					<div className="grid gap-3">
						{/* biome-ignore lint/suspicious/noExplicitAny: UI component */}
						{completedForms.map((response: any) => (
							<div
								key={response.id}
								className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg opacity-75"
							>
								<div className="flex items-center gap-3">
									<div className="p-2 bg-gray-100 rounded-lg">
										<FileText className="h-5 w-5 text-gray-400" />
									</div>
									<div>
										<h4 className="font-medium text-gray-700">{response.template.title}</h4>
										<p className="text-xs text-gray-400">
											Submitted on {new Date(response.submittedAt).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
									Submitted
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default function FormsPage() {
	const { data: summaryData, isLoading, error } = trpc.dashboard.getSummary.useQuery(undefined);

	if (isLoading) {
		return (
			<div className="p-8 max-w-5xl mx-auto space-y-8">
				<div className="animate-pulse h-10 bg-gray-200 rounded w-1/4" />
				<div className="space-y-4">
					<div className="h-32 bg-gray-100 rounded" />
					<div className="h-32 bg-gray-100 rounded" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8 max-w-5xl mx-auto text-center text-red-500">
				Error loading forms: {error.message}
			</div>
		);
	}

	const children = summaryData?.children || [];

	return (
		<div className="p-8 max-w-5xl mx-auto">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Forms & Consent</h1>
				<p className="text-gray-500 mt-1">
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
				<div className="bg-gray-50 rounded-lg p-12 text-center border border-dashed border-gray-300">
					<FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
					<p className="text-gray-500">No forms available at this time.</p>
				</div>
			)}
		</div>
	);
}
