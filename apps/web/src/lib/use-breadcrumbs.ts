"use client";

import { usePathname } from "next/navigation";

export interface BreadcrumbItem {
	label: string;
	href?: string;
}

const SEGMENT_LABELS: Record<string, string> = {
	dashboard: "Dashboard",
	achievements: "Achievements",
	analytics: "Analytics",
	attendance: "Attendance",
	calendar: "Calendar",
	chat: "Chat",
	clubs: "Clubs",
	community: "Community",
	compose: "Compose",
	emergency: "Emergency",
	forms: "Forms",
	gallery: "Gallery",
	history: "History",
	homework: "Homework",
	meals: "Meals",
	messages: "Messages",
	mis: "MIS Integration",
	new: "New",
	"parents-evening": "Parents' Evening",
	payments: "Payments",
	posts: "Posts",
	progress: "Progress",
	reading: "Reading",
	reports: "Reports",
	settings: "Settings",
	staff: "Staff",
	success: "Success",
	timetable: "Timetable",
	visitors: "Visitors",
	wellbeing: "Wellbeing",
};

function toLabel(segment: string): string {
	return (
		SEGMENT_LABELS[segment] ??
		segment
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ")
	);
}

export function useBreadcrumbs(): BreadcrumbItem[] {
	const pathname = usePathname();

	const segments = pathname.split("/").filter(Boolean);

	// Don't show breadcrumbs on the dashboard root
	if (segments.length <= 1) {
		return [];
	}

	const items: BreadcrumbItem[] = [];

	segments.forEach((segment, index) => {
		const href = `/${segments.slice(0, index + 1).join("/")}`;
		const isLast = index === segments.length - 1;

		items.push({
			label: toLabel(segment),
			href: isLast ? undefined : href,
		});
	});

	return items;
}
