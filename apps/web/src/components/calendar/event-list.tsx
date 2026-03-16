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
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	Clock,
	Repeat,
	Trash2,
	Users,
} from "lucide-react";
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

const RECURRENCE_LABELS: Record<string, string> = {
	DAILY: "Daily",
	WEEKLY: "Weekly",
	BIWEEKLY: "Fortnightly",
	MONTHLY: "Monthly",
};

function RsvpButtons({ eventId }: { eventId: string }) {
	const utils = trpc.useUtils();
	const { data: children } = trpc.user.listChildren.useQuery();
	const { data: rsvps } = trpc.calendar.getRsvps.useQuery({ eventId });

	const rsvpMutation = trpc.calendar.rsvpToEvent.useMutation({
		onSuccess: () => {
			toast.success("RSVP saved");
			utils.calendar.getRsvps.invalidate({ eventId });
		},
		onError: (err) => toast.error(err.message),
	});

	if (!children?.length) return null;

	return (
		<div className="mt-3 space-y-2 border-t pt-3">
			{children.map((pc) => {
				const childRsvp = rsvps?.find((r) => r.childId === pc.child.id);
				return (
					<div key={pc.child.id} className="flex items-center gap-2 flex-wrap">
						<span className="text-sm font-medium min-w-[80px]">{pc.child.firstName}:</span>
						{(["YES", "NO", "MAYBE"] as const).map((response) => (
							<button
								key={response}
								type="button"
								data-testid={`rsvp-${response.toLowerCase()}-${pc.child.id}`}
								onClick={() =>
									rsvpMutation.mutate({
										eventId,
										childId: pc.child.id,
										response,
									})
								}
								disabled={rsvpMutation.isPending}
								className={`px-3 py-1 text-xs rounded-full border transition-colors ${
									childRsvp?.response === response
										? response === "YES"
											? "bg-green-100 border-green-400 text-green-800"
											: response === "NO"
												? "bg-red-100 border-red-400 text-red-800"
												: "bg-yellow-100 border-yellow-400 text-yellow-800"
										: "bg-muted hover:bg-accent"
								}`}
							>
								{response === "YES" ? "Yes" : response === "NO" ? "No" : "Maybe"}
							</button>
						))}
					</div>
				);
			})}
		</div>
	);
}

function RsvpHeadcount({ eventId, schoolId }: { eventId: string; schoolId: string }) {
	const { data: summary } = trpc.calendar.getRsvpSummary.useQuery({ schoolId, eventId });

	if (!summary) return null;

	const yesCount = summary.counts.find((c) => c.response === "YES")?.count ?? 0;
	const capacityText = summary.maxCapacity ? `/${summary.maxCapacity}` : "";

	return (
		<Badge variant="outline" className="gap-1" data-testid="rsvp-headcount">
			<Users className="w-3 h-3" />
			{yesCount}
			{capacityText} attending
		</Badge>
	);
}

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

	const isParent = session?.isParent && !session?.staffRole;
	const isStaff = !!session?.staffRole;

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
						events.map((event) => {
							// biome-ignore lint/suspicious/noExplicitAny: event shape varies
							const evt = event as any;
							return (
								<Card
									key={event.id}
									className="hover:shadow-md transition-shadow"
									data-testid="calendar-event"
								>
									<CardContent className="p-4">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1 flex-wrap">
													<Badge variant={CATEGORY_BADGE_VARIANT[event.category] || "secondary"}>
														{CATEGORY_LABELS[event.category] || event.category}
													</Badge>
													{"recurrencePattern" in event && event.recurrencePattern && (
														<Badge variant="outline" className="gap-1">
															<Repeat className="w-3 h-3" />
															{RECURRENCE_LABELS[event.recurrencePattern as string] || "Recurring"}
														</Badge>
													)}
													{evt.rsvpRequired && isStaff && session?.schoolId && (
														<RsvpHeadcount
															eventId={
																event.id.includes("_")
																	? (event.id.split("_")[0] ?? event.id)
																	: event.id
															}
															schoolId={session.schoolId}
														/>
													)}
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
												{evt.rsvpRequired && isParent && (
													<RsvpButtons
														eventId={
															event.id.includes("_")
																? (event.id.split("_")[0] ?? event.id)
																: event.id
														}
													/>
												)}
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
							);
						})
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
							{eventToDelete?.includes("_") &&
								" This will delete all occurrences of this recurring event."}
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
