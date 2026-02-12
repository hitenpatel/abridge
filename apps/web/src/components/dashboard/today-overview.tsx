import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
	const getMarkVariant = (mark: string) => {
		switch (mark) {
			case "PRESENT":
				return "success" as const;
			case "LATE":
				return "warning" as const;
			case "ABSENT_UNAUTHORISED":
			case "ABSENT_AUTHORISED":
				return "destructive" as const;
			default:
				return "secondary" as const;
		}
	};

	const getPercentageColor = (percentage: number) => {
		if (percentage >= 95) return "text-success";
		if (percentage >= 90) return "text-warning";
		return "text-destructive";
	};

	const getMarkLabel = (mark: string) => {
		if (mark === "ABSENT_UNAUTHORISED") return "Absent";
		if (mark === "ABSENT_AUTHORISED") return "Absent";
		// Capitalize first letter
		return mark.charAt(0).toUpperCase() + mark.slice(1).toLowerCase();
	};

	return (
		<Card className="overflow-hidden h-full">
			<div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
				<h3 className="font-semibold text-foreground flex items-center gap-2">
					<Calendar className="h-5 w-5 text-muted-foreground" />
					Today's Overview
				</h3>
				<span className="text-xs text-muted-foreground font-medium bg-card px-2 py-1 rounded border border-border">
					{new Date().toLocaleDateString("en-GB", {
						weekday: "short",
						day: "numeric",
						month: "short",
					})}
				</span>
			</div>
			<div className="divide-y divide-border">
				{childrenData.map((child) => {
					const childAttendance = todayAttendance.filter((a) => a.childId === child.id);
					const amMark = childAttendance.find((a) => a.session === "AM")?.mark;
					const pmMark = childAttendance.find((a) => a.session === "PM")?.mark;
					const percentage =
						attendancePercentage.find((p) => p.childId === child.id)?.percentage ?? 0;

					return (
						<div
							key={child.id}
							className="p-4 flex items-center justify-between hover:bg-muted transition-colors"
						>
							<div>
								<p className="font-semibold text-foreground text-sm">
									{child.firstName} {child.lastName}
								</p>
								<div className="flex gap-2 mt-2">
									{amMark ? (
										<Badge variant={getMarkVariant(amMark)}>AM: {getMarkLabel(amMark)}</Badge>
									) : (
										<Badge variant="secondary">AM: —</Badge>
									)}
									{pmMark ? (
										<Badge variant={getMarkVariant(pmMark)}>PM: {getMarkLabel(pmMark)}</Badge>
									) : (
										<Badge variant="secondary">PM: —</Badge>
									)}
								</div>
							</div>
							<div className="text-right">
								<p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
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
					<div className="p-8 text-center text-muted-foreground italic">No children found.</div>
				)}
			</div>
		</Card>
	);
}
