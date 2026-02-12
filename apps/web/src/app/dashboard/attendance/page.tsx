"use client";

import { AbsenceReportForm } from "@/components/attendance/absence-report-form";
import { AttendanceList } from "@/components/attendance/attendance-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AttendancePage() {
	const { data: childrenLinks, isLoading } = trpc.user.listChildren.useQuery();
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [isReporting, setIsReporting] = useState(false);

	if (isLoading) {
		return (
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!childrenLinks || childrenLinks.length === 0) {
		return (
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<Card>
					<CardContent className="text-center py-12">
						<h3 className="mt-2 text-sm font-semibold text-foreground">No children found</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							You need to have children linked to your account to view attendance.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const firstChild = childrenLinks[0];
	if (!firstChild) return null;

	// Select first child by default
	const activeChildId = selectedChildId || firstChild.childId;
	const activeChild = childrenLinks.find((link) => link.childId === activeChildId)?.child;

	return (
		<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
			<div className="md:flex md:items-center md:justify-between">
				<div className="min-w-0 flex-1">
					<h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight">
						Attendance
					</h2>
				</div>
				<div className="mt-4 flex md:ml-4 md:mt-0">
					{!isReporting && <Button onClick={() => setIsReporting(true)}>Report Absence</Button>}
				</div>
			</div>

			{isReporting && (
				<AbsenceReportForm
					childrenLinks={childrenLinks}
					defaultChildId={activeChildId}
					onSuccess={() => setIsReporting(false)}
					onCancel={() => setIsReporting(false)}
				/>
			)}

			{childrenLinks.length > 1 && (
				<div className="sm:hidden">
					<Select value={activeChildId} onValueChange={(value) => setSelectedChildId(value)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select a child" />
						</SelectTrigger>
						<SelectContent>
							{childrenLinks.map((link) => (
								<SelectItem key={link.childId} value={link.childId}>
									{link.child.firstName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{childrenLinks.length > 1 && (
				<div className="hidden sm:block">
					<Tabs value={activeChildId} onValueChange={(value) => setSelectedChildId(value)}>
						<TabsList>
							{childrenLinks.map((link) => (
								<TabsTrigger key={link.childId} value={link.childId}>
									{link.child.firstName} {link.child.lastName}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</div>
			)}

			{/* For single child, maybe show the name as a subtitle? */}
			{childrenLinks.length === 1 && activeChild && (
				<p className="text-sm text-muted-foreground">
					Viewing attendance for {activeChild.firstName} {activeChild.lastName}
				</p>
			)}

			<AttendanceList childId={activeChildId} />
		</div>
	);
}
