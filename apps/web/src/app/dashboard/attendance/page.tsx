"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AttendancePage() {
	const { data: childrenLinks, isLoading } = trpc.user.listChildren.useQuery();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [selectedReason, setSelectedReason] = useState("sick");
	const [currentMonth, setCurrentMonth] = useState(new Date());

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (!childrenLinks || childrenLinks.length === 0) {
		return (
			<Card className="p-12 text-center">
				<h3 className="mt-2 text-sm font-semibold">No children found</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					You need to have children linked to your account to view attendance.
				</p>
			</Card>
		);
	}

	const firstChild = childrenLinks[0];
	const activeChildId = selectedChildId || firstChild.childId;
	const activeChild = childrenLinks.find((link) => link.childId === activeChildId)?.child;

	// Generate calendar days for current month
	const year = currentMonth.getFullYear();
	const month = currentMonth.getMonth();
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const daysInMonth = lastDay.getDate();
	const startingDayOfWeek = firstDay.getDay();

	const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

	// Mock attendance data (in real app, fetch from API)
	const attendanceData: Record<number, "present" | "late" | "absent"> = {
		1: "present",
		2: "present",
		3: "late",
		4: "present",
		7: "present",
		8: "absent",
		9: "present",
		10: "present",
		11: "present",
		14: "late",
		15: "present",
		16: "present",
		17: "present",
		18: "present",
		21: "present",
		22: "present",
		23: "present",
	};

	const getAttendanceColor = (status: string) => {
		switch (status) {
			case "present":
				return "bg-green-400";
			case "late":
				return "bg-yellow-400";
			case "absent":
				return "bg-primary";
			default:
				return "bg-gray-300";
		}
	};

	const getAttendanceBg = (status: string) => {
		switch (status) {
			case "late":
				return "border-yellow-100 bg-yellow-50";
			case "absent":
				return "border-red-100 bg-red-50";
			default:
				return "border-gray-100 bg-white";
		}
	};

	const today = new Date().getDate();
	const isToday = (day: number) => {
		const now = new Date();
		return (
			day === now.getDate() &&
			month === now.getMonth() &&
			year === now.getFullYear()
		);
	};

	return (
		<div>
			{/* Header */}
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h2 className="text-3xl font-bold text-slate-800">Attendance Hub</h2>
						<span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-lg">
							95% Present
						</span>
					</div>
					{childrenLinks.length > 1 && (
						<div className="flex gap-2 mt-3">
							{childrenLinks.map((link) => (
								<button
									key={link.childId}
									type="button"
									onClick={() => setSelectedChildId(link.childId)}
									className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
										activeChildId === link.childId
											? "bg-primary text-white"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
								>
									{link.child.firstName}
								</button>
							))}
						</div>
					)}
				</div>
				<button
					type="button"
					className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-soft text-sm font-medium hover:scale-105 transition-transform"
				>
					<span className="material-symbols-rounded text-primary">download</span>
					<span>Export Log</span>
				</button>
			</header>

			{/* Main Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* Calendar Column */}
				<div className="lg:col-span-7">
					<Card className="p-6 rounded-2xl shadow-soft">
						{/* Month Navigation */}
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-bold flex items-center gap-2">
								<span className="material-symbols-rounded text-secondary text-2xl">
									calendar_today
								</span>
								{monthName}
							</h3>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => {
										const prev = new Date(currentMonth);
										prev.setMonth(prev.getMonth() - 1);
										setCurrentMonth(prev);
									}}
									className="p-2 hover:bg-gray-100 rounded-full transition-colors"
								>
									<span className="material-symbols-rounded">chevron_left</span>
								</button>
								<button
									type="button"
									onClick={() => {
										const next = new Date(currentMonth);
										next.setMonth(next.getMonth() + 1);
										setCurrentMonth(next);
									}}
									className="p-2 hover:bg-gray-100 rounded-full transition-colors"
								>
									<span className="material-symbols-rounded">chevron_right</span>
								</button>
							</div>
						</div>

						{/* Calendar Grid */}
						<div className="grid grid-cols-7 gap-2 mb-4">
							{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
								<div
									key={day}
									className="text-center text-xs font-bold text-gray-500 uppercase tracking-wide"
								>
									{day}
								</div>
							))}
						</div>

						<div className="grid grid-cols-7 gap-2">
							{/* Empty cells for days before month starts */}
							{Array.from({ length: startingDayOfWeek }).map((_, i) => (
								<div key={`empty-${i}`} className="h-24 p-2 rounded-xl bg-gray-50 opacity-50" />
							))}

							{/* Calendar days */}
							{Array.from({ length: daysInMonth }).map((_, i) => {
								const day = i + 1;
								const status = attendanceData[day];
								const isWeekend = new Date(year, month, day).getDay() % 6 === 0;

								if (isWeekend && !status) {
									return (
										<div
											key={day}
											className="h-24 p-2 rounded-xl bg-gray-50 text-gray-400"
										>
											<span className="text-sm font-bold">{day}</span>
										</div>
									);
								}

								if (isToday(day)) {
									return (
										<div
											key={day}
											className="h-24 p-2 rounded-xl ring-2 ring-primary ring-offset-2 border border-primary bg-primary/10 relative group"
										>
											<span className="text-sm font-bold text-primary">{day}</span>
											<div className="absolute bottom-3 right-3 w-3 h-3 bg-gray-300 rounded-full shadow-sm animate-pulse" />
											<div className="absolute top-2 right-2 text-[10px] font-bold text-primary uppercase">
												Today
											</div>
										</div>
									);
								}

								return (
									<div
										key={day}
										className={`h-24 p-2 rounded-xl border hover:border-secondary transition-colors relative group ${getAttendanceBg(status || "")}`}
									>
										<span className="text-sm font-bold text-gray-700">{day}</span>
										{status && (
											<div
												className={`absolute bottom-3 right-3 w-3 h-3 ${getAttendanceColor(status)} rounded-full shadow-sm`}
											/>
										)}
										{status === "late" && (
											<div className="hidden group-hover:block absolute top-1 left-1 bg-white text-[10px] p-1 rounded shadow text-yellow-600 font-bold">
												15m Late
											</div>
										)}
										{status === "absent" && (
											<div className="hidden group-hover:block absolute top-1 left-1 bg-white text-[10px] p-1 rounded shadow text-primary font-bold">
												Sick Day
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Legend */}
						<div className="flex flex-wrap gap-4 mt-6 text-sm">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-green-400 rounded-full" />
								<span className="text-gray-500 font-medium">Present</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-yellow-400 rounded-full" />
								<span className="text-gray-500 font-medium">Late</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-primary rounded-full" />
								<span className="text-gray-500 font-medium">Absent</span>
							</div>
						</div>
					</Card>
				</div>

				{/* Right Column */}
				<div className="lg:col-span-5 space-y-6">
					{/* Status Banner */}
					{activeChild && (
						<div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-100">
							<div className="flex items-start gap-4">
								<div className="bg-secondary p-3 rounded-full text-white shadow-md">
									<span className="material-symbols-rounded text-2xl">wb_sunny</span>
								</div>
								<div>
									<h4 className="font-bold text-lg mb-1">{activeChild.firstName} is at School</h4>
									<p className="text-sm text-gray-500">Checked in at 8:15 AM • On Time</p>
								</div>
								<div className="ml-auto">
									<span className="material-symbols-rounded text-green-500 bg-white rounded-full p-1">
										check_circle
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Absence Report Form */}
					<Card className="p-6 md:p-8 rounded-2xl shadow-soft">
						<h3 className="text-xl font-bold mb-6 flex items-center gap-2">
							<span className="material-symbols-rounded text-primary text-2xl">
								add_moderator
							</span>
							Report Upcoming Absence
						</h3>

						<form className="space-y-6">
							<div>
								<label className="block text-sm font-bold text-gray-500 mb-2">
									Select Date(s)
								</label>
								<div className="relative">
									<span className="material-symbols-rounded absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
										date_range
									</span>
									<input
										type="date"
										className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent font-semibold transition-all"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-bold text-gray-500 mb-3">
									Reason for Absence
								</label>
								<div className="grid grid-cols-2 gap-4">
									{[
										{ value: "sick", icon: "sick", label: "Sick / Ill", color: "red" },
										{
											value: "appointment",
											icon: "medical_services",
											label: "Appointment",
											color: "blue",
										},
										{ value: "trip", icon: "flight", label: "Family/Trip", color: "yellow" },
										{ value: "other", icon: "more_horiz", label: "Other", color: "gray" },
									].map((reason) => (
										<label key={reason.value} className="cursor-pointer group">
											<input
												type="radio"
												name="reason"
												value={reason.value}
												checked={selectedReason === reason.value}
												onChange={(e) => setSelectedReason(e.target.value)}
												className="peer sr-only"
											/>
											<div className="p-4 rounded-xl border-2 border-gray-100 bg-gray-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all text-center flex flex-col items-center gap-2 h-32 justify-center hover:bg-gray-100">
												<div
													className={`w-12 h-12 rounded-full bg-${reason.color}-100 text-${reason.color}-500 flex items-center justify-center mb-1`}
												>
													<span className="material-symbols-rounded text-2xl">
														{reason.icon}
													</span>
												</div>
												<span className="font-bold text-sm text-gray-700">{reason.label}</span>
											</div>
										</label>
									))}
								</div>
							</div>

							<div>
								<label className="block text-sm font-bold text-gray-500 mb-2">
									Note for Teacher (Optional)
								</label>
								<textarea
									className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
									placeholder="E.g., Leo has a dentist appointment at 10am..."
									rows={3}
								/>
							</div>

							<button
								type="submit"
								className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
							>
								Submit Absence Report
								<span className="material-symbols-rounded">send</span>
							</button>

							<p className="text-center text-xs text-gray-500">
								This will notify the teacher and school office immediately.
							</p>
						</form>
					</Card>
				</div>
			</div>
		</div>
	);
}
