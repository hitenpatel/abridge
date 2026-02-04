import { format, isSameDay, parseISO } from "date-fns";
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

	const getBadgeColor = (type: Event["type"]) => {
		switch (type) {
			case "EVENT":
				return "bg-blue-100 text-blue-700 border-blue-200";
			case "TERM_DATE":
				return "bg-purple-100 text-purple-700 border-purple-200";
			case "INSET_DAY":
				return "bg-amber-100 text-amber-700 border-amber-200";
			case "DEADLINE":
				return "bg-red-100 text-red-700 border-red-200";
			case "CLUB":
				return "bg-green-100 text-green-700 border-green-200";
			default:
				return "bg-gray-100 text-gray-700 border-gray-200";
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
		<div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden h-full">
			<div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
				<h3 className="font-semibold text-gray-900 flex items-center gap-2">
					<Calendar className="h-5 w-5 text-gray-500" />
					This Week
				</h3>
			</div>
			<div className="divide-y divide-gray-100">
				{sortedEvents.length > 0 ? (
					sortedEvents.map((event) => {
						const { day, date } = formatEventDate(event.date);
						return (
							<div
								key={event.id}
								className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
							>
								<div className="flex-shrink-0 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg w-14 h-14 shadow-sm">
									<span className="text-xs font-medium text-gray-500 uppercase">{day}</span>
									<span className="text-lg font-bold text-gray-900 leading-none">
										{date.split(" ")[0]}
									</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span
											className={`text-[10px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wide ${getBadgeColor(event.type)}`}
										>
											{event.type.replace("_", " ")}
										</span>
									</div>
									<h4 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h4>
									{event.description && (
										<p className="text-xs text-gray-500 mt-1 line-clamp-1">{event.description}</p>
									)}
								</div>
							</div>
						);
					})
				) : (
					<div className="p-8 text-center text-gray-500 italic flex flex-col items-center">
						<Clock className="h-8 w-8 text-gray-300 mb-2" />
						<p>No events this week.</p>
					</div>
				)}
			</div>
		</div>
	);
}
