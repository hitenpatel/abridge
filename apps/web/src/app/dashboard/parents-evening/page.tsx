"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Plus, User, Users, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ParentsEveningPage() {
	const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
	const isAdmin = session?.staffRole === "ADMIN";
	const isStaff = !!session?.staffRole;
	const schoolId = session?.schoolId;

	if (sessionLoading) {
		return (
			<PageShell maxWidth="4xl">
				<div className="space-y-6">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-48 w-full rounded-2xl" />
					<Skeleton className="h-48 w-full rounded-2xl" />
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell maxWidth="4xl">
			<PageHeader
				icon={Users}
				title="Parents' Evening"
				description={isStaff ? "Manage parents' evening events" : "Book appointments with teachers"}
			>
				{isAdmin && schoolId && <CreateEveningDialog schoolId={schoolId} />}
			</PageHeader>

			{isAdmin && schoolId ? <AdminView schoolId={schoolId} /> : <ParentView />}
		</PageShell>
	);
}

function CreateEveningDialog({ schoolId }: { schoolId: string }) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [date, setDate] = useState("");
	const [startTime, setStartTime] = useState("16:00");
	const [endTime, setEndTime] = useState("19:00");
	const [slotDuration, setSlotDuration] = useState(10);
	const [breakDuration, setBreakDuration] = useState(0);
	const [allowVideo, setAllowVideo] = useState(false);

	const utils = trpc.useUtils();

	const createMutation = trpc.parentsEvening.create.useMutation({
		onSuccess: () => {
			toast.success("Parents' evening created");
			setOpen(false);
			setTitle("");
			utils.parentsEvening.listAll.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	if (!open) {
		return (
			<Button onClick={() => setOpen(true)} data-testid="create-evening-button">
				<Plus className="h-4 w-4 mr-2" aria-hidden="true" />
				Create Evening
			</Button>
		);
	}

	return (
		<Card className="fixed inset-0 z-50 m-auto w-full max-w-lg h-fit rounded-2xl shadow-xl border">
			<CardHeader>
				<CardTitle>Create Parents' Evening</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						const bookingOpens = new Date(date);
						bookingOpens.setDate(bookingOpens.getDate() - 7);
						const bookingCloses = new Date(date);
						bookingCloses.setHours(Number(startTime.split(":")[0]), 0, 0, 0);

						createMutation.mutate({
							schoolId,
							title,
							date: new Date(date),
							startTime,
							endTime,
							slotDurationMin: slotDuration,
							breakDurationMin: breakDuration,
							bookingOpensAt: bookingOpens,
							bookingClosesAt: bookingCloses,
							allowVideoCall: allowVideo,
						});
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Label>Title</Label>
						<Input
							data-testid="evening-title-input"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Year 1 Spring Parents' Evening"
							required
						/>
					</div>
					<div className="space-y-1">
						<Label>Date</Label>
						<Input
							type="date"
							data-testid="evening-date-input"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label>Start Time</Label>
							<Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
						</div>
						<div className="space-y-1">
							<Label>End Time</Label>
							<Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label>Slot Duration (min)</Label>
							<Input
								type="number"
								min={5}
								max={60}
								value={slotDuration}
								onChange={(e) => setSlotDuration(Number(e.target.value))}
							/>
						</div>
						<div className="space-y-1">
							<Label>Break Between (min)</Label>
							<Input
								type="number"
								min={0}
								max={30}
								value={breakDuration}
								onChange={(e) => setBreakDuration(Number(e.target.value))}
							/>
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={allowVideo}
							onChange={(e) => setAllowVideo(e.target.checked)}
						/>
						Allow video calls
					</label>
					<div className="flex gap-2">
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Creating..." : "Create"}
						</Button>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function AdminView({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.parentsEvening.listAll.useQuery({ schoolId });
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [addingTeachers, setAddingTeachers] = useState(false);
	const utils = trpc.useUtils();

	const { data: staffList } = trpc.staff.list.useQuery({ schoolId }, { enabled: addingTeachers });

	const addTeachersMutation = trpc.parentsEvening.addTeachers.useMutation({
		onSuccess: (result) => {
			toast.success(`Added ${result.teacherCount} teachers (${result.slotsPerTeacher} slots each)`);
			setAddingTeachers(false);
			utils.parentsEvening.listAll.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const publishMutation = trpc.parentsEvening.publish.useMutation({
		onSuccess: () => {
			toast.success("Parents' evening published");
			utils.parentsEvening.listAll.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-32 w-full rounded-2xl" />
				<Skeleton className="h-32 w-full rounded-2xl" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{data?.items.length === 0 && (
				<EmptyState
					icon={Users}
					title="No parents' evenings created yet"
					description="Create one to get started."
				/>
			)}
			{data?.items.map((evening) => (
				<Card
					key={evening.id}
					data-testid="evening-item"
					className="rounded-2xl border border-gray-100 cursor-pointer hover:border-primary/30 transition-colors hover-lift"
					onClick={() => setSelectedId(selectedId === evening.id ? null : evening.id)}
				>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-lg">{evening.title}</CardTitle>
							<div className="flex items-center gap-2">
								{evening.isPublished ? (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
										Published
									</span>
								) : (
									<span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
										Draft
									</span>
								)}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex gap-4 text-sm text-gray-500">
							<span>
								{new Date(evening.date).toLocaleDateString("en-GB", {
									weekday: "long",
									day: "numeric",
									month: "long",
									year: "numeric",
								})}
							</span>
							<span>
								{evening.startTime} – {evening.endTime}
							</span>
							<span>{evening._count.slots} slots</span>
						</div>

						{selectedId === evening.id && (
							<div className="mt-4 pt-4 border-t space-y-3">
								{!evening.isPublished && (
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={(e) => {
												e.stopPropagation();
												setAddingTeachers(true);
											}}
										>
											Add Teachers
										</Button>
										{evening._count.slots > 0 && (
											<Button
												size="sm"
												data-testid="publish-evening-button"
												onClick={(e) => {
													e.stopPropagation();
													publishMutation.mutate({ schoolId, parentsEveningId: evening.id });
												}}
												disabled={publishMutation.isPending}
											>
												Publish
											</Button>
										)}
									</div>
								)}

								{addingTeachers && staffList && (
									<div
										className="space-y-2"
										onClick={(e) => e.stopPropagation()}
										onKeyDown={(e) => e.stopPropagation()}
									>
										<p className="text-sm font-medium">Select teachers:</p>
										{staffList.map((s) => (
											<label key={s.user.id} className="flex items-center gap-2 text-sm">
												<input type="checkbox" value={s.user.id} data-testid="teacher-checkbox" />
												{s.user.name} ({s.role})
											</label>
										))}
										<Button
											size="sm"
											onClick={() => {
												const checkboxes = document.querySelectorAll<HTMLInputElement>(
													"[data-testid='teacher-checkbox']:checked",
												);
												const staffIds = Array.from(checkboxes).map((cb) => cb.value);
												if (staffIds.length === 0) {
													toast.error("Select at least one teacher");
													return;
												}
												addTeachersMutation.mutate({
													schoolId,
													parentsEveningId: evening.id,
													staffIds,
												});
											}}
											disabled={addTeachersMutation.isPending}
										>
											Generate Slots
										</Button>
									</div>
								)}

								{evening.isPublished && (
									<StaffSlotView parentsEveningId={evening.id} schoolId={schoolId} isStaff />
								)}
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function ParentView() {
	const { data, isLoading } = trpc.parentsEvening.list.useQuery({});
	const [selectedId, setSelectedId] = useState<string | null>(null);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-32 w-full rounded-2xl" />
			</div>
		);
	}

	if (!data?.items.length) {
		return (
			<EmptyState
				icon={Users}
				title="No upcoming parents' evenings"
				description="Check back later for scheduled events."
			/>
		);
	}

	return (
		<div className="space-y-4">
			{data.items.map((evening) => {
				const now = new Date();
				const bookingOpen =
					now >= new Date(evening.bookingOpensAt) && now <= new Date(evening.bookingClosesAt);

				return (
					<Card
						key={evening.id}
						data-testid="evening-item"
						className="rounded-2xl border border-gray-100 cursor-pointer hover:border-primary/30 transition-colors hover-lift"
						onClick={() => setSelectedId(selectedId === evening.id ? null : evening.id)}
					>
						<CardHeader className="pb-2">
							<CardTitle className="text-lg">{evening.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-4 text-sm text-gray-500">
								<span>
									{new Date(evening.date).toLocaleDateString("en-GB", {
										weekday: "long",
										day: "numeric",
										month: "long",
										year: "numeric",
									})}
								</span>
								<span>
									{evening.startTime} – {evening.endTime}
								</span>
								{evening.allowVideoCall && (
									<span className="text-blue-600 flex items-center gap-1">
										<Video className="h-4 w-4" aria-hidden="true" />
										Video available
									</span>
								)}
								{bookingOpen ? (
									<span className="text-green-600 font-medium">Booking open</span>
								) : (
									<span className="text-gray-400">
										Booking opens {new Date(evening.bookingOpensAt).toLocaleDateString("en-GB")}
									</span>
								)}
							</div>

							{selectedId === evening.id && (
								<div className="mt-4 pt-4 border-t">
									<SlotBookingView parentsEveningId={evening.id} bookingOpen={bookingOpen} />
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

function SlotBookingView({
	parentsEveningId,
	bookingOpen,
}: { parentsEveningId: string; bookingOpen: boolean }) {
	const { data: session } = trpc.auth.getSession.useQuery();
	const { data, isLoading } = trpc.parentsEvening.getSlots.useQuery({ parentsEveningId });
	const utils = trpc.useUtils();

	const { data: childrenData } = trpc.user.listChildren.useQuery(undefined, {
		enabled: !!session,
	});
	const firstChildId = childrenData?.[0]?.child?.id;

	const bookMutation = trpc.parentsEvening.book.useMutation({
		onSuccess: () => {
			toast.success("Slot booked!");
			utils.parentsEvening.getSlots.invalidate({ parentsEveningId });
		},
		onError: (err) => toast.error(err.message),
	});

	const cancelMutation = trpc.parentsEvening.cancelBooking.useMutation({
		onSuccess: () => {
			toast.success("Booking cancelled");
			utils.parentsEvening.getSlots.invalidate({ parentsEveningId });
		},
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) return <Skeleton className="h-24 w-full" />;

	// Group slots by teacher
	const grouped = new Map<
		string,
		{ staffName: string; slots: NonNullable<typeof data>["slots"] }
	>();
	for (const slot of data?.slots ?? []) {
		if (!grouped.has(slot.staffId)) {
			grouped.set(slot.staffId, { staffName: slot.staffName, slots: [] });
		}
		grouped.get(slot.staffId)?.slots.push(slot);
	}

	return (
		<div className="space-y-6">
			{Array.from(grouped.entries()).map(([staffId, { staffName, slots }]) => (
				<div key={staffId}>
					<h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
						<User className="h-4 w-4 text-primary" aria-hidden="true" />
						{staffName}
					</h3>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
						{slots.map((slot) => (
							<div
								key={slot.id}
								className={cn(
									"rounded-lg border p-2 text-center text-sm",
									slot.isOwnBooking
										? "bg-primary/10 border-primary"
										: slot.isBooked
											? "bg-gray-50 border-gray-200 opacity-50"
											: "bg-white border-gray-200 hover:border-primary/50",
								)}
							>
								<p className="font-medium">
									{slot.startTime} – {slot.endTime}
								</p>
								{slot.isOwnBooking ? (
									<div className="mt-1">
										<span
											className="text-xs text-primary font-medium"
											data-testid="booked-indicator"
										>
											Booked
										</span>
										{slot.videoCallLink && (
											<a
												href={slot.videoCallLink}
												target="_blank"
												rel="noopener noreferrer"
												className="block text-xs text-blue-600 mt-1 hover:underline"
												onClick={(e) => e.stopPropagation()}
											>
												Join call
											</a>
										)}
										{bookingOpen && (
											<Button
												size="sm"
												variant="ghost"
												className="mt-1 h-6 text-xs text-red-600"
												data-testid="cancel-booking-button"
												onClick={(e) => {
													e.stopPropagation();
													cancelMutation.mutate({ slotId: slot.id });
												}}
												disabled={cancelMutation.isPending}
											>
												Cancel
											</Button>
										)}
									</div>
								) : slot.isBooked ? (
									<p className="text-xs text-gray-400 mt-1">Taken</p>
								) : bookingOpen && firstChildId ? (
									<Button
										size="sm"
										variant="ghost"
										className="mt-1 h-6 text-xs"
										data-testid="book-slot-button"
										onClick={(e) => {
											e.stopPropagation();
											bookMutation.mutate({ slotId: slot.id, childId: firstChildId });
										}}
										disabled={bookMutation.isPending}
									>
										Book
									</Button>
								) : (
									<p className="text-xs text-gray-400 mt-1">Available</p>
								)}
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function StaffSlotView({
	parentsEveningId,
	schoolId,
	isStaff,
}: { parentsEveningId: string; schoolId: string; isStaff: boolean }) {
	const { data: session } = trpc.auth.getSession.useQuery();
	const { data, isLoading } = trpc.parentsEvening.getSlots.useQuery({ parentsEveningId });
	const utils = trpc.useUtils();
	const [notesSlotId, setNotesSlotId] = useState<string | null>(null);
	const [notesText, setNotesText] = useState("");
	const [videoSlotId, setVideoSlotId] = useState<string | null>(null);
	const [videoLink, setVideoLink] = useState("");

	const addNotesMutation = trpc.parentsEvening.addNotes.useMutation({
		onSuccess: () => {
			toast.success("Notes saved");
			setNotesSlotId(null);
			setNotesText("");
			utils.parentsEvening.getSlots.invalidate({ parentsEveningId });
		},
		onError: (err) => toast.error(err.message),
	});

	const setVideoMutation = trpc.parentsEvening.setVideoLink.useMutation({
		onSuccess: () => {
			toast.success("Video link saved");
			setVideoSlotId(null);
			setVideoLink("");
			utils.parentsEvening.getSlots.invalidate({ parentsEveningId });
		},
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) return <Skeleton className="h-24 w-full" />;

	// Group slots by teacher
	const grouped = new Map<
		string,
		{ staffName: string; slots: NonNullable<typeof data>["slots"] }
	>();
	for (const slot of data?.slots ?? []) {
		if (!grouped.has(slot.staffId)) {
			grouped.set(slot.staffId, { staffName: slot.staffName, slots: [] });
		}
		grouped.get(slot.staffId)?.slots.push(slot);
	}

	return (
		<div
			className="space-y-6"
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			{Array.from(grouped.entries()).map(([staffId, { staffName, slots }]) => (
				<div key={staffId}>
					<h3 className="font-semibold text-gray-900 mb-2">{staffName}</h3>
					<div className="space-y-1">
						{slots.map((slot) => (
							<div
								key={slot.id}
								className={cn(
									"flex items-center justify-between p-2 rounded-lg text-sm",
									slot.isBooked ? "bg-blue-50" : "bg-gray-50",
								)}
							>
								<div>
									<span className="font-medium">
										{slot.startTime} – {slot.endTime}
									</span>
									{slot.isBooked ? (
										<span
											className="ml-2 text-blue-600 text-xs font-medium"
											data-testid="booked-indicator"
										>
											Booked
										</span>
									) : (
										<span className="ml-2 text-gray-400 text-xs">Available</span>
									)}
									{slot.staffNotes && (
										<p className="text-xs text-gray-500 mt-0.5">Notes: {slot.staffNotes}</p>
									)}
								</div>
								{staffId === session?.id && (
									<div className="flex gap-1">
										{slot.isBooked && (
											<Button
												size="sm"
												variant="ghost"
												className="h-7 text-xs"
												data-testid="add-notes-button"
												onClick={() => {
													setNotesSlotId(slot.id);
													setNotesText(slot.staffNotes ?? "");
												}}
											>
												Notes
											</Button>
										)}
										<Button
											size="sm"
											variant="ghost"
											className="h-7 text-xs"
											data-testid="set-video-link-button"
											onClick={() => {
												setVideoSlotId(slot.id);
												setVideoLink(slot.videoCallLink ?? "");
											}}
										>
											Video
										</Button>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			))}

			{notesSlotId && (
				<div className="p-3 bg-white rounded-lg border space-y-2">
					<Label>Meeting Notes</Label>
					<textarea
						value={notesText}
						onChange={(e) => setNotesText(e.target.value)}
						data-testid="notes-input"
						className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
						rows={3}
					/>
					<div className="flex gap-2">
						<Button
							size="sm"
							data-testid="save-notes-button"
							onClick={() =>
								addNotesMutation.mutate({ schoolId, slotId: notesSlotId, notes: notesText })
							}
							disabled={addNotesMutation.isPending}
						>
							Save
						</Button>
						<Button size="sm" variant="outline" onClick={() => setNotesSlotId(null)}>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{videoSlotId && (
				<div className="p-3 bg-white rounded-lg border space-y-2">
					<Label>Video Call Link</Label>
					<Input
						value={videoLink}
						onChange={(e) => setVideoLink(e.target.value)}
						placeholder="https://meet.google.com/..."
						data-testid="video-link-input"
					/>
					<div className="flex gap-2">
						<Button
							size="sm"
							onClick={() =>
								setVideoMutation.mutate({ schoolId, slotId: videoSlotId, videoCallLink: videoLink })
							}
							disabled={setVideoMutation.isPending}
						>
							Save
						</Button>
						<Button size="sm" variant="outline" onClick={() => setVideoSlotId(null)}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
