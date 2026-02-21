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
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORY_OPTIONS = [
	{ value: "EVENT", label: "Event" },
	{ value: "TERM_DATE", label: "Term Date" },
	{ value: "INSET_DAY", label: "Inset Day" },
	{ value: "DEADLINE", label: "Deadline" },
	{ value: "CLUB", label: "Club" },
];

export default function CalendarPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const utils = trpc.useUtils();
	const [showCreate, setShowCreate] = useState(false);
	const [title, setTitle] = useState("");
	const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
	const [category, setCategory] = useState("EVENT");

	const createMutation = trpc.calendar.createEvent.useMutation({
		onSuccess: () => {
			toast.success("Event created");
			utils.calendar.listEvents.invalidate();
			setShowCreate(false);
			setTitle("");
			setCategory("EVENT");
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
		});
	};

	return (
		<div className="max-w-4xl mx-auto">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<span className="material-symbols-rounded text-primary text-3xl">calendar_month</span>
					<h1 className="text-3xl font-bold text-slate-800">School Calendar</h1>
				</div>
				{session?.staffRole && (
					<Button data-testid="create-event-button" onClick={() => setShowCreate(true)}>
						<span className="material-symbols-rounded text-base mr-1">add</span>
						Create Event
					</Button>
				)}
			</div>
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
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreate(false)}>
							Cancel
						</Button>
						<Button
							data-testid="event-create-submit"
							onClick={handleCreate}
							disabled={createMutation.isPending || !title.trim()}
						>
							{createMutation.isPending ? "Creating..." : "Create Event"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
