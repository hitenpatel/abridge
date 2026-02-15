"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

function Toggle({
	checked,
	onChange,
	label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<label className="flex items-center justify-between py-2 cursor-pointer">
			<span className="text-sm font-medium text-gray-700">{label}</span>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
					checked ? "bg-primary" : "bg-gray-200"
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
						checked ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</label>
	);
}

function ProfileCard() {
	const { data, isLoading } = trpc.settings.getProfile.useQuery();
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");

	useEffect(() => {
		if (data) {
			setName(data.name ?? "");
			setPhone(data.phone ?? "");
		}
	}, [data]);

	const updateProfile = trpc.settings.updateProfile.useMutation({
		onSuccess: () => toast.success("Profile saved"),
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-2xl border border-gray-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">person</span>
					Profile
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateProfile.mutate({ name, phone: phone || null });
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Label htmlFor="settings-name">Name</Label>
						<Input
							id="settings-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="settings-email">Email</Label>
						<Input
							id="settings-email"
							value={data?.email ?? ""}
							disabled
							className="bg-gray-50 text-gray-500"
						/>
						<p className="text-xs text-gray-400">Contact admin to change your email</p>
					</div>
					<div className="space-y-1">
						<Label htmlFor="settings-phone">Phone</Label>
						<Input
							id="settings-phone"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="Optional"
						/>
					</div>
					<Button type="submit" disabled={updateProfile.isPending}>
						{updateProfile.isPending ? "Saving..." : "Save Profile"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function NotificationsCard() {
	const { data, isLoading } = trpc.settings.getNotificationPreferences.useQuery();
	const [push, setPush] = useState(true);
	const [sms, setSms] = useState(false);
	const [email, setEmail] = useState(true);
	const [quietEnabled, setQuietEnabled] = useState(false);
	const [quietStart, setQuietStart] = useState("21:00");
	const [quietEnd, setQuietEnd] = useState("07:00");

	useEffect(() => {
		if (data) {
			setPush(data.notifyByPush);
			setSms(data.notifyBySms);
			setEmail(data.notifyByEmail);
			setQuietEnabled(!!data.quietStart);
			setQuietStart(data.quietStart ?? "21:00");
			setQuietEnd(data.quietEnd ?? "07:00");
		}
	}, [data]);

	const updatePrefs = trpc.settings.updateNotificationPreferences.useMutation({
		onSuccess: () => toast.success("Notification preferences saved"),
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-2xl border border-gray-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">notifications</span>
					Notifications
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updatePrefs.mutate({
							notifyByPush: push,
							notifyBySms: sms,
							notifyByEmail: email,
							quietStart: quietEnabled ? quietStart : null,
							quietEnd: quietEnabled ? quietEnd : null,
						});
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Toggle checked={push} onChange={setPush} label="Push notifications" />
						<Toggle checked={sms} onChange={setSms} label="SMS notifications" />
						<Toggle checked={email} onChange={setEmail} label="Email notifications" />
					</div>

					<div className="border-t pt-4">
						<Toggle checked={quietEnabled} onChange={setQuietEnabled} label="Quiet hours" />
						{quietEnabled && (
							<div className="mt-3 flex items-center gap-3">
								<div className="space-y-1">
									<Label htmlFor="quiet-start">From</Label>
									<Input
										id="quiet-start"
										type="time"
										value={quietStart}
										onChange={(e) => setQuietStart(e.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="quiet-end">To</Label>
									<Input
										id="quiet-end"
										type="time"
										value={quietEnd}
										onChange={(e) => setQuietEnd(e.target.value)}
									/>
								</div>
							</div>
						)}
						<p className="text-xs text-gray-400 mt-2">
							Urgent messages will still be delivered during quiet hours
						</p>
					</div>

					<Button type="submit" disabled={updatePrefs.isPending}>
						{updatePrefs.isPending ? "Saving..." : "Save Notifications"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function SchoolSettingsCard({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.settings.getSchoolSettings.useQuery({ schoolId });
	const [schoolName, setSchoolName] = useState("");
	const [defPush, setDefPush] = useState(true);
	const [defSms, setDefSms] = useState(false);
	const [defEmail, setDefEmail] = useState(true);

	useEffect(() => {
		if (data) {
			setSchoolName(data.name);
			setDefPush(data.defaultNotifyByPush);
			setDefSms(data.defaultNotifyBySms);
			setDefEmail(data.defaultNotifyByEmail);
		}
	}, [data]);

	const updateSchool = trpc.settings.updateSchoolSettings.useMutation({
		onSuccess: () => toast.success("School settings saved"),
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-8 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rounded-2xl border border-gray-100">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">school</span>
					School Settings
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateSchool.mutate({
							schoolId,
							name: schoolName,
							defaultNotifyByPush: defPush,
							defaultNotifyBySms: defSms,
							defaultNotifyByEmail: defEmail,
						});
					}}
					className="space-y-4"
				>
					<div className="space-y-1">
						<Label htmlFor="school-name">School Name</Label>
						<Input
							id="school-name"
							value={schoolName}
							onChange={(e) => setSchoolName(e.target.value)}
							required
						/>
					</div>

					<div className="border-t pt-4">
						<p className="text-sm font-medium text-gray-700 mb-2">
							Default notification preferences for new members
						</p>
						<Toggle checked={defPush} onChange={setDefPush} label="Push notifications" />
						<Toggle checked={defSms} onChange={setDefSms} label="SMS notifications" />
						<Toggle checked={defEmail} onChange={setDefEmail} label="Email notifications" />
					</div>

					<Button type="submit" disabled={updateSchool.isPending}>
						{updateSchool.isPending ? "Saving..." : "Save School Settings"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

export default function SettingsPage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();

	if (isLoading) {
		return (
			<div className="max-w-2xl mx-auto space-y-6">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-64 w-full rounded-2xl" />
				<Skeleton className="h-48 w-full rounded-2xl" />
			</div>
		);
	}

	const isAdmin = session?.staffRole === "ADMIN";
	const schoolId = session?.schoolId;

	return (
		<div className="max-w-2xl mx-auto">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
				<p className="text-gray-500 mt-1">Manage your account and preferences</p>
			</div>

			<div className="space-y-6">
				<ProfileCard />
				<NotificationsCard />
				{isAdmin && schoolId && <SchoolSettingsCard schoolId={schoolId} />}
			</div>
		</div>
	);
}
