"use client";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { trpc } from "@/lib/trpc";
import {
	BarChart3,
	ChevronDown,
	ChevronUp,
	ClipboardList,
	CreditCard,
	MessageSquare,
} from "lucide-react";
import { useState } from "react";

type DateRange = "today" | "week" | "month" | "term";

function getDateRange(range: DateRange, termStart: Date | null): { from: Date; to: Date } {
	const now = new Date();
	const to = new Date(now);
	to.setUTCHours(23, 59, 59, 999);

	let from: Date;
	switch (range) {
		case "today":
			from = new Date(now);
			from.setUTCHours(0, 0, 0, 0);
			break;
		case "week": {
			from = new Date(now);
			from.setUTCDate(from.getUTCDate() - from.getUTCDay() + 1); // Monday
			from.setUTCHours(0, 0, 0, 0);
			break;
		}
		case "month":
			from = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
			from.setUTCHours(0, 0, 0, 0);
			break;
		case "term":
			if (termStart) {
				from = new Date(termStart);
			} else {
				// Fall back to September 1st of current academic year
				const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
				from = new Date(year, 8, 1);
			}
			from.setUTCHours(0, 0, 0, 0);
			break;
	}
	return { from, to };
}

function Sparkline({ data }: { data: number[] }) {
	if (data.length < 2) return null;

	const width = 120;
	const height = 32;
	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const range = max - min || 1;

	const points = data
		.map((v, i) => {
			const x = (i / (data.length - 1)) * width;
			const y = height - ((v - min) / range) * height;
			return `${x},${y}`;
		})
		.join(" ");

	return (
		<svg width={width} height={height} className="inline-block" role="img">
			<title>Trend sparkline</title>
			<polyline
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				points={points}
			/>
		</svg>
	);
}

function CardSkeleton() {
	return (
		<Card className="rounded-2xl p-6 border border-border animate-pulse">
			<div className="flex items-center gap-3 mb-4">
				<div className="w-10 h-10 rounded-xl bg-muted" />
				<div className="h-5 w-32 bg-muted rounded" />
			</div>
			<div className="h-8 w-20 bg-muted rounded mb-2" />
			<div className="h-4 w-48 bg-muted rounded" />
		</Card>
	);
}

function DetailTable({
	headers,
	rows,
}: {
	headers: string[];
	rows: (string | number)[][];
}) {
	return (
		<div className="mt-4 overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border">
						{headers.map((h) => (
							<th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground">
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => (
						<tr key={i} className="border-b border-border/50 hover:bg-muted/50">
							{row.map((cell, j) => (
								<td key={j} className="py-2 px-3">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function AnalyticsPage() {
	const [range, setRange] = useState<DateRange>("term");
	const [expanded, setExpanded] = useState<string | null>(null);

	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;
	const isStaff = !!session?.staffRole && !!schoolId;

	// Fetch term start date from analytics router
	const { data: termStart } = trpc.analytics.termStart.useQuery(
		{ schoolId: schoolId ?? "" },
		{ enabled: !!schoolId },
	);

	const dates = schoolId ? getDateRange(range, termStart ? new Date(termStart) : null) : null;

	const fallbackDate = new Date(0);
	const attendance = trpc.analytics.attendance.useQuery(
		{ schoolId: schoolId ?? "", from: dates?.from ?? fallbackDate, to: dates?.to ?? fallbackDate },
		{ enabled: !!schoolId && !!dates },
	);
	const payments = trpc.analytics.payments.useQuery(
		{ schoolId: schoolId ?? "", from: dates?.from ?? fallbackDate, to: dates?.to ?? fallbackDate },
		{ enabled: !!schoolId && !!dates },
	);
	const forms = trpc.analytics.forms.useQuery(
		{ schoolId: schoolId ?? "", from: dates?.from ?? fallbackDate, to: dates?.to ?? fallbackDate },
		{ enabled: !!schoolId && !!dates },
	);
	const messages = trpc.analytics.messages.useQuery(
		{ schoolId: schoolId ?? "", from: dates?.from ?? fallbackDate, to: dates?.to ?? fallbackDate },
		{ enabled: !!schoolId && !!dates },
	);

	const toggleExpand = (card: string) => {
		setExpanded(expanded === card ? null : card);
	};

	const ranges: { key: DateRange; label: string }[] = [
		{ key: "today", label: "Today" },
		{ key: "week", label: "This Week" },
		{ key: "month", label: "This Month" },
		{ key: "term", label: "This Term" },
	];

	if (session && !isStaff) {
		return (
			<PageShell maxWidth="7xl">
				<p className="text-center py-16 text-muted-foreground">
					Analytics is only available to staff members.
				</p>
			</PageShell>
		);
	}

	return (
		<PageShell maxWidth="7xl" data-testid="analytics-view">
			<PageHeader icon={BarChart3} title="Analytics" description="School performance insights">
				<div
					className="flex bg-background rounded-xl p-1 shadow-sm border border-border"
					data-testid="analytics-date-range"
				>
					{ranges.map((r) => (
						<button
							key={r.key}
							type="button"
							onClick={() => setRange(r.key)}
							data-testid={`date-range-${r.key}`}
							className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
								range === r.key
									? "bg-primary text-white shadow-sm"
									: "text-muted-foreground hover:bg-muted"
							}`}
						>
							{r.label}
						</button>
					))}
				</div>
			</PageHeader>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Attendance Card */}
				{attendance.isLoading ? (
					<CardSkeleton />
				) : (
					<Card
						className="glass-card hover-lift rounded-2xl p-6 cursor-pointer"
						data-testid="analytics-attendance-card"
						onClick={() => toggleExpand("attendance")}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
									<ClipboardList
										className="w-5 h-5 text-green-600 dark:text-green-400"
										aria-hidden="true"
									/>
								</div>
								<h3 className="text-lg font-semibold">Attendance</h3>
							</div>
							<div className="text-green-600 dark:text-green-400">
								<Sparkline data={attendance.data?.trend.map((t) => t.rate) ?? []} />
							</div>
						</div>
						<div className="text-3xl font-bold mb-1">{attendance.data?.todayRate ?? 0}%</div>
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span>Period avg: {attendance.data?.periodRate ?? 0}%</span>
							<span>Below 90%: {attendance.data?.belowThresholdCount ?? 0} children</span>
						</div>
						{expanded === "attendance" && attendance.data?.byClass.length ? (
							<DetailTable
								headers={["Class", "Rate", "Present", "Total"]}
								rows={attendance.data.byClass.map((c) => [
									c.className,
									`${c.rate}%`,
									c.presentCount,
									c.totalCount,
								])}
							/>
						) : null}
						<div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
							{expanded === "attendance" ? (
								<ChevronUp className="w-4 h-4" aria-hidden="true" />
							) : (
								<ChevronDown className="w-4 h-4" aria-hidden="true" />
							)}
							{expanded === "attendance" ? "Collapse" : "View by class"}
						</div>
					</Card>
				)}

				{/* Payments Card */}
				{payments.isLoading ? (
					<CardSkeleton />
				) : (
					<Card
						className="glass-card hover-lift rounded-2xl p-6 cursor-pointer"
						data-testid="analytics-payments-card"
						onClick={() => toggleExpand("payments")}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
									<CreditCard
										className="w-5 h-5 text-blue-600 dark:text-blue-400"
										aria-hidden="true"
									/>
								</div>
								<h3 className="text-lg font-semibold">Payments</h3>
							</div>
						</div>
						<div className="text-3xl font-bold mb-1">{payments.data?.collectionRate ?? 0}%</div>
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span>
								Collected: {"\u00A3"}
								{((payments.data?.collectedTotal ?? 0) / 100).toFixed(2)}
							</span>
							<span>
								Outstanding: {"\u00A3"}
								{((payments.data?.outstandingTotal ?? 0) / 100).toFixed(2)}
							</span>
						</div>
						<div className="text-sm text-muted-foreground mt-1">
							{payments.data?.overdueCount ?? 0} overdue items
						</div>
						{expanded === "payments" && payments.data?.byItem.length ? (
							<DetailTable
								headers={["Item", "Rate", "Collected", "Total", "Amount"]}
								rows={payments.data.byItem.map((item) => [
									item.itemTitle,
									`${item.collectionRate}%`,
									item.collectedCount,
									item.totalCount,
									`\u00A3${(item.amount / 100).toFixed(2)}`,
								])}
							/>
						) : null}
						<div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
							{expanded === "payments" ? (
								<ChevronUp className="w-4 h-4" aria-hidden="true" />
							) : (
								<ChevronDown className="w-4 h-4" aria-hidden="true" />
							)}
							{expanded === "payments" ? "Collapse" : "View by item"}
						</div>
					</Card>
				)}

				{/* Forms Card */}
				{forms.isLoading ? (
					<CardSkeleton />
				) : (
					<Card
						className="glass-card hover-lift rounded-2xl p-6 cursor-pointer"
						data-testid="analytics-forms-card"
						onClick={() => toggleExpand("forms")}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
									<ClipboardList
										className="w-5 h-5 text-purple-600 dark:text-purple-400"
										aria-hidden="true"
									/>
								</div>
								<h3 className="text-lg font-semibold">Forms</h3>
							</div>
						</div>
						<div className="text-3xl font-bold mb-1">{forms.data?.completionRate ?? 0}%</div>
						<div className="text-sm text-muted-foreground">
							{forms.data?.pendingCount ?? 0} pending responses
						</div>
						{expanded === "forms" && forms.data?.byTemplate.length ? (
							<DetailTable
								headers={["Template", "Rate", "Submitted", "Total"]}
								rows={forms.data.byTemplate.map((t) => [
									t.templateTitle,
									`${t.completionRate}%`,
									t.submittedCount,
									t.totalCount,
								])}
							/>
						) : null}
						<div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
							{expanded === "forms" ? (
								<ChevronUp className="w-4 h-4" aria-hidden="true" />
							) : (
								<ChevronDown className="w-4 h-4" aria-hidden="true" />
							)}
							{expanded === "forms" ? "Collapse" : "View by template"}
						</div>
					</Card>
				)}

				{/* Messages Card */}
				{messages.isLoading ? (
					<CardSkeleton />
				) : (
					<Card
						className="glass-card hover-lift rounded-2xl p-6 cursor-pointer"
						data-testid="analytics-messages-card"
						onClick={() => toggleExpand("messages")}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
									<MessageSquare
										className="w-5 h-5 text-amber-600 dark:text-amber-400"
										aria-hidden="true"
									/>
								</div>
								<h3 className="text-lg font-semibold">Messages</h3>
							</div>
						</div>
						<div className="text-3xl font-bold mb-1">{messages.data?.sentCount ?? 0}</div>
						<div className="text-sm text-muted-foreground">
							Avg read rate: {messages.data?.avgReadRate ?? 0}%
						</div>
						{expanded === "messages" && messages.data?.byMessage.length ? (
							<DetailTable
								headers={["Subject", "Sent", "Read", "Recipients", "Rate"]}
								rows={messages.data.byMessage.map((m) => [
									m.subject,
									new Date(m.sentAt).toLocaleDateString(),
									m.readCount,
									m.recipientCount,
									`${m.readRate}%`,
								])}
							/>
						) : null}
						<div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
							{expanded === "messages" ? (
								<ChevronUp className="w-4 h-4" aria-hidden="true" />
							) : (
								<ChevronDown className="w-4 h-4" aria-hidden="true" />
							)}
							{expanded === "messages" ? "Collapse" : "View by message"}
						</div>
					</Card>
				)}
			</div>
		</PageShell>
	);
}
