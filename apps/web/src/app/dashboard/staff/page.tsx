"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Plus, Settings, ShieldCheck, Trash2, User, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function StaffManagementPage() {
	const utils = trpc.useUtils();
	const { data: session, isLoading: isLoadingSession } = trpc.auth.getSession.useQuery();
	const { data: invitations, isLoading: isLoadingInvites } = trpc.invitation.list.useQuery(
		{ schoolId: session?.schoolId || "" },
		{ enabled: !!session?.staffRole && !!session?.schoolId },
	);
	const { data: staff, isLoading: isLoadingStaff } = trpc.staff.list.useQuery(
		{ schoolId: session?.schoolId || "" },
		{
			enabled: !!session?.staffRole && !!session?.schoolId,
		},
	);

	const [newInviteForm, setNewInviteForm] = useState(false);
	const [newEmail, setNewEmail] = useState("");
	const [newRole, setNewRole] = useState<"ADMIN" | "TEACHER" | "OFFICE">("TEACHER");

	const sendInvitation = trpc.invitation.send.useMutation({
		onSuccess: () => {
			setNewInviteForm(false);
			setNewEmail("");
			utils.invitation.list.invalidate();
		},
		onError: (err) => {
			alert(err.message);
		},
	});

	const removeStaff = trpc.staff.remove.useMutation({
		onSuccess: () => {
			utils.staff.list.invalidate();
		},
		onError: (err) => {
			alert(err.message);
		},
	});

	// Check authentication and admin access - AFTER all hooks
	if (isLoadingSession) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (!session) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Not Authenticated</h1>
					<p className="text-muted-foreground mb-4">Please log in to access this page.</p>
					<Link href="/login">
						<Button>Go to Login</Button>
					</Link>
				</div>
			</div>
		);
	}

	if (session.staffRole !== "ADMIN") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Access Denied</h1>
					<p className="text-muted-foreground mb-4">You need admin access to view this page.</p>
					<Link href="/dashboard">
						<Button>Go to Dashboard</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold">Staff Management</h1>
				<p className="text-muted-foreground">Manage teachers and staff for your school</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Invite New Staff */}
				<div className="bg-card p-6 rounded-xl border h-fit">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold flex items-center gap-2">
							<User className="w-5 h-5" /> Invite Staff
						</h2>
						<Button
							variant={newInviteForm ? "ghost" : "default"}
							size="sm"
							onClick={() => setNewInviteForm(!newInviteForm)}
						>
							{newInviteForm ? (
								"Cancel"
							) : (
								<>
									<Plus className="w-4 h-4 mr-1" /> Invite
								</>
							)}
						</Button>
					</div>

					{newInviteForm && (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (session?.schoolId) {
									sendInvitation.mutate({
										schoolId: session.schoolId,
										email: newEmail,
										role: newRole,
									});
								}
							}}
							className="space-y-4"
						>
							<div className="space-y-1">
								<label htmlFor="email" className="text-sm font-medium">
									Email Address
								</label>
								<input
									id="email"
									type="email"
									placeholder="teacher@school.sch.uk"
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
									className="w-full px-3 py-2 border border-border rounded-lg bg-background"
									required
								/>
							</div>
							<div className="space-y-1">
								<label htmlFor="role" className="text-sm font-medium">
									Role
								</label>
								<select
									id="role"
									value={newRole}
									onChange={(e) => setNewRole(e.target.value as "ADMIN" | "TEACHER" | "OFFICE")}
									className="w-full px-3 py-2 border border-border rounded-lg bg-background"
								>
									<option value="TEACHER">Teacher</option>
									<option value="OFFICE">Office Staff</option>
									<option value="ADMIN">Administrator</option>
								</select>
							</div>
							<Button type="submit" className="w-full" disabled={sendInvitation.isPending}>
								{sendInvitation.isPending ? "Sending..." : "Send Invitation"}
							</Button>
						</form>
					)}
				</div>

				{/* Existing Staff */}
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-card p-6 rounded-xl border">
						<h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
							<Users className="w-5 h-5" /> Current Staff
						</h2>

						{isLoadingStaff ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
								))}
							</div>
						) : !staff || staff.length === 0 ? (
							<div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
								<Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
								<p>No staff members found.</p>
							</div>
						) : (
							<div className="divide-y divide-border">
								{staff.map((member) => (
									<div
										key={member.id}
										className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
									>
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
												{member.user.name?.[0] || member.user.email[0].toUpperCase()}
											</div>
											<div>
												<p className="font-medium">{member.user.name || "Unnamed User"}</p>
												<p className="text-sm text-muted-foreground">{member.user.email}</p>
											</div>
										</div>
										<div className="flex items-center gap-3">
											<span
												className={cn(
													"text-xs px-2.5 py-0.5 rounded-full font-medium",
													member.role === "ADMIN"
														? "bg-purple-100 text-purple-700"
														: "bg-blue-100 text-blue-700",
												)}
											>
												{member.role}
											</span>
											{session?.staffRole === "ADMIN" && member.userId !== session.id && (
												<Button
													variant="ghost"
													size="icon"
													className="text-muted-foreground hover:text-destructive"
													onClick={() => {
														if (
															confirm(`Remove ${member.user.name || member.user.email} from staff?`)
														) {
															if (session?.schoolId) {
																removeStaff.mutate({
																	schoolId: session.schoolId,
																	userId: member.userId,
																});
															}
														}
													}}
													disabled={removeStaff.isPending}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Pending Invitations */}
					{invitations && invitations.length > 0 && (
						<div className="bg-card p-6 rounded-xl border border-primary/20 bg-primary/5">
							<h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
								<ShieldCheck className="w-5 h-5 text-primary" /> Pending Invitations
							</h2>
							<div className="divide-y divide-primary/10">
								{invitations.map((invite) => (
									<div
										key={invite.id}
										className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
									>
										<div>
											<p className="font-medium">{invite.email}</p>
											<p className="text-xs text-muted-foreground">
												Role: {invite.role} • Expires{" "}
												{new Date(invite.expiresAt).toLocaleDateString()}
											</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												const link = `${window.location.origin}/register?token=${invite.token}`;
												navigator.clipboard.writeText(link);
												alert("Invite link copied to clipboard!");
											}}
										>
											Copy Link
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function cn(...classes: (string | boolean | undefined)[]) {
	return classes.filter(Boolean).join(" ");
}
