"use client";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { GraduationCap, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
	const { data: session, isPending: isAuthPending } = authClient.useSession();
	const router = useRouter();

	const { data: summaryData, isLoading: isSummaryLoading, error: summaryError } = 
		trpc.dashboard.getSummary.useQuery(undefined, {
			enabled: !!session,
		});

	useEffect(() => {
		if (!isAuthPending && !session) {
			router.push("/login");
		}
	}, [isAuthPending, session, router]);

	if (isAuthPending || (session && isSummaryLoading)) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
					<p className="text-gray-500">Loading dashboard...</p>
				</div>
			</div>
		);
	}

	if (!session) return null;

	if (summaryError) {
		return (
			<div className="p-8 max-w-4xl mx-auto text-center text-red-500">
				Error loading dashboard: {summaryError.message}
			</div>
		);
	}

	return (
		<div className="p-8 max-w-5xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-500 mt-1">
						Welcome back, {session.user.name}
					</p>
				</div>
				<Button
					variant="outline"
					onClick={async () => {
						await authClient.signOut();
						router.push("/login");
					}}
				>
					Sign Out
				</Button>
			</div>

			{/* Summary Cards */}
			{summaryData && <SummaryCards data={summaryData.metrics} />}

			{/* My Children Section */}
			<div className="mt-10">
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
					<GraduationCap className="h-5 w-5" />
					My Children
				</h2>
				
				{summaryData?.children && summaryData.children.length > 0 ? (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{summaryData.children.map((child) => (
							<div 
								key={child.id} 
								className="bg-white p-6 rounded-lg shadow border border-gray-100 flex items-start gap-4"
							>
								<div className="bg-primary-50 p-3 rounded-full">
									<User className="h-6 w-6 text-primary-600" />
								</div>
								<div>
									<h3 className="font-semibold text-gray-900">
										{child.firstName} {child.lastName}
									</h3>
									{/* Placeholder for Year Group / School as they are not in the current API response */}
									<p className="text-sm text-gray-500 mt-1">
										Student
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
						<p className="text-gray-500">No children linked to your account.</p>
					</div>
				)}
			</div>
		</div>
	);
}
