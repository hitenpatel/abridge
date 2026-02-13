import { EventList } from "@/components/calendar/event-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Calendar | Abridge",
	description: "View school events and dates",
};

export default function CalendarPage() {
	return (
		<div className="max-w-4xl mx-auto">
			<div className="flex items-center gap-3 mb-6">
				<span className="material-symbols-rounded text-primary text-3xl">calendar_month</span>
				<h1 className="text-3xl font-bold text-slate-800">School Calendar</h1>
			</div>
			<EventList />
		</div>
	);
}
