"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureDisabled } from "@/components/feature-disabled";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Heart, AlertTriangle, CheckCircle, SmilePlus } from "lucide-react";

const MOOD_EMOJI: Record<string, string> = {
	GREAT: "\u{1F604}",
	GOOD: "\u{1F642}",
	OK: "\u{1F610}",
	LOW: "\u{1F61F}",
	STRUGGLING: "\u{1F622}",
};

const MOOD_COLORS: Record<string, string> = {
	GREAT: "bg-green-100 text-green-800",
	GOOD: "bg-emerald-100 text-emerald-800",
	OK: "bg-yellow-100 text-yellow-800",
	LOW: "bg-orange-100 text-orange-800",
	STRUGGLING: "bg-red-100 text-red-800",
};

const ALERT_STATUS_COLORS: Record<string, string> = {
	OPEN: "bg-red-100 text-red-800",
	ACKNOWLEDGED: "bg-yellow-100 text-yellow-800",
	RESOLVED: "bg-green-100 text-green-800",
};

function ParentCheckIn() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);
	const [selectedMood, setSelectedMood] = useState<string | null>(null);
	const [note, setNote] = useState("");

	const submitMutation = trpc.wellbeing.submitCheckIn.useMutation({
		onSuccess: () => {
			setSelectedMood(null);
			setNote("");
		},
	});

	const childId = selectedChild ?? children?.[0]?.id;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const { data: checkIns } = trpc.wellbeing.getCheckIns.useQuery(
		{
			childId: childId ?? "",
			startDate: thirtyDaysAgo,
			endDate: today,
		},
		{ enabled: !!childId },
	);

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	return (
		<div className="space-y-6">
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((child) => (
						<button
							key={child.id}
							type="button"
							onClick={() => setSelectedChild(child.id)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
								childId === child.id
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted"
							}`}
						>
							{child.firstName}
						</button>
					))}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<SmilePlus className="h-5 w-5" />
						How is {children.find((c) => c.id === childId)?.firstName} feeling today?
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 mb-4">
						{Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
							<button
								key={mood}
								type="button"
								onClick={() => setSelectedMood(mood)}
								className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-colors ${
									selectedMood === mood
										? "border-primary bg-primary/5"
										: "border-transparent hover:border-muted"
								}`}
							>
								<span className="text-3xl">{emoji}</span>
								<span className="text-xs capitalize">{mood.toLowerCase()}</span>
							</button>
						))}
					</div>
					{selectedMood && (
						<div className="space-y-3">
							<textarea
								placeholder="Optional note (max 200 characters)"
								maxLength={200}
								value={note}
								onChange={(e) => setNote(e.target.value)}
								className="w-full rounded-md border p-2 text-sm resize-none"
								rows={2}
							/>
							<button
								type="button"
								onClick={() => {
									if (childId && selectedMood) {
										submitMutation.mutate({
											childId,
											mood: selectedMood as "GREAT" | "GOOD" | "OK" | "LOW" | "STRUGGLING",
											note: note || undefined,
										});
									}
								}}
								disabled={submitMutation.isPending}
								className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{submitMutation.isPending ? "Submitting..." : "Submit"}
							</button>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent Check-ins</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{checkIns?.length === 0 && (
							<p className="text-sm text-muted-foreground">No check-ins yet.</p>
						)}
						{checkIns?.map((ci) => (
							<div
								key={ci.id}
								className="flex items-center gap-3 rounded-md border p-2"
							>
								<span className="text-xl">{MOOD_EMOJI[ci.mood]}</span>
								<div className="flex-1">
									<Badge className={MOOD_COLORS[ci.mood]}>
										{ci.mood.toLowerCase()}
									</Badge>
									{ci.note && (
										<p className="text-sm text-muted-foreground mt-1">
											{ci.note}
										</p>
									)}
								</div>
								<span className="text-xs text-muted-foreground">
									{new Date(ci.date).toLocaleDateString("en-GB")}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const { data: overview, isLoading: overviewLoading } =
		trpc.wellbeing.getClassOverview.useQuery({ schoolId });

	const { data: alerts, isLoading: alertsLoading } =
		trpc.wellbeing.getAlerts.useQuery({ schoolId, status: "OPEN" });

	const acknowledgeMutation = trpc.wellbeing.acknowledgeAlert.useMutation();
	const resolveMutation = trpc.wellbeing.resolveAlert.useMutation();

	if (overviewLoading || alertsLoading) {
		return <Skeleton className="h-96 w-full" />;
	}

	return (
		<div className="space-y-6">
			{alerts && alerts.length > 0 && (
				<Card className="border-red-200">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-red-700">
							<AlertTriangle className="h-5 w-5" />
							Open Alerts ({alerts.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{alerts.map((alert) => (
								<div
									key={alert.id}
									className="flex items-center gap-3 rounded-md border border-red-100 p-3"
								>
									<div className="flex-1">
										<p className="font-medium">
											{alert.child.firstName} {alert.child.lastName}
										</p>
										<p className="text-sm text-muted-foreground">
											{alert.child.yearGroup} &middot; {alert.triggerRule.replace(/_/g, " ").toLowerCase()}
										</p>
									</div>
									<Badge className={ALERT_STATUS_COLORS[alert.status]}>
										{alert.status.toLowerCase()}
									</Badge>
									<div className="flex gap-2">
										{alert.status === "OPEN" && (
											<button
												type="button"
												onClick={() =>
													acknowledgeMutation.mutate({
														schoolId,
														alertId: alert.id,
													})
												}
												className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
											>
												Acknowledge
											</button>
										)}
										{(alert.status === "OPEN" ||
											alert.status === "ACKNOWLEDGED") && (
											<button
												type="button"
												onClick={() =>
													resolveMutation.mutate({
														schoolId,
														alertId: alert.id,
													})
												}
												className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
											>
												Resolve
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Heart className="h-5 w-5" />
						Today's Check-ins
					</CardTitle>
				</CardHeader>
				<CardContent>
					{overview?.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No check-ins submitted today.
						</p>
					)}
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
						{overview?.map((ci) => (
							<div
								key={ci.id}
								className={`flex flex-col items-center rounded-md border p-2 ${MOOD_COLORS[ci.mood]}`}
							>
								<span className="text-2xl">{MOOD_EMOJI[ci.mood]}</span>
								<span className="text-xs font-medium mt-1 truncate w-full text-center">
									{ci.child.firstName} {ci.child.lastName.charAt(0)}
								</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function WellbeingPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.wellbeingEnabled) {
		return <FeatureDisabled featureName="Wellbeing Check-ins" />;
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold">Wellbeing</h1>
				<p className="text-muted-foreground">
					{isStaff ? "Class wellbeing overview" : "Daily mood check-in"}
				</p>
			</div>

			{isStaff && session.schoolId ? (
				<StaffView schoolId={session.schoolId} />
			) : (
				<ParentCheckIn />
			)}
		</div>
	);
}
