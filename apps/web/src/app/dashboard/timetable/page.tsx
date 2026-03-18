"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_SHORT: Record<string, string> = {
	MONDAY: "Mon",
	TUESDAY: "Tue",
	WEDNESDAY: "Wed",
	THURSDAY: "Thu",
	FRIDAY: "Fri",
};

const SUBJECT_COLORS: Record<string, string> = {
	English: "bg-blue-50 border-blue-200 text-blue-800",
	Maths: "bg-amber-50 border-amber-200 text-amber-800",
	Mathematics: "bg-amber-50 border-amber-200 text-amber-800",
	Science: "bg-green-50 border-green-200 text-green-800",
	History: "bg-red-50 border-red-200 text-red-800",
	Geography: "bg-indigo-50 border-indigo-200 text-indigo-800",
	Art: "bg-pink-50 border-pink-200 text-pink-800",
	Music: "bg-purple-50 border-purple-200 text-purple-800",
	PE: "bg-teal-50 border-teal-200 text-teal-800",
	Computing: "bg-sky-50 border-sky-200 text-sky-800",
	ICT: "bg-sky-50 border-sky-200 text-sky-800",
	French: "bg-orange-50 border-orange-200 text-orange-800",
	Spanish: "bg-orange-50 border-orange-200 text-orange-800",
	RE: "bg-violet-50 border-violet-200 text-violet-800",
	DT: "bg-emerald-50 border-emerald-200 text-emerald-800",
	Drama: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800",
};

const DEFAULT_COLOR = "bg-gray-50 border-gray-200 text-gray-700";

function getSubjectColor(subject: string): string {
	const key = Object.keys(SUBJECT_COLORS).find((k) =>
		subject.toLowerCase().includes(k.toLowerCase()),
	);
	return (key ? SUBJECT_COLORS[key] : undefined) ?? DEFAULT_COLOR;
}

interface TimetableEntry {
	id: string;
	dayOfWeek: string;
	periodNumber: number;
	periodName: string | null;
	subject: string;
	teacher: string | null;
	room: string | null;
	startTime: string;
	endTime: string;
}

function TimetableGrid({ entries }: { entries: TimetableEntry[] }) {
	// Group entries by day
	const entriesByDay: Record<string, TimetableEntry[]> = {};
	for (const day of DAYS) {
		entriesByDay[day] = [];
	}
	for (const entry of entries) {
		entriesByDay[entry.dayOfWeek]?.push(entry);
	}

	// Get all unique period numbers sorted
	const allPeriods = [...new Set(entries.map((e) => e.periodNumber))].sort((a, b) => a - b);

	// Determine today
	const todayIndex = new Date().getDay();
	const todayDay = todayIndex >= 1 && todayIndex <= 5 ? DAYS[todayIndex - 1] : null;

	if (allPeriods.length === 0) {
		return (
			<div className="text-center py-12">
				<Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<p className="text-muted-foreground">No timetable data found.</p>
				<p className="text-sm text-muted-foreground mt-1">
					Your school hasn't published a timetable yet.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse min-w-[640px]">
				<thead>
					<tr>
						<th className="w-16 p-2 text-xs font-medium text-muted-foreground text-center">
							Period
						</th>
						{DAYS.map((day) => (
							<th
								key={day}
								className={`p-2 text-xs font-semibold text-center rounded-t-lg ${
									day === todayDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"
								}`}
							>
								{DAY_SHORT[day]}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{allPeriods.map((period) => (
						<tr key={period}>
							<td className="p-2 text-center">
								<span className="text-xs font-bold text-muted-foreground">P{period}</span>
							</td>
							{DAYS.map((day) => {
								const entry = entriesByDay[day]?.find((e) => e.periodNumber === period);
								if (!entry) {
									return (
										<td key={day} className="p-1">
											<div className="rounded-lg bg-muted/30 h-[72px] flex items-center justify-center">
												<span className="text-muted-foreground text-xs">-</span>
											</div>
										</td>
									);
								}
								const color = getSubjectColor(entry.subject);
								return (
									<td key={day} className="p-1">
										<div
											className={`rounded-lg border p-2 h-[72px] flex flex-col justify-center ${color}`}
										>
											<p className="text-xs font-bold leading-tight truncate">{entry.subject}</p>
											{entry.teacher && (
												<p className="text-[10px] opacity-80 leading-tight truncate mt-0.5">
													{entry.teacher}
												</p>
											)}
											{entry.room && (
												<p className="text-[10px] opacity-70 leading-tight truncate mt-0.5">
													{entry.room}
												</p>
											)}
										</div>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);

	const childId = selectedChild ?? children?.[0]?.child?.id;

	const { data: entries, isLoading } = trpc.timetable.getForChild.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	return (
		<div className="space-y-6">
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<button
							key={pc.child.id}
							type="button"
							onClick={() => setSelectedChild(pc.child.id)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
								childId === pc.child.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
							}`}
						>
							{pc.child.firstName}
						</button>
					))}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Weekly Timetable
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-48 w-full" />
					) : (
						<TimetableGrid entries={(entries as TimetableEntry[]) ?? []} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StaffView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);

	const childId = selectedChild ?? children?.[0]?.child?.id;

	const { data: entries, isLoading } = trpc.timetable.getForChild.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	return (
		<div className="space-y-6">
			{children && children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<button
							key={pc.child.id}
							type="button"
							onClick={() => setSelectedChild(pc.child.id)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
								childId === pc.child.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
							}`}
						>
							{pc.child.firstName}
						</button>
					))}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Weekly Timetable
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-48 w-full" />
					) : entries && (entries as TimetableEntry[]).length > 0 ? (
						<TimetableGrid entries={entries as TimetableEntry[]} />
					) : (
						<div className="text-center py-12">
							<Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<p className="text-muted-foreground">No timetable data to display.</p>
							<p className="text-sm text-muted-foreground mt-1">
								Import timetable data via the MIS Integration page.
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardContent className="py-4">
					<Link
						href="/dashboard/mis"
						className="flex items-center gap-2 text-sm text-primary hover:underline"
					>
						<ExternalLink className="h-4 w-4" />
						Go to MIS Integration to import timetable data
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}

export default function TimetablePage() {
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={Clock}
					title="Timetable"
					description={
						isStaff ? "View and manage class timetables" : "View your child's weekly timetable"
					}
				/>

				{isStaff ? <StaffView /> : <ParentView />}
			</div>
		</PageShell>
	);
}
