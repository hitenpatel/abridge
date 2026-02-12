import { EventList } from "@/components/calendar/event-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Calendar | SchoolConnect",
	description: "View school events and dates",
};

export default function CalendarPage() {
	return (
		<div className="max-w-4xl mx-auto">
			<h1 className="text-2xl font-bold text-foreground mb-6">School Calendar</h1>
			<EventList />
		</div>
	);
}
