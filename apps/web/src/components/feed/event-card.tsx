"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

type EventCategory = "TERM_DATE" | "INSET_DAY" | "EVENT" | "DEADLINE" | "CLUB";

interface EventCardProps {
	title: string;
	startDate: Date | string;
	endDate?: Date | string | null;
	category: EventCategory;
	allDay?: boolean;
}

const CATEGORY_VARIANT: Record<
	EventCategory,
	"info" | "warning" | "success" | "destructive" | "default"
> = {
	TERM_DATE: "info",
	INSET_DAY: "warning",
	EVENT: "success",
	DEADLINE: "destructive",
	CLUB: "default",
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
	TERM_DATE: "Term Date",
	INSET_DAY: "Inset Day",
	EVENT: "Event",
	DEADLINE: "Deadline",
	CLUB: "Club",
};

export function EventCard({ title, startDate, category, allDay }: EventCardProps) {
	const start = typeof startDate === "string" ? new Date(startDate) : startDate;

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
						<Calendar className="h-4 w-4 text-purple-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-foreground truncate">{title}</p>
						<div className="flex items-center gap-2 mt-1">
							<Badge variant={CATEGORY_VARIANT[category]}>{CATEGORY_LABELS[category]}</Badge>
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								{format(start, "d MMM yyyy")}
							</span>
						</div>
						{!allDay && (
							<div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
								<Clock className="h-3 w-3" />
								<span>{format(start, "h:mm a")}</span>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
