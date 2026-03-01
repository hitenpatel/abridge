"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { Clock, Plus, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DAY_OPTIONS = [
	{ value: "MONDAY", label: "Monday" },
	{ value: "TUESDAY", label: "Tuesday" },
	{ value: "WEDNESDAY", label: "Wednesday" },
	{ value: "THURSDAY", label: "Thursday" },
	{ value: "FRIDAY", label: "Friday" },
	{ value: "SATURDAY", label: "Saturday" },
	{ value: "SUNDAY", label: "Sunday" },
];

const DAY_LABELS: Record<string, string> = {
	MONDAY: "Mon",
	TUESDAY: "Tue",
	WEDNESDAY: "Wed",
	THURSDAY: "Thu",
	FRIDAY: "Fri",
	SATURDAY: "Sat",
	SUNDAY: "Sun",
};

function formatPence(pence: number) {
	if (pence === 0) return "Free";
	return `£${(pence / 100).toFixed(2)}`;
}

export default function ClubsPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const utils = trpc.useUtils();
	const isStaff = !!session?.staffRole;

	// Get parent's children for enrollment (needed early to derive schoolId for parents)
	const { data: parentLinks } = trpc.user.listChildren.useQuery(undefined, {
		enabled: !session?.staffRole,
	});
	const children = parentLinks?.map((pl) => pl.child);

	// Staff have schoolId on session; parents derive it from their first child
	const schoolId = session?.schoolId || children?.[0]?.schoolId;

	// State for create dialog
	const [showCreate, setShowCreate] = useState(false);
	const [clubName, setClubName] = useState("");
	const [clubDescription, setClubDescription] = useState("");
	const [clubStaffLead, setClubStaffLead] = useState("");
	const [clubDay, setClubDay] = useState("MONDAY");
	const [clubStartTime, setClubStartTime] = useState("15:30");
	const [clubEndTime, setClubEndTime] = useState("16:30");
	const [clubCapacity, setClubCapacity] = useState("20");
	const [clubFee, setClubFee] = useState("0");
	const [clubTermStart, setClubTermStart] = useState("");
	const [clubTermEnd, setClubTermEnd] = useState("");

	// State for enroll dialog
	const [enrollClubId, setEnrollClubId] = useState<string | null>(null);
	const [selectedChildId, setSelectedChildId] = useState("");

	// Queries
	const { data: clubs, isLoading } = trpc.clubBooking.listClubs.useQuery(
		{ schoolId: schoolId || "" },
		{ enabled: !!schoolId },
	);

	// Mutations
	const createMutation = trpc.clubBooking.createClub.useMutation({
		onSuccess: () => {
			toast.success("Club created");
			utils.clubBooking.listClubs.invalidate();
			setShowCreate(false);
			resetForm();
		},
		onError: (err) => toast.error(err.message),
	});

	const enrollMutation = trpc.clubBooking.enroll.useMutation({
		onSuccess: () => {
			toast.success("Enrolled successfully");
			utils.clubBooking.listClubs.invalidate();
			setEnrollClubId(null);
			setSelectedChildId("");
		},
		onError: (err) => toast.error(err.message),
	});

	const unenrollMutation = trpc.clubBooking.unenroll.useMutation({
		onSuccess: () => {
			toast.success("Unenrolled successfully");
			utils.clubBooking.listClubs.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	if (!features.clubBookingEnabled) return <FeatureDisabled featureName="Clubs" />;

	function resetForm() {
		setClubName("");
		setClubDescription("");
		setClubStaffLead("");
		setClubDay("MONDAY");
		setClubStartTime("15:30");
		setClubEndTime("16:30");
		setClubCapacity("20");
		setClubFee("0");
		setClubTermStart("");
		setClubTermEnd("");
	}

	function handleCreate() {
		if (!schoolId || !clubName.trim() || !clubTermStart || !clubTermEnd) return;
		createMutation.mutate({
			schoolId,
			name: clubName.trim(),
			description: clubDescription.trim() || undefined,
			staffLead: clubStaffLead.trim() || undefined,
			// biome-ignore lint/suspicious/noExplicitAny: day string matches enum
			day: clubDay as any,
			startTime: clubStartTime,
			endTime: clubEndTime,
			maxCapacity: Number.parseInt(clubCapacity, 10) || 20,
			feeInPence: Math.round((Number.parseFloat(clubFee) || 0) * 100),
			termStartDate: new Date(clubTermStart),
			termEndDate: new Date(clubTermEnd),
		});
	}

	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="text-muted-foreground">Loading clubs...</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<span className="material-symbols-rounded text-primary text-3xl" aria-hidden="true">
						sports_soccer
					</span>
					<h1 className="text-3xl font-bold text-slate-800">Clubs</h1>
				</div>
				{isStaff && (
					<Button onClick={() => setShowCreate(true)}>
						<Plus className="w-4 h-4 mr-1" />
						Create Club
					</Button>
				)}
			</div>

			{/* Club listing */}
			<div className="space-y-4">
				{clubs && clubs.length > 0 ? (
					clubs.map((club) => {
						const spotsLeft = club.maxCapacity - club._count.enrollments;
						return (
							<Card key={club.id} className="hover:shadow-md transition-shadow">
								<CardContent className="p-5">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h3 className="text-lg font-semibold text-foreground">{club.name}</h3>
												<Badge variant={spotsLeft > 0 ? "success" : "destructive"}>
													{spotsLeft > 0
														? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
														: "Full"}
												</Badge>
												{club.feeInPence > 0 && (
													<Badge variant="outline">{formatPence(club.feeInPence)}</Badge>
												)}
											</div>
											{club.description && (
												<p className="text-sm text-muted-foreground mb-2">{club.description}</p>
											)}
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<span className="flex items-center gap-1">
													<Clock className="w-3.5 h-3.5" />
													{DAY_LABELS[club.day]} {club.startTime}–{club.endTime}
												</span>
												<span className="flex items-center gap-1">
													<Users className="w-3.5 h-3.5" />
													{club._count.enrollments}/{club.maxCapacity}
												</span>
												{club.staffLead && (
													<span className="flex items-center gap-1">Led by {club.staffLead}</span>
												)}
											</div>
											{club.yearGroups.length > 0 && (
												<div className="mt-1 text-xs text-muted-foreground">
													Year groups: {club.yearGroups.join(", ")}
												</div>
											)}
										</div>
										{!isStaff && spotsLeft > 0 && (
											<Button
												size="sm"
												onClick={() => {
													setEnrollClubId(club.id);
													if (children?.length === 1) {
														setSelectedChildId(children[0].id);
													}
												}}
											>
												Join
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})
				) : (
					<div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed border-border">
						<span
							className="material-symbols-rounded text-5xl text-muted-foreground mb-3 block"
							aria-hidden="true"
						>
							sports_soccer
						</span>
						<p className="text-muted-foreground font-medium">No clubs available</p>
						{isStaff && (
							<p className="text-sm text-muted-foreground mt-1">Create a club to get started</p>
						)}
					</div>
				)}
			</div>

			{/* My Children's Enrollments (parent view) */}
			{!isStaff && children && children.length > 0 && (
				<div className="mt-8">
					<h2 className="text-xl font-bold text-foreground mb-4">My Children&apos;s Clubs</h2>
					{children.map((child) => (
						<ChildEnrollments
							key={child.id}
							childId={child.id}
							childName={`${child.firstName} ${child.lastName}`}
							onUnenroll={(clubId) => unenrollMutation.mutate({ clubId, childId: child.id })}
							isUnenrolling={unenrollMutation.isPending}
						/>
					))}
				</div>
			)}

			{/* Create Club Dialog */}
			<Dialog open={showCreate} onOpenChange={setShowCreate}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Club</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
						<div className="space-y-2">
							<Label htmlFor="club-name">Club Name</Label>
							<Input
								id="club-name"
								value={clubName}
								onChange={(e) => setClubName(e.target.value)}
								placeholder="e.g. Football Club"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="club-desc">Description</Label>
							<Input
								id="club-desc"
								value={clubDescription}
								onChange={(e) => setClubDescription(e.target.value)}
								placeholder="Optional description"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="club-staff">Staff Lead</Label>
							<Input
								id="club-staff"
								value={clubStaffLead}
								onChange={(e) => setClubStaffLead(e.target.value)}
								placeholder="e.g. Mr Smith"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="club-day">Day</Label>
								<select
									id="club-day"
									value={clubDay}
									onChange={(e) => setClubDay(e.target.value)}
									className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ring bg-card"
								>
									{DAY_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="club-capacity">Max Capacity</Label>
								<Input
									id="club-capacity"
									type="number"
									min="1"
									value={clubCapacity}
									onChange={(e) => setClubCapacity(e.target.value)}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="club-start-time">Start Time</Label>
								<Input
									id="club-start-time"
									type="time"
									value={clubStartTime}
									onChange={(e) => setClubStartTime(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="club-end-time">End Time</Label>
								<Input
									id="club-end-time"
									type="time"
									value={clubEndTime}
									onChange={(e) => setClubEndTime(e.target.value)}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="club-fee">Fee (£)</Label>
							<Input
								id="club-fee"
								type="number"
								min="0"
								step="0.01"
								value={clubFee}
								onChange={(e) => setClubFee(e.target.value)}
								placeholder="0.00 for free"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="club-term-start">Term Start</Label>
								<Input
									id="club-term-start"
									type="date"
									value={clubTermStart}
									onChange={(e) => setClubTermStart(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="club-term-end">Term End</Label>
								<Input
									id="club-term-end"
									type="date"
									value={clubTermEnd}
									onChange={(e) => setClubTermEnd(e.target.value)}
									min={clubTermStart}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreate(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreate}
							disabled={
								createMutation.isPending || !clubName.trim() || !clubTermStart || !clubTermEnd
							}
						>
							{createMutation.isPending ? "Creating..." : "Create Club"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Enroll Dialog */}
			<Dialog open={!!enrollClubId} onOpenChange={(open) => !open && setEnrollClubId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Join Club</DialogTitle>
						<DialogDescription>Select which child to enroll in this club.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-4">
						{children?.map((child) => (
							<button
								key={child.id}
								type="button"
								onClick={() => setSelectedChildId(child.id)}
								className={`w-full p-3 rounded-lg border text-left transition-colors ${
									selectedChildId === child.id
										? "border-primary bg-primary/5"
										: "border-border hover:bg-accent"
								}`}
							>
								<span className="font-medium">
									{child.firstName} {child.lastName}
								</span>
								{child.yearGroup && (
									<span className="text-sm text-muted-foreground ml-2">Year {child.yearGroup}</span>
								)}
							</button>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEnrollClubId(null)}>
							Cancel
						</Button>
						<Button
							onClick={() =>
								enrollClubId &&
								selectedChildId &&
								enrollMutation.mutate({ clubId: enrollClubId, childId: selectedChildId })
							}
							disabled={enrollMutation.isPending || !selectedChildId}
						>
							{enrollMutation.isPending ? "Enrolling..." : "Enroll"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function ChildEnrollments({
	childId,
	childName,
	onUnenroll,
	isUnenrolling,
}: {
	childId: string;
	childName: string;
	onUnenroll: (clubId: string) => void;
	isUnenrolling: boolean;
}) {
	const { data: enrollments, isLoading } = trpc.clubBooking.getEnrollmentsForChild.useQuery({
		childId,
	});

	if (isLoading) return null;
	if (!enrollments || enrollments.length === 0) return null;

	return (
		<Card className="mb-4">
			<CardHeader className="pb-2">
				<CardTitle className="text-base">{childName}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				{enrollments.map((enrollment) => (
					<div
						key={enrollment.id}
						className="flex items-center justify-between p-2 rounded bg-muted/50"
					>
						<div>
							<span className="font-medium text-sm">{enrollment.club.name}</span>
							<span className="text-xs text-muted-foreground ml-2">
								{DAY_LABELS[enrollment.club.day]} {enrollment.club.startTime}–
								{enrollment.club.endTime}
							</span>
						</div>
						<Button
							size="sm"
							variant="ghost"
							className="text-destructive hover:text-destructive hover:bg-destructive/10"
							onClick={() => onUnenroll(enrollment.club.id)}
							disabled={isUnenrolling}
						>
							<X className="w-4 h-4 mr-1" />
							Leave
						</Button>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
