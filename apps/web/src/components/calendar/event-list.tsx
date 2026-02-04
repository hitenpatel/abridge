"use client";

import { trpc } from "@/lib/trpc";
import { addMonths, endOfMonth, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";

const CATEGORY_COLORS: Record<string, string> = {
	TERM_DATE: "bg-blue-100 text-blue-800",
	INSET_DAY: "bg-orange-100 text-orange-800",
	EVENT: "bg-green-100 text-green-800",
	DEADLINE: "bg-red-100 text-red-800",
	CLUB: "bg-purple-100 text-purple-800",
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

	const startDate = startOfMonth(currentDate);
	const endDate = endOfMonth(currentDate);

	const { data: events, isLoading } = trpc.calendar.listEvents.useQuery({
		startDate,
		endDate,
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
				<div className="text-gray-500">Loading events...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold text-gray-900">{format(currentDate, "MMMM yyyy")}</h2>
				<div className="flex space-x-2">
					<button
						type="button"
						onClick={handlePreviousMonth}
						className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
						aria-label="Previous month"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<button
						type="button"
						onClick={handleNextMonth}
						className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
						aria-label="Next month"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>
			</div>

			<div className="space-y-4">
				{events && events.length > 0 ? (
					events.map((event) => (
						<div
							key={event.id}
							className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
												CATEGORY_COLORS[event.category] || "bg-gray-100 text-gray-800"
											}`}
										>
											{CATEGORY_LABELS[event.category] || event.category}
										</span>
										<span className="text-sm text-gray-500 flex items-center gap-1">
											<CalendarIcon className="w-3 h-3" />
											{format(event.startDate, "d MMM yyyy")}
										</span>
									</div>
									<h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
									{event.body && (
										<p className="mt-1 text-sm text-gray-600 line-clamp-2">{event.body}</p>
									)}
									<div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
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
							</div>
						</div>
					))
				) : (
					<div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
						<CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-500 font-medium">No events found for this month</p>
					</div>
				)}
			</div>
		</div>
	);
}
