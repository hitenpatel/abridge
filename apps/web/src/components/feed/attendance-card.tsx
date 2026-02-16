"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type AttendanceMark =
	| "PRESENT"
	| "LATE"
	| "ABSENT_AUTHORISED"
	| "ABSENT_UNAUTHORISED"
	| "NOT_REQUIRED";
type Session = "AM" | "PM";

interface AttendanceCardProps {
	childName: string;
	date: Date | string;
	session: Session;
	mark: AttendanceMark;
	note?: string | null;
}

const STATUS_CONFIG: Record<AttendanceMark, { color: string; label: string }> = {
	PRESENT: { color: "bg-green-500", label: "Present" },
	LATE: { color: "bg-yellow-500", label: "Late" },
	ABSENT_AUTHORISED: { color: "bg-red-400", label: "Absent (Auth)" },
	ABSENT_UNAUTHORISED: { color: "bg-red-600", label: "Absent (Unauth)" },
	NOT_REQUIRED: { color: "bg-gray-400", label: "Not Required" },
};

export function AttendanceCard({ childName, date, session, mark, note }: AttendanceCardProps) {
	const d = typeof date === "string" ? new Date(date) : date;
	const { color, label } = STATUS_CONFIG[mark];

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center gap-3">
					<span className={cn("h-3 w-3 rounded-full shrink-0", color)} />
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<p className="text-sm font-medium text-foreground truncate">{childName}</p>
							<span className="text-xs text-muted-foreground whitespace-nowrap">{session}</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="text-xs text-muted-foreground">{format(d, "d MMM yyyy")}</span>
							<span className="text-xs font-medium text-foreground">{label}</span>
						</div>
						{note && <p className="text-xs text-muted-foreground mt-1 truncate">{note}</p>}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
