"use client";

import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ThisWeek } from "@/components/dashboard/this-week";
import { TodayOverview } from "@/components/dashboard/today-overview";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { GraduationCap, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
	const { data: session, isPending: isAuthPending } = authClient.useSession();
	const router = useRouter();

	const {
		data: summaryData,
		isLoading: isSummaryLoading,
		error: summaryError,
	} = trpc.dashboard.getSummary.useQuery(undefined, {
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
				<div className="space-y-4 w-full max-w-md">
					<Skeleton className="h-8 w-48 mx-auto" />
					<Skeleton className="h-4 w-32 mx-auto" />
					<div className="grid grid-cols-3 gap-4 mt-6">
						<Skeleton className="h-24 w-full rounded-lg" />
						<Skeleton className="h-24 w-full rounded-lg" />
						<Skeleton className="h-24 w-full rounded-lg" />
					</div>
					<div className="grid grid-cols-2 gap-4 mt-4">
						<Skeleton className="h-48 w-full rounded-lg" />
						<Skeleton className="h-48 w-full rounded-lg" />
					</div>
				</div>
			</div>
		);
	}

	if (!session) return null;

	if (summaryError) {
		return (
			<div className="p-8 max-w-4xl mx-auto text-center text-destructive">
				Error loading dashboard: {summaryError.message}
			</div>
		);
	}

	return (
		<div className="p-8 max-w-5xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
					<p className="text-muted-foreground mt-1">Welcome back, {session.user.name}</p>
				</div>
			</div>

			{/* Summary Cards */}
			{summaryData && <SummaryCards data={summaryData.metrics} />}

			{/* Dashboard Widgets */}
			{summaryData && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
					<TodayOverview
						childrenData={summaryData.children}
						todayAttendance={summaryData.todayAttendance}
						attendancePercentage={summaryData.attendancePercentage}
					/>
					<ThisWeek
						events={summaryData.upcomingEvents.map((e) => ({
							id: e.id,
							title: e.title,
							date: e.startDate,
							type: e.category,
							description: e.body,
						}))}
					/>
				</div>
			)}

			{/* My Children Section */}
			<div className="mt-10">
				<h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
					<GraduationCap className="h-5 w-5" />
					My Children
				</h2>

				{summaryData?.children && summaryData.children.length > 0 ? (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{summaryData.children.map((child) => (
							<Card key={child.id}>
								<CardContent className="flex items-start gap-4 p-6">
									<div className="bg-primary/10 p-3 rounded-full">
										<User className="h-6 w-6 text-primary" />
									</div>
									<div>
										<h3 className="font-semibold text-foreground">
											{child.firstName} {child.lastName}
										</h3>
										{/* Placeholder for Year Group / School as they are not in the current API response */}
										<p className="text-sm text-muted-foreground mt-1">Student</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="bg-muted rounded-lg p-8 text-center border border-dashed border-border">
						<p className="text-muted-foreground">No children linked to your account.</p>
					</div>
				)}
			</div>
		</div>
	);
}
