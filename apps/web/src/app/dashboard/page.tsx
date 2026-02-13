"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
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

	const firstName = session.user.name?.split(" ")[0] || "there";
	const currentDate = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "short",
		day: "numeric",
	});

	const firstChild = summaryData?.children?.[0];
	const attendancePercentage = summaryData?.attendancePercentage ?? 0;

	return (
		<div>
			{/* Header */}
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
						{currentDate}
					</p>
					<div className="flex items-center gap-2">
						<h2 className="text-3xl font-bold text-slate-800">Hi, {firstName}!</h2>
						<span className="text-3xl animate-bounce">👋</span>
					</div>
				</div>
				<div className="flex gap-4">
					<button
						type="button"
						className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-soft text-sm font-medium hover:scale-105 transition-transform"
					>
						<span className="material-symbols-rounded text-primary">add_circle</span>
						<span>Quick Update</span>
					</button>
					<button
						type="button"
						className="relative p-2 bg-white rounded-xl shadow-soft hover:scale-105 transition-transform"
					>
						<span className="material-symbols-rounded text-gray-600">notifications</span>
						<span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
					</button>
				</div>
			</header>

			{/* Main Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column */}
				<div className="lg:col-span-2 space-y-6">
					{/* Hero Card - Child Status */}
					{firstChild && (
						<Card className="bg-gradient-to-r from-primary to-orange-400 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group hover:shadow-glow transition-shadow duration-300 border-0">
							<div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
							<div className="absolute right-20 -bottom-10 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl" />
							<div className="relative z-10 flex items-center gap-4 sm:gap-6">
								<div className="relative">
									<div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white/30 p-1 bg-white overflow-hidden shadow-md">
										<div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
											<span className="material-symbols-rounded text-4xl text-primary">
												person
											</span>
										</div>
									</div>
									<div className="absolute bottom-0 right-0 w-6 h-6 bg-green-400 border-4 border-primary rounded-full" />
								</div>
								<div>
									<div className="flex items-center gap-2 mb-1">
										<h3 className="text-xl sm:text-2xl font-bold">
											{firstChild.firstName} is at School
										</h3>
										<span className="material-symbols-rounded bg-white/20 p-1 rounded-full text-sm">
											check
										</span>
									</div>
									<p className="text-white/90 text-sm sm:text-base font-medium">
										Checked in today
									</p>
									<div className="mt-3 flex gap-2">
										<span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm">
											Student
										</span>
									</div>
								</div>
							</div>
						</Card>
					)}

					{/* Quick Actions */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<Link
							href="/dashboard/calendar"
							className="bg-card p-4 rounded-2xl shadow-soft hover:shadow-md transition-all group text-center flex flex-col items-center justify-center gap-2 border border-transparent hover:border-blue-100"
						>
							<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
								<span className="material-symbols-rounded">restaurant_menu</span>
							</div>
							<span className="text-sm font-semibold text-gray-700">Lunch Menu</span>
						</Link>
						<Link
							href="/dashboard/calendar"
							className="bg-card p-4 rounded-2xl shadow-soft hover:shadow-md transition-all group text-center flex flex-col items-center justify-center gap-2 border border-transparent hover:border-purple-100"
						>
							<div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
								<span className="material-symbols-rounded">event</span>
							</div>
							<span className="text-sm font-semibold text-gray-700">Calendar</span>
						</Link>
						<Link
							href="/dashboard/attendance"
							className="bg-card p-4 rounded-2xl shadow-soft hover:shadow-md transition-all group text-center flex flex-col items-center justify-center gap-2 border border-transparent hover:border-green-100"
						>
							<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
								<span className="material-symbols-rounded">medical_services</span>
							</div>
							<span className="text-sm font-semibold text-gray-700">Sick Note</span>
						</Link>
						<Link
							href="/dashboard"
							className="bg-card p-4 rounded-2xl shadow-soft hover:shadow-md transition-all group text-center flex flex-col items-center justify-center gap-2 border border-transparent hover:border-yellow-100"
						>
							<div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform">
								<span className="material-symbols-rounded">emoji_events</span>
							</div>
							<span className="text-sm font-semibold text-gray-700">Awards</span>
						</Link>
					</div>

					{/* Today & Upcoming */}
					<div>
						<div className="flex items-center justify-between mt-8 mb-4">
							<h3 className="text-xl font-bold text-slate-800">Today & Upcoming</h3>
							<Link href="/dashboard/calendar" className="text-sm font-medium text-primary hover:text-primary/80">
								View All
							</Link>
						</div>
						<div className="space-y-4">
							{summaryData?.upcomingEvents && summaryData.upcomingEvents.length > 0 ? (
								summaryData.upcomingEvents.slice(0, 3).map((event) => (
									<Card
										key={event.id}
										className="p-6 rounded-2xl shadow-soft border-l-4 border-secondary flex flex-col sm:flex-row gap-4 items-start sm:items-center"
									>
										<div className="w-12 h-12 rounded-full bg-secondary/20 flex-shrink-0 flex items-center justify-center text-yellow-600">
											<span className="material-symbols-rounded">event</span>
										</div>
										<div className="flex-1">
											<div className="flex justify-between items-center mb-1">
												<h4 className="font-bold text-slate-800 text-lg">{event.title}</h4>
												<span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold uppercase rounded-md">
													Upcoming
												</span>
											</div>
											<p className="text-gray-500 text-sm leading-relaxed">
												{event.body || "Event details coming soon"}
											</p>
										</div>
									</Card>
								))
							) : (
								<Card className="p-8 text-center text-gray-500">
									<span className="material-symbols-rounded text-4xl mb-2 text-gray-300">
										calendar_today
									</span>
									<p>No upcoming events</p>
								</Card>
							)}
						</div>
					</div>
				</div>

				{/* Right Column */}
				<div className="space-y-6">
					{/* This Week's Progress */}
					<Card className="p-6 rounded-3xl shadow-soft">
						<h3 className="text-lg font-bold text-slate-800 mb-6">This Week's Progress</h3>
						<div className="space-y-6">
							<div>
								<div className="flex justify-between items-center mb-2">
									<div className="flex items-center gap-2">
										<span className="material-symbols-rounded text-gray-400 text-sm">
											calendar_today
										</span>
										<span className="text-sm font-semibold text-gray-700">Attendance</span>
									</div>
									<span className="text-sm font-bold text-slate-800">
										{Math.round(attendancePercentage)}%
									</span>
								</div>
								<div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
									<div
										className="h-full bg-secondary rounded-full transition-all"
										style={{ width: `${attendancePercentage}%` }}
									/>
								</div>
							</div>
							<div>
								<div className="flex justify-between items-center mb-2">
									<div className="flex items-center gap-2">
										<span className="material-symbols-rounded text-gray-400 text-sm">
											handshake
										</span>
										<span className="text-sm font-semibold text-gray-700">Participation</span>
									</div>
									<span className="text-sm font-bold text-slate-800">Good</span>
								</div>
								<div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
									<div className="h-full bg-slate-800 rounded-full" style={{ width: "75%" }} />
								</div>
							</div>
						</div>
					</Card>

					{/* Achievements */}
					<Card className="p-6 rounded-3xl shadow-soft">
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-lg font-bold text-slate-800">Achievements</h3>
							<Link href="/dashboard" className="text-xs font-bold text-primary hover:underline">
								View All
							</Link>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="flex flex-col items-center p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
								<div className="w-10 h-10 mb-2 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
									<span className="material-symbols-rounded">menu_book</span>
								</div>
								<span className="text-xs font-semibold text-center text-gray-700">Star Reader</span>
							</div>
							<div className="flex flex-col items-center p-3 rounded-2xl bg-pink-50 hover:bg-pink-100 transition-colors cursor-pointer">
								<div className="w-10 h-10 mb-2 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
									<span className="material-symbols-rounded">volunteer_activism</span>
								</div>
								<span className="text-xs font-semibold text-center text-gray-700">Kindness</span>
							</div>
							<div className="flex flex-col items-center p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
								<div className="w-10 h-10 mb-2 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
									<span className="material-symbols-rounded">functions</span>
								</div>
								<span className="text-xs font-semibold text-center text-gray-700">Math Whiz</span>
							</div>
							<div className="flex flex-col items-center p-3 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
								<div className="w-10 h-10 mb-2 rounded-full bg-green-100 flex items-center justify-center text-green-500">
									<span className="material-symbols-rounded">eco</span>
								</div>
								<span className="text-xs font-semibold text-center text-gray-700">Nature Scout</span>
							</div>
						</div>
					</Card>

					{/* Up Next */}
					<Card className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-3xl shadow-soft border border-yellow-100">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-secondary font-bold text-lg border border-yellow-100">
								{new Date().getDate()}
							</div>
							<div className="flex-1">
								<p className="text-xs font-bold text-secondary uppercase tracking-wider mb-1">
									Up Next
								</p>
								<h4 className="font-bold text-slate-800 leading-tight">Check your messages</h4>
							</div>
							<button
								type="button"
								className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-primary transition-colors shadow-sm"
							>
								<span className="material-symbols-rounded">chevron_right</span>
							</button>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
