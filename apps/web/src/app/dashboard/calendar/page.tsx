"use client";

import { EventList } from "@/components/calendar/event-list";
import { FeatureDisabled } from "@/components/feature-disabled";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORY_OPTIONS = [
	{ value: "EVENT", label: "Event" },
	{ value: "TERM_DATE", label: "Term Date" },
	{ value: "INSET_DAY", label: "Inset Day" },
	{ value: "DEADLINE", label: "Deadline" },
	{ value: "CLUB", label: "Club" },
];

const RECURRENCE_OPTIONS = [
	{ value: "", label: "No repeat" },
	{ value: "DAILY", label: "Daily" },
	{ value: "WEEKLY", label: "Weekly" },
	{ value: "BIWEEKLY", label: "Every 2 weeks" },
	{ value: "MONTHLY", label: "Monthly" },
];

export default function CalendarPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const utils = trpc.useUtils();
	const [showCreate, setShowCreate] = useState(false);
	const [title, setTitle] = useState("");
	const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0] ?? "");
	const [category, setCategory] = useState("EVENT");
	const [recurrencePattern, setRecurrencePattern] = useState("");
	const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
	const [rsvpRequired, setRsvpRequired] = useState(false);
	const [maxCapacity, setMaxCapacity] = useState("");

	const createMutation = trpc.calendar.createEvent.useMutation({
		onSuccess: () => {
			toast.success("Event created");
			utils.calendar.listEvents.invalidate();
			setShowCreate(false);
			setTitle("");
			setCategory("EVENT");
			setRecurrencePattern("");
			setRecurrenceEndDate("");
			setRsvpRequired(false);
			setMaxCapacity("");
		},
		onError: (err) => toast.error(err.message),
	});

	if (!features.calendarEnabled) return <FeatureDisabled featureName="Calendar" />;

	const handleCreate = () => {
		if (!session?.schoolId || !title.trim()) return;
		createMutation.mutate({
			schoolId: session.schoolId,
			title: title.trim(),
			startDate: new Date(startDate),
			allDay: true,
			// biome-ignore lint/suspicious/noExplicitAny: category string matches enum
			category: category as any,
			// biome-ignore lint/suspicious/noExplicitAny: recurrence string matches enum
			...(recurrencePattern ? { recurrencePattern: recurrencePattern as any } : {}),
			...(recurrenceEndDate ? { recurrenceEndDate: new Date(recurrenceEndDate) } : {}),
			rsvpRequired,
			...(maxCapacity ? { maxCapacity: Number.parseInt(maxCapacity, 10) } : {}),
		});
	};

	return (
		<PageShell>
			<PageHeader icon={CalendarDays} title="School Calendar" description="Upcoming events">
				{session?.staffRole && (
					<Button data-testid="create-event-button" onClick={() => setShowCreate(true)}>
						<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
						Create Event
					</Button>
				)}
			</PageHeader>
			<EventList />

			<Dialog open={showCreate} onOpenChange={setShowCreate}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Event</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="event-title">Title</Label>
							<Input
								id="event-title"
								data-testid="event-title-input"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Event title"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="event-start">Start Date</Label>
							<Input
								id="event-start"
								type="date"
								data-testid="event-start-date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="event-category">Category</Label>
							<select
								id="event-category"
								data-testid="event-category-select"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ring bg-card"
							>
								{CATEGORY_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="event-recurrence">Repeat</Label>
							<select
								id="event-recurrence"
								data-testid="event-recurrence-select"
								value={recurrencePattern}
								onChange={(e) => setRecurrencePattern(e.target.value)}
								className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ring bg-card"
							>
								{RECURRENCE_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
						{recurrencePattern && (
							<div className="space-y-2">
								<Label htmlFor="event-recurrence-end">Repeat Until</Label>
								<Input
									id="event-recurrence-end"
									type="date"
									data-testid="event-recurrence-end-date"
									value={recurrenceEndDate}
									onChange={(e) => setRecurrenceEndDate(e.target.value)}
									min={startDate}
								/>
							</div>
						)}
						<div className="flex items-center gap-2">
							<input
								id="event-rsvp-required"
								type="checkbox"
								data-testid="event-rsvp-required"
								checked={rsvpRequired}
								onChange={(e) => setRsvpRequired(e.target.checked)}
								className="rounded border-gray-300"
							/>
							<Label htmlFor="event-rsvp-required">Require RSVP</Label>
						</div>
						{rsvpRequired && (
							<div className="space-y-2">
								<Label htmlFor="event-max-capacity">Max Capacity (optional)</Label>
								<Input
									id="event-max-capacity"
									type="number"
									data-testid="event-max-capacity"
									value={maxCapacity}
									onChange={(e) => setMaxCapacity(e.target.value)}
									placeholder="Leave empty for unlimited"
									min="1"
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreate(false)}>
							Cancel
						</Button>
						<Button
							data-testid="event-create-submit"
							onClick={handleCreate}
							disabled={
								createMutation.isPending ||
								!title.trim() ||
								(!!recurrencePattern && !recurrenceEndDate)
							}
						>
							{createMutation.isPending ? "Creating..." : "Create Event"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageShell>
	);
}
