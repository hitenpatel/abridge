"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	format,
	isSameDay,
	startOfMonth,
	subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AttendanceListProps {
	childId: string;
}

const getStatusBadgeVariant = (mark: string) => {
	switch (mark) {
		case "PRESENT":
			return "success" as const;
		case "LATE":
			return "warning" as const;
		case "ABSENT_UNAUTHORISED":
			return "destructive" as const;
		case "ABSENT_AUTHORISED":
			return "info" as const;
		default:
			return "secondary" as const;
	}
};

const getStatusLabel = (mark: string) => {
	return mark.replace(/_/g, " ");
};

export function AttendanceList({ childId }: AttendanceListProps) {
	const [currentMonth, setCurrentMonth] = useState(new Date());

	const startDate = startOfMonth(currentMonth);
	const endDate = endOfMonth(currentMonth);

	const { data: attendance, isLoading } = trpc.attendance.getAttendanceForChild.useQuery({
		childId,
		startDate,
		endDate,
	});

	const days = eachDayOfInterval({ start: startDate, end: endDate });

	const handlePreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
	const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48 mx-auto" />
				</CardHeader>
				<CardContent className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<button
						onClick={handlePreviousMonth}
						className="p-2 rounded-full hover:bg-muted text-muted-foreground"
						type="button"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
					<button
						onClick={handleNextMonth}
						className="p-2 rounded-full hover:bg-muted text-muted-foreground"
						type="button"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<div className="divide-y divide-border">
					{days.map((day) => {
						const dayRecords =
							attendance?.filter((record) => isSameDay(new Date(record.date), day)) || [];
						const isWeekend = day.getDay() === 0 || day.getDay() === 6;

						// Skip weekends if no records
						if (dayRecords.length === 0 && isWeekend) {
							return null;
						}

						if (dayRecords.length === 0) {
							return (
								<div
									key={day.toISOString()}
									className="px-4 py-3 flex items-center justify-between hover:bg-muted"
								>
									<div className="flex flex-col">
										<span className="text-sm font-medium text-foreground">
											{format(day, "EEEE, d MMM")}
										</span>
									</div>
									<span className="text-sm text-muted-foreground italic">No record</span>
								</div>
							);
						}

						return (
							<div key={day.toISOString()} className="px-4 py-3 hover:bg-muted">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium text-foreground">
										{format(day, "EEEE, d MMM")}
									</span>
								</div>
								<div className="flex flex-wrap gap-2">
									{dayRecords.map((record) => (
										<Badge key={record.id} variant={getStatusBadgeVariant(record.mark)}>
											<span className="mr-1 font-bold">{record.session}:</span>
											{getStatusLabel(record.mark)}
										</Badge>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
