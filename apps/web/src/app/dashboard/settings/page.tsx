"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Toggle({
	checked,
	onChange,
	label,
	"data-testid": dataTestId,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; "data-testid"?: string }) {
	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-sm font-medium text-gray-700">{label}</span>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={label}
				data-testid={dataTestId}
				onClick={() => onChange(!checked)}
				className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
					checked ? "bg-primary" : "bg-gray-200"
				}`}
			>
				<span
					className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
						checked ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</button>
		</div>
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
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
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
							data-testid="profile-name-input"
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
					<Button
						type="submit"
						data-testid="profile-save-button"
						disabled={updateProfile.isPending}
					>
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
				<CardHeader>
					<Skeleton className="h-6 w-48" />
				</CardHeader>
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
						<Toggle
							checked={push}
							onChange={setPush}
							label="Push notifications"
							data-testid="toggle-push"
						/>
						<Toggle
							checked={sms}
							onChange={setSms}
							label="SMS notifications"
							data-testid="toggle-sms"
						/>
						<Toggle
							checked={email}
							onChange={setEmail}
							label="Email notifications"
							data-testid="toggle-email"
						/>
					</div>

					<div className="border-t pt-4">
						<Toggle checked={quietEnabled} onChange={setQuietEnabled} label="Quiet hours" />
						{quietEnabled && (
							<div className="mt-3 flex items-center gap-3">
								<div className="space-y-1">
									<Label htmlFor="quiet-start">From</Label>
									<Input
										id="quiet-start"
										data-testid="quiet-start-input"
										type="time"
										value={quietStart}
										onChange={(e) => setQuietStart(e.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="quiet-end">To</Label>
									<Input
										id="quiet-end"
										data-testid="quiet-end-input"
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

					<Button
						type="submit"
						data-testid="notifications-save-button"
						disabled={updatePrefs.isPending}
					>
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
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
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
							data-testid="school-name-input"
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

					<Button
						type="submit"
						data-testid="school-settings-save"
						disabled={updateSchool.isPending}
					>
						{updateSchool.isPending ? "Saving..." : "Save School Settings"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function FeatureTogglesCard({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.settings.getFeatureToggles.useQuery({ schoolId });
	const utils = trpc.useUtils();
	const [messaging, setMessaging] = useState(true);
	const [payments, setPayments] = useState(true);
	const [attendance, setAttendance] = useState(true);
	const [calendar, setCalendar] = useState(true);
	const [forms, setForms] = useState(true);
	const [dinnerMoney, setDinnerMoney] = useState(true);
	const [trips, setTrips] = useState(true);
	const [clubs, setClubs] = useState(true);
	const [uniform, setUniform] = useState(true);
	const [other, setOther] = useState(true);

	useEffect(() => {
		if (data) {
			setMessaging(data.messagingEnabled);
			setPayments(data.paymentsEnabled);
			setAttendance(data.attendanceEnabled);
			setCalendar(data.calendarEnabled);
			setForms(data.formsEnabled);
			setDinnerMoney(data.paymentDinnerMoneyEnabled);
			setTrips(data.paymentTripsEnabled);
			setClubs(data.paymentClubsEnabled);
			setUniform(data.paymentUniformEnabled);
			setOther(data.paymentOtherEnabled);
		}
	}, [data]);

	const updateToggles = trpc.settings.updateFeatureToggles.useMutation({
		onSuccess: () => {
			toast.success("Feature settings saved");
			utils.settings.getFeatureToggles.invalidate({ schoolId });
		},
		onError: (err) => toast.error(err.message),
	});

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader>
					<Skeleton className="h-6 w-40" />
				</CardHeader>
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
					<span className="material-symbols-rounded text-primary">toggle_on</span>
					Features
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateToggles.mutate({
							schoolId,
							messagingEnabled: messaging,
							paymentsEnabled: payments,
							attendanceEnabled: attendance,
							calendarEnabled: calendar,
							formsEnabled: forms,
							paymentDinnerMoneyEnabled: dinnerMoney,
							paymentTripsEnabled: trips,
							paymentClubsEnabled: clubs,
							paymentUniformEnabled: uniform,
							paymentOtherEnabled: other,
						});
					}}
					className="space-y-4"
				>
					<p className="text-sm text-gray-500">
						Enable or disable features for your school. Disabled features will be hidden from
						navigation and blocked at the API level.
					</p>

					<div className="space-y-1">
						<Toggle
							checked={messaging}
							onChange={setMessaging}
							label="Messaging"
							data-testid="toggle-messaging"
						/>
						<Toggle
							checked={payments}
							onChange={setPayments}
							label="Payments"
							data-testid="toggle-payments"
						/>
						{payments && (
							<div className="pl-6 border-l-2 border-gray-100 ml-2 space-y-1">
								<p className="text-xs text-gray-400 pt-1 pb-1">Payment categories</p>
								<Toggle
									checked={dinnerMoney}
									onChange={setDinnerMoney}
									label="Dinner Money"
									data-testid="toggle-payment-dinner-money"
								/>
								<Toggle
									checked={trips}
									onChange={setTrips}
									label="Trips"
									data-testid="toggle-payment-trips"
								/>
								<Toggle
									checked={clubs}
									onChange={setClubs}
									label="Clubs"
									data-testid="toggle-payment-clubs"
								/>
								<Toggle
									checked={uniform}
									onChange={setUniform}
									label="Uniform"
									data-testid="toggle-payment-uniform"
								/>
								<Toggle
									checked={other}
									onChange={setOther}
									label="Other"
									data-testid="toggle-payment-other"
								/>
							</div>
						)}
						<Toggle
							checked={attendance}
							onChange={setAttendance}
							label="Attendance"
							data-testid="toggle-attendance"
						/>
						<Toggle
							checked={calendar}
							onChange={setCalendar}
							label="Calendar"
							data-testid="toggle-calendar"
						/>
						<Toggle checked={forms} onChange={setForms} label="Forms" data-testid="toggle-forms" />
					</div>

					<Button
						type="submit"
						data-testid="feature-toggles-save"
						disabled={updateToggles.isPending}
					>
						{updateToggles.isPending ? "Saving..." : "Save Features"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function StripeCard({ schoolId }: { schoolId: string }) {
	const { data: status, isLoading } = trpc.stripe.getStripeStatus.useQuery({ schoolId });
	const createOnboarding = trpc.stripe.createOnboardingLink.useMutation({
		onSuccess: (data) => {
			window.open(data.url, "_blank");
		},
		onError: (err) => toast.error(err.message),
	});

	const isConnected = status?.chargesEnabled;

	return (
		<Card className="rounded-2xl border border-gray-100 shadow-sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary">payments</span>
					Stripe Payments
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-2" data-testid="stripe-status">
					<div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`} />
					<span className="text-sm font-medium">
						{isLoading ? "Loading..." : isConnected ? "Connected" : "Not connected"}
					</span>
				</div>
				{status?.isConnected && !status.chargesEnabled && (
					<p className="text-sm text-muted-foreground">
						Onboarding incomplete. Finish setup to accept payments.
					</p>
				)}
				{!isConnected && !isLoading && (
					<Button
						data-testid="stripe-connect-button"
						onClick={() => createOnboarding.mutate({ schoolId })}
						disabled={createOnboarding.isPending}
					>
						{createOnboarding.isPending ? "Connecting..." : "Connect Stripe"}
					</Button>
				)}
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
		<div className="max-w-2xl mx-auto" data-testid="settings-view">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900">Settings</h1>
				<p className="text-gray-500 mt-1">Manage your account and preferences</p>
			</div>

			<div className="space-y-6">
				<ProfileCard />
				<NotificationsCard />
				{isAdmin && schoolId && <SchoolSettingsCard schoolId={schoolId} />}
				{isAdmin && schoolId && <FeatureTogglesCard schoolId={schoolId} />}
				{isAdmin && schoolId && <StripeCard schoolId={schoolId} />}
			</div>
		</div>
	);
}
