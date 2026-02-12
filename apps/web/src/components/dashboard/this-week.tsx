import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Calendar, Clock } from "lucide-react";

export interface Event {
	id: string;
	title: string;
	date: Date | string;
	type: "TERM_DATE" | "INSET_DAY" | "EVENT" | "DEADLINE" | "CLUB";
	description?: string | null;
}

interface ThisWeekProps {
	events: Event[];
}

export function ThisWeek({ events }: ThisWeekProps) {
	const sortedEvents = [...events].sort((a, b) => {
		const dateA = new Date(a.date).getTime();
		const dateB = new Date(b.date).getTime();
		return dateA - dateB;
	});

	const getBadgeVariant = (type: Event["type"]) => {
		switch (type) {
			case "EVENT":
				return "info" as const;
			case "TERM_DATE":
				return "default" as const;
			case "INSET_DAY":
				return "warning" as const;
			case "DEADLINE":
				return "destructive" as const;
			case "CLUB":
				return "success" as const;
			default:
				return "secondary" as const;
		}
	};

	const formatEventDate = (date: Date | string) => {
		const d = typeof date === "string" ? parseISO(date) : date;
		return {
			day: format(d, "EEE"),
			date: format(d, "d MMM"),
		};
	};

	return (
		<Card className="overflow-hidden h-full">
			<div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
				<h3 className="font-semibold text-foreground flex items-center gap-2">
					<Calendar className="h-5 w-5 text-muted-foreground" />
					This Week
				</h3>
			</div>
			<div className="divide-y divide-border">
				{sortedEvents.length > 0 ? (
					sortedEvents.map((event) => {
						const { day, date } = formatEventDate(event.date);
						return (
							<div
								key={event.id}
								className="p-4 flex items-start gap-4 hover:bg-muted transition-colors"
							>
								<div className="flex-shrink-0 flex flex-col items-center justify-center bg-card border border-border rounded-lg w-14 h-14 shadow-sm">
									<span className="text-xs font-medium text-muted-foreground uppercase">{day}</span>
									<span className="text-lg font-bold text-foreground leading-none">
										{date.split(" ")[0]}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<Badge
											variant={getBadgeVariant(event.type)}
											className="text-[10px] uppercase tracking-wide"
										>
											{event.type.replace("_", " ")}
										</Badge>
									</div>
									<h4 className="text-sm font-semibold text-foreground truncate">{event.title}</h4>
									{event.description && (
										<p className="text-xs text-muted-foreground mt-1 line-clamp-1">
											{event.description}
										</p>
									)}
								</div>
							</div>
						);
					})
				) : (
					<div className="p-8 text-center text-muted-foreground italic flex flex-col items-center">
						<Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
						<p>No events this week.</p>
					</div>
				)}
			</div>
		</Card>
	);
}
