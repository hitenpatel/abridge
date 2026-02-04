import { Calendar } from "lucide-react";

interface Child {
	id: string;
	firstName: string;
	lastName: string;
}

interface AttendanceRecord {
	childId: string;
	session: string; // "AM" | "PM"
	mark: string;
}

interface AttendancePercentage {
	childId: string;
	percentage: number;
}

interface TodayOverviewProps {
	childrenData: Child[];
	todayAttendance: AttendanceRecord[];
	attendancePercentage: AttendancePercentage[];
}

export function TodayOverview({
	childrenData,
	todayAttendance,
	attendancePercentage,
}: TodayOverviewProps) {
	const getMarkColor = (mark: string) => {
		switch (mark) {
			case "PRESENT":
				return "bg-green-100 text-green-700 border-green-200";
			case "LATE":
				return "bg-yellow-100 text-yellow-700 border-yellow-200";
			case "ABSENT_UNAUTHORISED":
			case "ABSENT_AUTHORISED":
				return "bg-red-100 text-red-700 border-red-200";
			default:
				return "bg-gray-100 text-gray-700 border-gray-200";
		}
	};

	const getPercentageColor = (percentage: number) => {
		if (percentage >= 95) return "text-green-600";
		if (percentage >= 90) return "text-yellow-600";
		return "text-red-600";
	};

	const getMarkLabel = (mark: string) => {
		if (mark === "ABSENT_UNAUTHORISED") return "Absent";
		if (mark === "ABSENT_AUTHORISED") return "Absent";
		// Capitalize first letter
		return mark.charAt(0).toUpperCase() + mark.slice(1).toLowerCase();
	};

	return (
		<div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden h-full">
			<div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
				<h3 className="font-semibold text-gray-900 flex items-center gap-2">
					<Calendar className="h-5 w-5 text-gray-500" />
					Today's Overview
				</h3>
				<span className="text-xs text-gray-500 font-medium bg-white px-2 py-1 rounded border border-gray-200">
					{new Date().toLocaleDateString("en-GB", {
						weekday: "short",
						day: "numeric",
						month: "short",
					})}
				</span>
			</div>
			<div className="divide-y divide-gray-100">
				{childrenData.map((child) => {
					const childAttendance = todayAttendance.filter((a) => a.childId === child.id);
					const amMark = childAttendance.find((a) => a.session === "AM")?.mark;
					const pmMark = childAttendance.find((a) => a.session === "PM")?.mark;
					const percentage =
						attendancePercentage.find((p) => p.childId === child.id)?.percentage ?? 0;

					return (
						<div
							key={child.id}
							className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
						>
							<div>
								<p className="font-semibold text-gray-900 text-sm">
									{child.firstName} {child.lastName}
								</p>
								<div className="flex gap-2 mt-2">
									<span
										className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${amMark ? getMarkColor(amMark) : "bg-gray-50 text-gray-400 border-gray-200"}`}
									>
										AM: {amMark ? getMarkLabel(amMark) : "—"}
									</span>
									<span
										className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${pmMark ? getMarkColor(pmMark) : "bg-gray-50 text-gray-400 border-gray-200"}`}
									>
										PM: {pmMark ? getMarkLabel(pmMark) : "—"}
									</span>
								</div>
							</div>
							<div className="text-right">
								<p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">
									Attendance
								</p>
								<p className={`text-xl font-bold ${getPercentageColor(percentage)}`}>
									{percentage}%
								</p>
							</div>
						</div>
					);
				})}
				{childrenData.length === 0 && (
					<div className="p-8 text-center text-gray-500 italic">No children found.</div>
				)}
			</div>
		</div>
	);
}
