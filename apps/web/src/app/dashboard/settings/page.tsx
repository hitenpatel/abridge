"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SUPPORTED_LANGUAGES } from "@/hooks/use-translation";
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
	const [language, setLanguage] = useState("en");

	useEffect(() => {
		if (data) {
			setName(data.name ?? "");
			setPhone(data.phone ?? "");
			setLanguage(data.language ?? "en");
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
					<span className="material-symbols-rounded text-primary" aria-hidden="true">
						person
					</span>
					Profile
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateProfile.mutate({ name, phone: phone || null, language });
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
					<div className="space-y-1">
						<Label htmlFor="settings-language">Preferred Language</Label>
						<select
							id="settings-language"
							data-testid="language-select"
							value={language}
							onChange={(e) => setLanguage(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{SUPPORTED_LANGUAGES.map((lang) => (
								<option
									key={lang.code}
									value={lang.code}
									data-testid={`language-option-${lang.code}`}
								>
									{lang.name}
								</option>
							))}
						</select>
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
					<span className="material-symbols-rounded text-primary" aria-hidden="true">
						notifications
					</span>
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
						<Toggle
							checked={quietEnabled}
							onChange={setQuietEnabled}
							label="Quiet hours"
							data-testid="toggle-quiet-hours"
						/>
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
					<span className="material-symbols-rounded text-primary" aria-hidden="true">
						school
					</span>
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
	const [translation, setTranslation] = useState(false);
	const [parentsEvening, setParentsEvening] = useState(false);
	const [wellbeing, setWellbeing] = useState(false);
	const [emergencyComms, setEmergencyComms] = useState(false);
	const [analytics, setAnalytics] = useState(false);
	const [mealBooking, setMealBooking] = useState(false);
	const [reportCards, setReportCards] = useState(false);
	const [communityHub, setCommunityHub] = useState(false);
	const [homework, setHomework] = useState(false);
	const [readingDiary, setReadingDiary] = useState(false);
	const [visitorManagement, setVisitorManagement] = useState(false);
	const [misIntegration, setMisIntegration] = useState(false);
	const [achievements, setAchievements] = useState(false);
	const [gallery, setGallery] = useState(false);
	const [progressSummaries, setProgressSummaries] = useState(false);
	const [liveChat, setLiveChat] = useState(false);
	const [aiDrafting, setAiDrafting] = useState(false);
	const [attendanceAlerts, setAttendanceAlerts] = useState(false);
	const [studentPortal, setStudentPortal] = useState(false);

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
			setTranslation(data.translationEnabled);
			setParentsEvening(data.parentsEveningEnabled);
			setWellbeing(data.wellbeingEnabled);
			setEmergencyComms(data.emergencyCommsEnabled);
			setAnalytics(data.analyticsEnabled);
			setMealBooking(data.mealBookingEnabled);
			setReportCards(data.reportCardsEnabled);
			setCommunityHub(data.communityHubEnabled);
			setHomework(data.homeworkEnabled);
			setReadingDiary(data.readingDiaryEnabled);
			setVisitorManagement(data.visitorManagementEnabled);
			setMisIntegration(data.misIntegrationEnabled);
			setAchievements(data.achievementsEnabled);
			setGallery(data.galleryEnabled);
			setProgressSummaries(data.progressSummariesEnabled);
			setLiveChat(data.liveChatEnabled);
			setAiDrafting(data.aiDraftingEnabled);
			setAttendanceAlerts(data.attendanceAlertsEnabled);
			setStudentPortal(data.studentPortalEnabled);
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
		<Card className="rounded-2xl border border-gray-100" data-testid="feature-toggles-card">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary" aria-hidden="true">
						toggle_on
					</span>
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
							translationEnabled: translation,
							parentsEveningEnabled: parentsEvening,
							wellbeingEnabled: wellbeing,
							emergencyCommsEnabled: emergencyComms,
							analyticsEnabled: analytics,
							mealBookingEnabled: mealBooking,
							reportCardsEnabled: reportCards,
							communityHubEnabled: communityHub,
							homeworkEnabled: homework,
							readingDiaryEnabled: readingDiary,
							visitorManagementEnabled: visitorManagement,
							misIntegrationEnabled: misIntegration,
							achievementsEnabled: achievements,
							galleryEnabled: gallery,
							progressSummariesEnabled: progressSummaries,
							liveChatEnabled: liveChat,
							aiDraftingEnabled: aiDrafting,
							attendanceAlertsEnabled: attendanceAlerts,
							studentPortalEnabled: studentPortal,
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
						<Toggle
							checked={translation}
							onChange={setTranslation}
							label="Translation"
							data-testid="toggle-translation"
						/>
						<Toggle
							checked={parentsEvening}
							onChange={setParentsEvening}
							label="Parents' Evening"
							data-testid="toggle-parents-evening"
						/>
						<Toggle
							checked={wellbeing}
							onChange={setWellbeing}
							label="Wellbeing Check-ins"
							data-testid="toggle-wellbeing"
						/>
						<Toggle
							checked={emergencyComms}
							onChange={setEmergencyComms}
							label="Emergency Communications"
							data-testid="toggle-emergency-comms"
						/>
						<Toggle
							checked={analytics}
							onChange={setAnalytics}
							label="Admin Analytics"
							data-testid="toggle-analytics"
						/>
						<Toggle
							checked={mealBooking}
							onChange={setMealBooking}
							label="Meal Booking"
							data-testid="toggle-meal-booking"
						/>
						<Toggle
							checked={reportCards}
							onChange={setReportCards}
							label="Report Cards"
							data-testid="toggle-report-cards"
						/>
						<Toggle
							checked={communityHub}
							onChange={setCommunityHub}
							label="Community Hub"
							data-testid="toggle-community-hub"
						/>
						<Toggle
							checked={homework}
							onChange={setHomework}
							label="Homework Tracker"
							data-testid="toggle-homework"
						/>
						<Toggle
							checked={readingDiary}
							onChange={setReadingDiary}
							label="Reading Diary"
							data-testid="toggle-reading-diary"
						/>
						<Toggle
							checked={visitorManagement}
							onChange={setVisitorManagement}
							label="Visitor Management"
							data-testid="toggle-visitor-management"
						/>
						<Toggle
							checked={misIntegration}
							onChange={setMisIntegration}
							label="MIS Integration"
							data-testid="toggle-mis-integration"
						/>
						<Toggle
							checked={achievements}
							onChange={setAchievements}
							label="Achievements"
							data-testid="toggle-achievements"
						/>
						<Toggle
							checked={gallery}
							onChange={setGallery}
							label="Gallery"
							data-testid="toggle-gallery"
						/>
						<Toggle
							checked={progressSummaries}
							onChange={setProgressSummaries}
							label="Progress Summaries"
							data-testid="toggle-progress-summaries"
						/>
						<Toggle
							checked={liveChat}
							onChange={setLiveChat}
							label="Live Chat"
							data-testid="toggle-live-chat"
						/>
						<Toggle
							checked={aiDrafting}
							onChange={setAiDrafting}
							label="AI Drafting"
							data-testid="toggle-ai-drafting"
						/>
						<Toggle
							checked={attendanceAlerts}
							onChange={setAttendanceAlerts}
							label="Attendance Alerts"
							data-testid="toggle-attendance-alerts"
						/>
						<Toggle
							checked={studentPortal}
							onChange={setStudentPortal}
							label="Student Portal"
							data-testid="toggle-student-portal"
						/>
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
					<span className="material-symbols-rounded text-primary" aria-hidden="true">
						payments
					</span>
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

const FONT_OPTIONS = [
	{ value: "DEFAULT", label: "Default" },
	{ value: "ARIAL", label: "Arial" },
	{ value: "TIMES_NEW_ROMAN", label: "Times New Roman" },
	{ value: "GEORGIA", label: "Georgia" },
	{ value: "VERDANA", label: "Verdana" },
	{ value: "COMIC_SANS", label: "Comic Sans" },
	{ value: "OPEN_SANS", label: "Open Sans" },
	{ value: "ROBOTO", label: "Roboto" },
	{ value: "LATO", label: "Lato" },
	{ value: "MONTSERRAT", label: "Montserrat" },
] as const;

function BrandingCard({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.settings.getBranding.useQuery({ schoolId });
	const [brandColor, setBrandColor] = useState("#1E3A5F");
	const [secondaryColor, setSecondaryColor] = useState("");
	const [schoolMotto, setSchoolMotto] = useState("");
	const [brandFont, setBrandFont] = useState("DEFAULT");

	useEffect(() => {
		if (data) {
			setBrandColor(data.brandColor ?? "#1E3A5F");
			setSecondaryColor(data.secondaryColor ?? "");
			setSchoolMotto(data.schoolMotto ?? "");
			setBrandFont(data.brandFont ?? "DEFAULT");
		}
	}, [data]);

	const updateBranding = trpc.settings.updateBranding.useMutation({
		onSuccess: () => toast.success("Branding settings saved"),
		onError: (err) => toast.error(err.message),
	});

	const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);

	if (isLoading) {
		return (
			<Card className="rounded-2xl border border-gray-100">
				<CardHeader>
					<Skeleton className="h-6 w-40" />
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
		<Card className="rounded-2xl border border-gray-100" data-testid="branding-card">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="material-symbols-rounded text-primary" aria-hidden="true">
						palette
					</span>
					School Branding
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						updateBranding.mutate({
							schoolId,
							brandColor,
							secondaryColor: secondaryColor || null,
							schoolMotto: schoolMotto || null,
							brandFont: brandFont as (typeof FONT_OPTIONS)[number]["value"],
						});
					}}
					className="space-y-4"
				>
					<p className="text-sm text-gray-500">
						Customise your school's branding. These settings affect how your school appears to
						parents and staff.
					</p>

					<div className="space-y-1">
						<Label htmlFor="brand-color">Brand Colour</Label>
						<div className="flex items-center gap-3">
							<div
								className="w-10 h-10 rounded-lg border border-gray-200 shrink-0"
								style={{ backgroundColor: isValidHex(brandColor) ? brandColor : "#cccccc" }}
							/>
							<Input
								id="brand-color"
								data-testid="brand-color-input"
								value={brandColor}
								onChange={(e) => setBrandColor(e.target.value)}
								placeholder="#1E3A5F"
								maxLength={7}
							/>
						</div>
						{brandColor && !isValidHex(brandColor) && (
							<p className="text-xs text-red-500">Enter a valid hex colour (e.g. #1E3A5F)</p>
						)}
					</div>

					<div className="space-y-1">
						<Label htmlFor="secondary-color">Secondary Colour</Label>
						<div className="flex items-center gap-3">
							<div
								className="w-10 h-10 rounded-lg border border-gray-200 shrink-0"
								style={{
									backgroundColor:
										secondaryColor && isValidHex(secondaryColor) ? secondaryColor : "#e5e7eb",
								}}
							/>
							<Input
								id="secondary-color"
								data-testid="secondary-color-input"
								value={secondaryColor}
								onChange={(e) => setSecondaryColor(e.target.value)}
								placeholder="#4A90D9"
								maxLength={7}
							/>
						</div>
						{secondaryColor && !isValidHex(secondaryColor) && (
							<p className="text-xs text-red-500">Enter a valid hex colour (e.g. #4A90D9)</p>
						)}
					</div>

					<div className="space-y-1">
						<Label htmlFor="school-motto">School Motto</Label>
						<Input
							id="school-motto"
							data-testid="school-motto-input"
							value={schoolMotto}
							onChange={(e) => setSchoolMotto(e.target.value)}
							placeholder="Enter your school's motto"
							maxLength={200}
						/>
						<p className="text-xs text-gray-400">{schoolMotto.length}/200 characters</p>
					</div>

					<div className="space-y-1">
						<Label htmlFor="brand-font">Font</Label>
						<select
							id="brand-font"
							data-testid="brand-font-select"
							value={brandFont}
							onChange={(e) => setBrandFont(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{FONT_OPTIONS.map((font) => (
								<option key={font.value} value={font.value}>
									{font.label}
								</option>
							))}
						</select>
					</div>

					<Button
						type="submit"
						data-testid="branding-save-button"
						disabled={
							updateBranding.isPending ||
							(brandColor !== "" && !isValidHex(brandColor)) ||
							(secondaryColor !== "" && !isValidHex(secondaryColor))
						}
					>
						{updateBranding.isPending ? "Saving..." : "Save Branding"}
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
				{isAdmin && schoolId && <BrandingCard schoolId={schoolId} />}
			</div>
		</div>
	);
}
