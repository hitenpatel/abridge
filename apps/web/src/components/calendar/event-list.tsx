"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { addMonths, endOfMonth, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORY_BADGE_VARIANT: Record<
	string,
	"info" | "warning" | "success" | "destructive" | "default"
> = {
	TERM_DATE: "info",
	INSET_DAY: "warning",
	EVENT: "success",
	DEADLINE: "destructive",
	CLUB: "default",
};

const CATEGORY_LABELS: Record<string, string> = {
	TERM_DATE: "Term Date",
	INSET_DAY: "Inset Day",
	EVENT: "Event",
	DEADLINE: "Deadline",
	CLUB: "Club",
};

export function EventList() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [eventToDelete, setEventToDelete] = useState<string | null>(null);

	const startDate = startOfMonth(currentDate);
	const endDate = endOfMonth(currentDate);

	const { data: session } = trpc.auth.getSession.useQuery();
	const utils = trpc.useUtils();

	const { data: events, isLoading } = trpc.calendar.listEvents.useQuery({
		startDate,
		endDate,
		// biome-ignore lint/suspicious/noExplicitAny: category string matches enum
		...(categoryFilter ? { category: categoryFilter as any } : {}),
	});

	const deleteMutation = trpc.calendar.deleteEvent.useMutation({
		onSuccess: () => {
			toast.success("Event deleted");
			utils.calendar.listEvents.invalidate();
			setEventToDelete(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const handlePreviousMonth = () => {
		setCurrentDate((prev) => subMonths(prev, 1));
	};

	const handleNextMonth = () => {
		setCurrentDate((prev) => addMonths(prev, 1));
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="text-muted-foreground">Loading events...</div>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-6" data-testid="calendar-view">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-foreground">{format(currentDate, "MMMM yyyy")}</h2>
					<div className="flex space-x-2">
						<button
							type="button"
							onClick={handlePreviousMonth}
							className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
							aria-label="Previous month"
						>
							<ChevronLeft className="w-5 h-5" />
						</button>
						<button
							type="button"
							onClick={handleNextMonth}
							className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
							aria-label="Next month"
						>
							<ChevronRight className="w-5 h-5" />
						</button>
					</div>
				</div>

				<div className="flex gap-2 flex-wrap mb-4">
					<button
						type="button"
						onClick={() => setCategoryFilter(null)}
						className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
							!categoryFilter
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-accent"
						}`}
					>
						All
					</button>
					{Object.entries(CATEGORY_LABELS).map(([key, label]) => (
						<button
							key={key}
							type="button"
							data-testid={`calendar-filter-${key.toLowerCase().replace("_", "-")}`}
							onClick={() => setCategoryFilter(key)}
							className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
								categoryFilter === key
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:bg-accent"
							}`}
						>
							{label}
						</button>
					))}
				</div>

				<div className="space-y-4">
					{events && events.length > 0 ? (
						events.map((event) => (
							<Card
								key={event.id}
								className="hover:shadow-md transition-shadow"
								data-testid="calendar-event"
							>
								<CardContent className="p-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<Badge variant={CATEGORY_BADGE_VARIANT[event.category] || "secondary"}>
													{CATEGORY_LABELS[event.category] || event.category}
												</Badge>
												<span className="text-sm text-muted-foreground flex items-center gap-1">
													<CalendarIcon className="w-3 h-3" />
													{format(event.startDate, "d MMM yyyy")}
												</span>
											</div>
											<h3 className="text-lg font-medium text-foreground">{event.title}</h3>
											{event.body && (
												<p className="mt-1 text-sm text-muted-foreground line-clamp-2">
													{event.body}
												</p>
											)}
											<div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
												{!event.allDay && (
													<div className="flex items-center gap-1">
														<Clock className="w-4 h-4" />
														<span>
															{format(event.startDate, "h:mm a")}
															{event.endDate && !isSameDay(event.startDate, event.endDate)
																? ` - ${format(event.endDate, "h:mm a")}`
																: event.endDate
																	? ` - ${format(event.endDate, "h:mm a")}`
																	: ""}
														</span>
													</div>
												)}
											</div>
										</div>
										{session?.staffRole && (
											<button
												type="button"
												data-testid="event-delete-button"
												onClick={() => setEventToDelete(event.id)}
												className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										)}
									</div>
								</CardContent>
							</Card>
						))
					) : (
						<div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed border-border">
							<CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
							<p className="text-muted-foreground font-medium">No events found for this month</p>
						</div>
					)}
				</div>
			</div>

			<Dialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Event</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this event? This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEventToDelete(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							data-testid="confirm-delete-event"
							onClick={() =>
								eventToDelete &&
								session?.schoolId &&
								deleteMutation.mutate({ schoolId: session.schoolId, eventId: eventToDelete })
							}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
