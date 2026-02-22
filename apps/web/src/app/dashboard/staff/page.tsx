"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus, ShieldCheck, Trash2, User, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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
	const [staffToRemove, setStaffToRemove] = useState<{
		userId: string;
		name: string;
		email: string;
	} | null>(null);

	const sendInvitation = trpc.invitation.send.useMutation({
		onSuccess: () => {
			setNewInviteForm(false);
			setNewEmail("");
			utils.invitation.list.invalidate();
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});

	const updateRole = trpc.staff.updateRole.useMutation({
		onSuccess: () => {
			utils.staff.list.invalidate();
			toast.success("Role updated");
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});

	const removeStaff = trpc.staff.remove.useMutation({
		onSuccess: () => {
			utils.staff.list.invalidate();
			setStaffToRemove(null);
			toast.success("Staff member removed successfully");
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});

	// Check authentication and admin access - AFTER all hooks
	if (isLoadingSession) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
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
				<Card className="h-fit">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
						<CardTitle className="flex items-center gap-2">
							<User className="w-5 h-5" /> Invite Staff
						</CardTitle>
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
					</CardHeader>

					{newInviteForm && (
						<CardContent>
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
									<Label htmlFor="email">Email Address</Label>
									<input
										id="email"
										type="email"
										placeholder="teacher@school.sch.uk"
										value={newEmail}
										onChange={(e) => setNewEmail(e.target.value)}
										className="w-full px-3 py-2 border border-border rounded-lg bg-background"
										data-testid="invite-email-input"
										required
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="role">Role</Label>
									<Select
										value={newRole}
										onValueChange={(value) => setNewRole(value as "ADMIN" | "TEACHER" | "OFFICE")}
									>
										<SelectTrigger id="role" className="w-full" data-testid="invite-role-select">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="TEACHER" data-testid="role-option-TEACHER">
												Teacher
											</SelectItem>
											<SelectItem value="OFFICE" data-testid="role-option-OFFICE">
												Office Staff
											</SelectItem>
											<SelectItem value="ADMIN" data-testid="role-option-ADMIN">
												Administrator
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={sendInvitation.isPending}
									data-testid="invite-send-button"
								>
									{sendInvitation.isPending ? "Sending..." : "Send Invitation"}
								</Button>
							</form>
						</CardContent>
					)}
				</Card>

				{/* Existing Staff */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="w-5 h-5" /> Current Staff
							</CardTitle>
						</CardHeader>
						<CardContent>
							{isLoadingStaff ? (
								<div className="space-y-3">
									{[1, 2, 3].map((i) => (
										<Skeleton key={i} className="h-16 w-full" />
									))}
								</div>
							) : !staff || staff.length === 0 ? (
								<div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
									<Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
									<p>No staff members found.</p>
								</div>
							) : (
								<div className="divide-y divide-border" data-testid="staff-list">
									{staff.map((member) => (
										<div
											key={member.id}
											className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
											data-testid="staff-member-row"
										>
											<div className="flex items-center gap-3">
												<Avatar>
													<AvatarFallback className="bg-primary/10 text-primary font-bold">
														{member.user.name?.[0] || member.user.email[0].toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="font-medium">{member.user.name || "Unnamed User"}</p>
													<p className="text-sm text-muted-foreground">{member.user.email}</p>
												</div>
											</div>
											<div className="flex items-center gap-3">
												{session?.staffRole === "ADMIN" && member.userId !== session.id ? (
													<Select
														value={member.role}
														onValueChange={(value) => {
															if (session?.schoolId) {
																updateRole.mutate({
																	schoolId: session.schoolId,
																	userId: member.userId,
																	role: value as "ADMIN" | "TEACHER" | "OFFICE",
																});
															}
														}}
													>
														<SelectTrigger className="w-28" data-testid="staff-role-select">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="TEACHER" data-testid="role-option-TEACHER">
																Teacher
															</SelectItem>
															<SelectItem value="OFFICE" data-testid="role-option-OFFICE">
																Office
															</SelectItem>
															<SelectItem value="ADMIN" data-testid="role-option-ADMIN">
																Admin
															</SelectItem>
														</SelectContent>
													</Select>
												) : (
													<Badge
														variant={member.role === "ADMIN" ? "default" : "info"}
														data-testid="staff-role-badge"
													>
														{member.role}
													</Badge>
												)}
												{session?.staffRole === "ADMIN" && member.userId !== session.id && (
													<Button
														variant="ghost"
														size="icon"
														className="text-muted-foreground hover:text-destructive"
														data-testid="staff-remove-button"
														onClick={() => {
															setStaffToRemove({
																userId: member.userId,
																name: member.user.name || "",
																email: member.user.email,
															});
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
						</CardContent>
					</Card>

					{/* Pending Invitations */}
					{invitations && invitations.length > 0 && (
						<Card className="border-primary/20 bg-primary/5">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<ShieldCheck className="w-5 h-5 text-primary" /> Pending Invitations
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="divide-y divide-primary/10" data-testid="pending-invitations-list">
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
													toast.success("Invite link copied to clipboard!");
												}}
											>
												Copy Link
											</Button>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{/* Remove Staff Confirmation Dialog */}
			<Dialog open={!!staffToRemove} onOpenChange={(open) => !open && setStaffToRemove(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Staff Member</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove{" "}
							<span className="font-semibold">{staffToRemove?.name || staffToRemove?.email}</span>{" "}
							from staff? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setStaffToRemove(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							data-testid="confirm-remove-button"
							onClick={() => {
								if (staffToRemove && session?.schoolId) {
									removeStaff.mutate({
										schoolId: session.schoolId,
										userId: staffToRemove.userId,
									});
								}
							}}
							disabled={removeStaff.isPending}
						>
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
