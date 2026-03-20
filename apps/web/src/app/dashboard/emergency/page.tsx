"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EMERGENCY_TYPE_LABELS: Record<string, string> = {
	LOCKDOWN: "Lockdown",
	EVACUATION: "Evacuation",
	SHELTER_IN_PLACE: "Shelter in Place",
	MEDICAL: "Medical Emergency",
	OTHER: "Emergency",
};

function ActiveAlert({ schoolId }: { schoolId: string }) {
	const { data: alert, isLoading } = trpc.emergency.getActiveAlert.useQuery(
		{ schoolId },
		{ refetchInterval: 10000 },
	);

	const [updateMessage, setUpdateMessage] = useState("");
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const utils = trpc.useUtils();

	const postUpdateMutation = trpc.emergency.postUpdate.useMutation({
		onSuccess: () => {
			setUpdateMessage("");
			toast.success("Update posted");
			utils.emergency.getActiveAlert.invalidate({ schoolId });
		},
		onError: (err) => toast.error(err.message),
	});

	const resolveMutation = trpc.emergency.resolveAlert.useMutation({
		onSuccess: (_, variables) => {
			toast.success(variables.status === "ALL_CLEAR" ? "All clear issued" : "Alert cancelled");
			utils.emergency.getActiveAlert.invalidate({ schoolId });
		},
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) return <Skeleton className="h-48" />;

	if (!alert) return null;

	return (
		<>
			<Card className="border-red-500 border-2 bg-red-50">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-red-700">
						<AlertTriangle className="h-6 w-6 animate-pulse" />
						{alert.title}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{alert.message && <p className="text-sm font-medium">{alert.message}</p>}
					<p className="text-xs text-muted-foreground">
						Initiated by {alert.initiator.name} at{" "}
						{new Date(alert.createdAt).toLocaleTimeString("en-GB")}
					</p>

					{alert.updates.length > 0 && (
						<div className="space-y-2 border-l-2 border-red-300 pl-3">
							{alert.updates.map((update) => (
								<div key={update.id}>
									<p className="text-sm">{update.message}</p>
									<p className="text-xs text-muted-foreground">
										{new Date(update.createdAt).toLocaleTimeString("en-GB")}
									</p>
								</div>
							))}
						</div>
					)}

					<div className="flex gap-2">
						<input
							type="text"
							placeholder="Post an update..."
							maxLength={500}
							value={updateMessage}
							onChange={(e) => setUpdateMessage(e.target.value)}
							className="flex-1 rounded-md border p-2 text-sm"
						/>
						<Button
							type="button"
							onClick={() =>
								postUpdateMutation.mutate({
									schoolId,
									alertId: alert.id,
									message: updateMessage,
								})
							}
							disabled={!updateMessage.trim() || postUpdateMutation.isPending}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							Post
						</Button>
					</div>

					<div className="flex gap-2 pt-2 border-t">
						<Button
							type="button"
							onClick={() =>
								resolveMutation.mutate({
									schoolId,
									alertId: alert.id,
									status: "ALL_CLEAR",
								})
							}
							disabled={resolveMutation.isPending}
							className="bg-green-600 hover:bg-green-700 text-white"
						>
							<CheckCircle className="inline h-4 w-4 mr-1" />
							All Clear
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setCancelDialogOpen(true)}
							disabled={resolveMutation.isPending}
						>
							Cancel Alert
						</Button>
					</div>
				</CardContent>
			</Card>

			<Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Emergency Alert</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<label htmlFor="cancel-reason" className="text-sm font-medium">
							Reason for cancellation (required)
						</label>
						<Textarea
							id="cancel-reason"
							placeholder="e.g. False alarm, drill completed"
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							maxLength={500}
							data-testid="cancel-reason-input"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
							Go Back
						</Button>
						<Button
							variant="destructive"
							disabled={!cancelReason.trim() || resolveMutation.isPending}
							data-testid="confirm-cancel-alert"
							onClick={() => {
								resolveMutation.mutate(
									{
										schoolId,
										alertId: alert.id,
										status: "CANCELLED",
										reason: cancelReason,
									},
									{
										onSuccess: () => {
											setCancelDialogOpen(false);
											setCancelReason("");
										},
									},
								);
							}}
						>
							{resolveMutation.isPending ? "Cancelling..." : "Cancel Alert"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function InitiateAlert({ schoolId }: { schoolId: string }) {
	const [type, setType] = useState<string>("");
	const [message, setMessage] = useState("");
	const [confirming, setConfirming] = useState(false);

	const initiateMutation = trpc.emergency.initiateAlert.useMutation({
		onSuccess: () => {
			setType("");
			setMessage("");
			setConfirming(false);
		},
	});

	const types = ["LOCKDOWN", "EVACUATION", "SHELTER_IN_PLACE", "MEDICAL", "OTHER"];

	return (
		<Card className="border-red-200">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-red-700">
					<Shield className="h-5 w-5" />
					Initiate Emergency Alert
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{types.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setType(t)}
							className={`rounded-md border p-3 text-sm font-medium transition-colors ${
								type === t ? "border-red-500 bg-red-50 text-red-700" : "hover:bg-muted"
							}`}
						>
							{EMERGENCY_TYPE_LABELS[t]}
						</button>
					))}
				</div>

				{type && (
					<>
						<Textarea
							placeholder="Optional message to parents (max 500 characters)"
							maxLength={500}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={2}
						/>

						{!confirming ? (
							<Button
								type="button"
								onClick={() => setConfirming(true)}
								className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3"
							>
								Send Alert
							</Button>
						) : (
							<div className="rounded-md border-2 border-red-500 bg-red-50 p-4">
								<p className="text-sm font-bold text-red-700 mb-3">
									This will immediately notify ALL parents at the school via push, SMS, and email.
									Are you sure?
								</p>
								<div className="flex gap-2">
									<Button
										type="button"
										onClick={() =>
											initiateMutation.mutate({
												schoolId,
												type: type as
													| "LOCKDOWN"
													| "EVACUATION"
													| "SHELTER_IN_PLACE"
													| "MEDICAL"
													| "OTHER",
												message: message || undefined,
											})
										}
										disabled={initiateMutation.isPending}
										className="bg-red-600 hover:bg-red-700 text-white font-bold px-6"
									>
										{initiateMutation.isPending ? "Sending..." : "CONFIRM \u2014 Send Alert Now"}
									</Button>
									<Button type="button" variant="outline" onClick={() => setConfirming(false)}>
										Go Back
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}

function AlertHistory({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.emergency.getAlertHistory.useQuery({
		schoolId,
		limit: 10,
	});

	if (isLoading) return <Skeleton className="h-48" />;

	const statusColors: Record<string, string> = {
		ACTIVE: "bg-red-100 text-red-800",
		ALL_CLEAR: "bg-green-100 text-green-800",
		CANCELLED: "bg-orange-100/40 text-foreground",
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="h-5 w-5" />
					Alert History
				</CardTitle>
			</CardHeader>
			<CardContent>
				{data?.items.length === 0 && (
					<p className="text-sm text-muted-foreground">No previous emergency alerts.</p>
				)}
				<div className="space-y-2">
					{data?.items.map((alert) => (
						<div key={alert.id} className="flex items-center gap-3 rounded-md border p-3">
							<div className="flex-1">
								<p className="font-medium">{EMERGENCY_TYPE_LABELS[alert.type]}</p>
								<p className="text-xs text-muted-foreground">
									{new Date(alert.createdAt).toLocaleDateString("en-GB")}{" "}
									{new Date(alert.createdAt).toLocaleTimeString("en-GB")} · {alert.initiator.name} ·{" "}
									{alert._count.updates} updates
								</p>
							</div>
							<Badge className={statusColors[alert.status]}>
								{alert.status.replace("_", " ").toLowerCase()}
							</Badge>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function ParentEmergencyView() {
	const { data: alert, isLoading } = trpc.emergency.getActiveAlertForParent.useQuery(undefined, {
		refetchInterval: 10000,
	});
	const utils = trpc.useUtils();

	const ackMutation = trpc.emergency.acknowledgeAlert.useMutation({
		onSuccess: () => {
			toast.success("Alert acknowledged");
			utils.emergency.getActiveAlertForParent.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={Shield}
					title="Emergency Alerts"
					description="Real-time updates from your child's school"
				/>

				{isLoading && <Skeleton className="h-48" />}

				{!isLoading && !alert && (
					<Card>
						<CardContent className="py-12 text-center">
							<CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
							<p className="text-lg font-medium text-foreground">All clear</p>
							<p className="text-sm text-muted-foreground mt-1">
								There are no active emergency alerts at this time.
							</p>
						</CardContent>
					</Card>
				)}

				{alert && (
					<Card className="border-red-500 border-2 bg-red-50" data-testid="parent-emergency-alert">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-red-700">
								<AlertTriangle className="h-6 w-6 animate-pulse" />
								{alert.title}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{alert.message && <p className="text-sm font-medium">{alert.message}</p>}
							<p className="text-xs text-muted-foreground">
								Initiated by {alert.initiator.name} at{" "}
								{new Date(alert.createdAt).toLocaleTimeString("en-GB")}
							</p>

							{alert.updates.length > 0 && (
								<div className="space-y-2 border-l-2 border-red-300 pl-3">
									{alert.updates.map((update) => (
										<div key={update.id}>
											<p className="text-sm">{update.message}</p>
											<p className="text-xs text-muted-foreground">
												{new Date(update.createdAt).toLocaleTimeString("en-GB")}
											</p>
										</div>
									))}
								</div>
							)}

							<div className="border-t pt-3">
								{alert.hasAcknowledged ? (
									<p className="text-sm text-green-700 flex items-center gap-2">
										<CheckCircle className="h-4 w-4" />
										You have acknowledged this alert
									</p>
								) : (
									<Button
										onClick={() => ackMutation.mutate({ alertId: alert.id })}
										disabled={ackMutation.isPending}
										className="bg-red-600 hover:bg-red-700 text-white"
										data-testid="acknowledge-alert-button"
									>
										{ackMutation.isPending ? "Acknowledging..." : "I have read this alert"}
									</Button>
								)}
							</div>

							<p className="text-xs text-muted-foreground">
								This page updates automatically every 10 seconds. Please follow school instructions.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</PageShell>
	);
}

export default function EmergencyPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.emergencyCommsEnabled) {
		return <FeatureDisabled featureName="Emergency Communications" />;
	}

	if (!isStaff || !session?.schoolId) {
		return <ParentEmergencyView />;
	}

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={Shield}
					title="Emergency Communications"
					description="Alert all parents immediately during critical incidents"
				/>

				<ActiveAlert schoolId={session.schoolId} />
				<InitiateAlert schoolId={session.schoolId} />
				<AlertHistory schoolId={session.schoolId} />
			</div>
		</PageShell>
	);
}
