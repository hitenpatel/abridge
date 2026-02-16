"use client";

import { EventList } from "@/components/calendar/event-list";
import { FeatureDisabled } from "@/components/feature-disabled";
import { useFeatureToggles } from "@/lib/feature-toggles";

export default function CalendarPage() {
	const features = useFeatureToggles();
	if (!features.calendarEnabled) return <FeatureDisabled featureName="Calendar" />;

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
