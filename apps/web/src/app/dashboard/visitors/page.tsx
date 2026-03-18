"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	AlertTriangle,
	BadgeCheck,
	ClipboardList,
	Download,
	LogIn,
	LogOut,
	Plus,
	Search,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useState } from "react";

const PURPOSES = [
	"MEETING",
	"MAINTENANCE",
	"DELIVERY",
	"VOLUNTEERING",
	"INSPECTION",
	"PARENT_VISIT",
	"CONTRACTOR",
	"OTHER",
] as const;

const PURPOSE_LABELS: Record<string, string> = {
	MEETING: "Meeting",
	MAINTENANCE: "Maintenance",
	DELIVERY: "Delivery",
	VOLUNTEERING: "Volunteering",
	INSPECTION: "Inspection",
	PARENT_VISIT: "Parent Visit",
	CONTRACTOR: "Contractor",
	OTHER: "Other",
};

const DBS_TYPES = ["BASIC", "STANDARD", "ENHANCED", "ENHANCED_BARRED"] as const;

const DBS_TYPE_LABELS: Record<string, string> = {
	BASIC: "Basic",
	STANDARD: "Standard",
	ENHANCED: "Enhanced",
	ENHANCED_BARRED: "Enhanced with Barred List",
};

const DBS_STATUS_COLORS: Record<string, string> = {
	VALID: "bg-green-100 text-green-800",
	EXPIRING_SOON: "bg-amber-100 text-amber-800",
	EXPIRED: "bg-red-100 text-red-800",
};

const DBS_STATUS_LABELS: Record<string, string> = {
	VALID: "Valid",
	EXPIRING_SOON: "Expiring Soon",
	EXPIRED: "Expired",
};

type Tab = "signin" | "onsite" | "dbs" | "history";

function formatDuration(signInAt: Date | string, signOutAt?: Date | string | null): string {
	const start = new Date(signInAt);
	const end = signOutAt ? new Date(signOutAt) : new Date();
	const diffMs = end.getTime() - start.getTime();
	const mins = Math.floor(diffMs / 60000);
	const hours = Math.floor(mins / 60);
	const remainingMins = mins % 60;
	if (hours > 0) return `${hours}h ${remainingMins}m`;
	return `${mins}m`;
}

function formatTime(date: Date | string): string {
	return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function SignInTab({ schoolId }: { schoolId: string }) {
	const [name, setName] = useState("");
	const [organisation, setOrganisation] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>("MEETING");
	const [visitingStaff, setVisitingStaff] = useState("");
	const [badgeNumber, setBadgeNumber] = useState("");
	const [isNewVisitor, setIsNewVisitor] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [dbsWarning, setDbsWarning] = useState(false);
	const [signInSuccess, setSignInSuccess] = useState(false);

	const utils = trpc.useUtils();

	const { data: suggestions } = trpc.visitor.searchVisitors.useQuery(
		{ schoolId, query: name },
		{ enabled: name.length >= 2 },
	);

	const signInMutation = trpc.visitor.signIn.useMutation({
		onSuccess: (data) => {
			if (data.dbsWarning) {
				setDbsWarning(true);
			}
			setSignInSuccess(true);
			utils.visitor.getOnSite.invalidate({ schoolId });
			setTimeout(() => {
				setName("");
				setOrganisation("");
				setPhone("");
				setEmail("");
				setPurpose("MEETING");
				setVisitingStaff("");
				setBadgeNumber("");
				setIsNewVisitor(false);
				setDbsWarning(false);
				setSignInSuccess(false);
			}, 2000);
		},
	});

	const selectVisitor = (visitor: {
		name: string;
		organisation?: string | null;
		phone?: string | null;
		email?: string | null;
	}) => {
		setName(visitor.name);
		setOrganisation(visitor.organisation ?? "");
		setPhone(visitor.phone ?? "");
		setEmail(visitor.email ?? "");
		setIsNewVisitor(false);
		setShowSuggestions(false);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<LogIn className="h-5 w-5" />
					Sign In Visitor
				</CardTitle>
			</CardHeader>
			<CardContent>
				{signInSuccess && (
					<div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
						Visitor signed in successfully.
					</div>
				)}

				{dbsWarning && (
					<div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-start gap-2">
						<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
						<span>
							This visitor does not have a valid DBS check on file. DBS verification is required for
							volunteering activities. Please check the DBS Register.
						</span>
					</div>
				)}

				<div className="space-y-4">
					{/* Name with search */}
					<div className="relative">
						<label className="text-sm font-medium" htmlFor="visitor-name">
							Visitor Name
						</label>
						<div className="relative mt-1">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								id="visitor-name"
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									setShowSuggestions(true);
									if (e.target.value.length >= 2) {
										setIsNewVisitor(
											!suggestions?.some(
												(s) => s.name.toLowerCase() === e.target.value.toLowerCase(),
											),
										);
									} else {
										setIsNewVisitor(false);
									}
								}}
								onFocus={() => setShowSuggestions(true)}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
								placeholder="Search or enter visitor name..."
								className="block w-full rounded-md border p-2 pl-9 text-sm"
							/>
						</div>
						{showSuggestions && suggestions && suggestions.length > 0 && name.length >= 2 && (
							<div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-md">
								{suggestions.map((visitor) => (
									<button
										key={visitor.id}
										type="button"
										onMouseDown={() => selectVisitor(visitor)}
										className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between"
									>
										<span>{visitor.name}</span>
										{visitor.organisation && (
											<span className="text-xs text-muted-foreground">{visitor.organisation}</span>
										)}
									</button>
								))}
								<button
									type="button"
									onMouseDown={() => {
										setIsNewVisitor(true);
										setShowSuggestions(false);
									}}
									className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-t text-primary"
								>
									+ New visitor: {name}
								</button>
							</div>
						)}
					</div>

					{/* New visitor fields */}
					{isNewVisitor && (
						<div className="space-y-3 rounded-md border border-dashed p-3">
							<p className="text-xs font-medium text-muted-foreground">New Visitor Details</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="visitor-org">
										Organisation
									</label>
									<input
										id="visitor-org"
										type="text"
										value={organisation}
										onChange={(e) => setOrganisation(e.target.value)}
										placeholder="Company / Organisation"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="visitor-phone">
										Phone
									</label>
									<input
										id="visitor-phone"
										type="tel"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="Phone number"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="visitor-email">
										Email
									</label>
									<input
										id="visitor-email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="Email address"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Purpose */}
					<div>
						<label className="text-sm font-medium" htmlFor="visitor-purpose">
							Purpose of Visit
						</label>
						<select
							id="visitor-purpose"
							value={purpose}
							onChange={(e) => setPurpose(e.target.value as (typeof PURPOSES)[number])}
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						>
							{PURPOSES.map((p) => (
								<option key={p} value={p}>
									{PURPOSE_LABELS[p]}
								</option>
							))}
						</select>
					</div>

					{/* DBS warning for volunteering */}
					{purpose === "VOLUNTEERING" && (
						<div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-start gap-2">
							<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
							<span>
								Volunteering requires a valid DBS check. Please ensure the visitor's DBS record is
								up to date in the DBS Register tab before signing in.
							</span>
						</div>
					)}

					{/* Visiting */}
					<div>
						<label className="text-sm font-medium" htmlFor="visitor-visiting">
							Visiting (who they're here to see)
						</label>
						<input
							id="visitor-visiting"
							type="text"
							value={visitingStaff}
							onChange={(e) => setVisitingStaff(e.target.value)}
							placeholder="Staff member name"
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						/>
					</div>

					{/* Badge number */}
					<div>
						<label className="text-sm font-medium" htmlFor="visitor-badge">
							Badge Number
						</label>
						<input
							id="visitor-badge"
							type="text"
							value={badgeNumber}
							onChange={(e) => setBadgeNumber(e.target.value)}
							placeholder="e.g. V001"
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						/>
					</div>

					<Button
						type="button"
						onClick={() => {
							signInMutation.mutate({
								schoolId,
								name: name.trim(),
								organisation: organisation || undefined,
								phone: phone || undefined,
								email: email || undefined,
								purpose,
								visitingStaff: visitingStaff || undefined,
								badgeNumber: badgeNumber || undefined,
							});
						}}
						disabled={!name.trim() || signInMutation.isPending}
					>
						{signInMutation.isPending ? "Signing In..." : "Sign In"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function OnSiteTab({ schoolId }: { schoolId: string }) {
	const utils = trpc.useUtils();

	const { data: onSite, isLoading } = trpc.visitor.getOnSite.useQuery({ schoolId });

	const signOutMutation = trpc.visitor.signOut.useMutation({
		onSuccess: () => {
			utils.visitor.getOnSite.invalidate({ schoolId });
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Visitors On Site
					{onSite && (
						<Badge className="bg-blue-100 text-blue-800 ml-2">{onSite.length} on site</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-48 w-full" />
				) : !onSite?.length ? (
					<p className="text-sm text-muted-foreground">No visitors currently on site.</p>
				) : (
					<div className="space-y-2">
						{onSite.map((log) => (
							<div key={log.id} className="flex items-center gap-3 rounded-md border p-3">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="font-medium text-sm">{log.visitor.name}</span>
										<Badge className="bg-orange-100/40 text-gray-600">
											{PURPOSE_LABELS[log.purpose] ?? log.purpose}
										</Badge>
										{log.badgeNumber && (
											<Badge className="bg-blue-100 text-blue-800">Badge: {log.badgeNumber}</Badge>
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										Signed in at {formatTime(log.signInAt)} ({formatDuration(log.signInAt)} ago)
										{log.visitingStaff && <> &middot; Visiting: {log.visitingStaff}</>}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => signOutMutation.mutate({ schoolId, logId: log.id })}
									disabled={signOutMutation.isPending}
									className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
								>
									<LogOut className="h-3.5 w-3.5" />
									Sign Out
								</Button>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function DbsRegisterTab({ schoolId }: { schoolId: string }) {
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [showAddForm, setShowAddForm] = useState(false);
	const [dbsName, setDbsName] = useState("");
	const [dbsNumber, setDbsNumber] = useState("");
	const [dbsType, setDbsType] = useState<(typeof DBS_TYPES)[number]>("ENHANCED");
	const [issueDate, setIssueDate] = useState("");
	const [expiryDate, setExpiryDate] = useState("");

	const utils = trpc.useUtils();

	const { data: dbsRecords, isLoading } = trpc.visitor.getDbsRegister.useQuery({ schoolId });

	const addDbsMutation = trpc.visitor.addOrUpdateDbs.useMutation({
		onSuccess: () => {
			utils.visitor.getDbsRegister.invalidate({ schoolId });
			setShowAddForm(false);
			setDbsName("");
			setDbsNumber("");
			setDbsType("ENHANCED");
			setIssueDate("");
			setExpiryDate("");
		},
	});

	const filteredRecords = dbsRecords?.filter((r) => {
		if (statusFilter === "ALL") return true;
		return r.status === statusFilter;
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span className="flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						DBS Register
					</span>
					<Button
						type="button"
						size="sm"
						onClick={() => setShowAddForm(!showAddForm)}
						className="flex items-center gap-1.5"
					>
						<Plus className="h-3.5 w-3.5" />
						Add DBS
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{showAddForm && (
					<div className="mb-4 rounded-md border border-dashed p-4 space-y-3">
						<p className="text-sm font-medium">Add DBS Record</p>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div>
								<label className="text-xs text-muted-foreground" htmlFor="dbs-name">
									Name
								</label>
								<input
									id="dbs-name"
									type="text"
									value={dbsName}
									onChange={(e) => setDbsName(e.target.value)}
									placeholder="Full name"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground" htmlFor="dbs-number">
									DBS Number
								</label>
								<input
									id="dbs-number"
									type="text"
									value={dbsNumber}
									onChange={(e) => setDbsNumber(e.target.value)}
									placeholder="DBS certificate number"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground" htmlFor="dbs-type">
									DBS Type
								</label>
								<select
									id="dbs-type"
									value={dbsType}
									onChange={(e) => setDbsType(e.target.value as (typeof DBS_TYPES)[number])}
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								>
									{DBS_TYPES.map((t) => (
										<option key={t} value={t}>
											{DBS_TYPE_LABELS[t]}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="text-xs text-muted-foreground" htmlFor="dbs-issue">
									Issue Date
								</label>
								<input
									id="dbs-issue"
									type="date"
									value={issueDate}
									onChange={(e) => setIssueDate(e.target.value)}
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground" htmlFor="dbs-expiry">
									Expiry Date (optional)
								</label>
								<input
									id="dbs-expiry"
									type="date"
									value={expiryDate}
									onChange={(e) => setExpiryDate(e.target.value)}
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								onClick={() => {
									addDbsMutation.mutate({
										schoolId,
										name: dbsName.trim(),
										dbsNumber: dbsNumber.trim(),
										dbsType,
										issueDate: new Date(`${issueDate}T00:00:00`),
										expiryDate: expiryDate ? new Date(`${expiryDate}T00:00:00`) : undefined,
									});
								}}
								disabled={
									!dbsName.trim() || !dbsNumber.trim() || !issueDate || addDbsMutation.isPending
								}
							>
								{addDbsMutation.isPending ? "Saving..." : "Save DBS Record"}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setShowAddForm(false)}
							>
								Cancel
							</Button>
						</div>
					</div>
				)}

				{/* Filter */}
				<div className="mb-4 flex gap-2">
					{["ALL", "VALID", "EXPIRING_SOON", "EXPIRED"].map((status) => (
						<Button
							key={status}
							type="button"
							size="sm"
							variant={statusFilter === status ? "default" : "outline"}
							onClick={() => setStatusFilter(status)}
						>
							{status === "ALL" ? "All" : DBS_STATUS_LABELS[status]}
						</Button>
					))}
				</div>

				{isLoading ? (
					<Skeleton className="h-48 w-full" />
				) : !filteredRecords?.length ? (
					<p className="text-sm text-muted-foreground">No DBS records found.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-left">
									<th className="pb-2 pr-4 font-medium">Name</th>
									<th className="pb-2 pr-4 font-medium">DBS Number</th>
									<th className="pb-2 pr-4 font-medium">Type</th>
									<th className="pb-2 pr-4 font-medium">Issue Date</th>
									<th className="pb-2 pr-4 font-medium">Expiry</th>
									<th className="pb-2 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{filteredRecords.map((record) => (
									<tr key={record.id} className="border-b">
										<td className="py-2 pr-4">{record.name}</td>
										<td className="py-2 pr-4 font-mono text-xs">{record.dbsNumber}</td>
										<td className="py-2 pr-4">
											{DBS_TYPE_LABELS[record.dbsType] ?? record.dbsType}
										</td>
										<td className="py-2 pr-4">
											{new Date(record.issueDate).toLocaleDateString("en-GB")}
										</td>
										<td className="py-2 pr-4">
											{record.expiryDate
												? new Date(record.expiryDate).toLocaleDateString("en-GB")
												: "N/A"}
										</td>
										<td className="py-2">
											<Badge className={DBS_STATUS_COLORS[record.status] ?? ""}>
												{DBS_STATUS_LABELS[record.status] ?? record.status}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function HistoryTab({ schoolId }: { schoolId: string }) {
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [nameSearch, setNameSearch] = useState("");
	const [purposeFilter, setPurposeFilter] = useState<string>("");
	const [cursor, setCursor] = useState<string | undefined>(undefined);

	const { data, isLoading } = trpc.visitor.getVisitorHistory.useQuery({
		schoolId,
		startDate: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
		endDate: endDate ? new Date(`${endDate}T23:59:59`) : undefined,
		name: nameSearch || undefined,
		purpose: (purposeFilter as (typeof PURPOSES)[number]) || undefined,
		cursor,
	});

	const exportCsv = () => {
		if (!data?.logs?.length) return;
		const headers = ["Date", "Visitor", "Purpose", "Sign In", "Sign Out", "Duration"];
		const rows = data.logs.map((log) => [
			new Date(log.signInAt).toLocaleDateString("en-GB"),
			log.visitor.name,
			PURPOSE_LABELS[log.purpose] ?? log.purpose,
			formatTime(log.signInAt),
			log.signOutAt ? formatTime(log.signOutAt) : "Still on site",
			log.signOutAt ? formatDuration(log.signInAt, log.signOutAt) : "-",
		]);

		const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `visitor-history-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span className="flex items-center gap-2">
						<ClipboardList className="h-5 w-5" />
						Visitor History
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={exportCsv}
						disabled={!data?.logs?.length}
						className="flex items-center gap-1.5"
					>
						<Download className="h-3.5 w-3.5" />
						Export CSV
					</Button>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Filters */}
				<div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
					<div>
						<label className="text-xs text-muted-foreground" htmlFor="history-start">
							From
						</label>
						<input
							id="history-start"
							type="date"
							value={startDate}
							onChange={(e) => {
								setStartDate(e.target.value);
								setCursor(undefined);
							}}
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						/>
					</div>
					<div>
						<label className="text-xs text-muted-foreground" htmlFor="history-end">
							To
						</label>
						<input
							id="history-end"
							type="date"
							value={endDate}
							onChange={(e) => {
								setEndDate(e.target.value);
								setCursor(undefined);
							}}
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						/>
					</div>
					<div>
						<label className="text-xs text-muted-foreground" htmlFor="history-name">
							Name
						</label>
						<input
							id="history-name"
							type="text"
							value={nameSearch}
							onChange={(e) => {
								setNameSearch(e.target.value);
								setCursor(undefined);
							}}
							placeholder="Search by name..."
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						/>
					</div>
					<div>
						<label className="text-xs text-muted-foreground" htmlFor="history-purpose">
							Purpose
						</label>
						<select
							id="history-purpose"
							value={purposeFilter}
							onChange={(e) => {
								setPurposeFilter(e.target.value);
								setCursor(undefined);
							}}
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						>
							<option value="">All Purposes</option>
							{PURPOSES.map((p) => (
								<option key={p} value={p}>
									{PURPOSE_LABELS[p]}
								</option>
							))}
						</select>
					</div>
				</div>

				{isLoading ? (
					<Skeleton className="h-48 w-full" />
				) : !data?.logs?.length ? (
					<p className="text-sm text-muted-foreground">No visitor history found.</p>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left">
										<th className="pb-2 pr-4 font-medium">Date</th>
										<th className="pb-2 pr-4 font-medium">Visitor</th>
										<th className="pb-2 pr-4 font-medium">Purpose</th>
										<th className="pb-2 pr-4 font-medium">Sign In</th>
										<th className="pb-2 pr-4 font-medium">Sign Out</th>
										<th className="pb-2 font-medium">Duration</th>
									</tr>
								</thead>
								<tbody>
									{data.logs.map((log) => (
										<tr key={log.id} className="border-b">
											<td className="py-2 pr-4">
												{new Date(log.signInAt).toLocaleDateString("en-GB")}
											</td>
											<td className="py-2 pr-4">{log.visitor.name}</td>
											<td className="py-2 pr-4">{PURPOSE_LABELS[log.purpose] ?? log.purpose}</td>
											<td className="py-2 pr-4">{formatTime(log.signInAt)}</td>
											<td className="py-2 pr-4">
												{log.signOutAt ? (
													formatTime(log.signOutAt)
												) : (
													<Badge className="bg-green-100 text-green-800">On site</Badge>
												)}
											</td>
											<td className="py-2">
												{log.signOutAt
													? formatDuration(log.signInAt, log.signOutAt)
													: formatDuration(log.signInAt)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<div className="mt-4 flex gap-2">
							{cursor && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setCursor(undefined)}
								>
									First Page
								</Button>
							)}
							{data.nextCursor && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setCursor(data.nextCursor)}
								>
									Next Page
								</Button>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

export default function VisitorsPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const [activeTab, setActiveTab] = useState<Tab>("signin");

	if (!features.visitorManagementEnabled) {
		return <FeatureDisabled featureName="Visitor Management" />;
	}

	const schoolId = session?.schoolId;

	if (!schoolId || !session?.staffRole) {
		return (
			<div className="p-6">
				<p className="text-muted-foreground">
					Visitor management is only available to staff members.
				</p>
			</div>
		);
	}

	const tabs: { key: Tab; label: string }[] = [
		{ key: "signin", label: "Sign In" },
		{ key: "onsite", label: "On Site" },
		{ key: "dbs", label: "DBS Register" },
		{ key: "history", label: "History" },
	];

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={BadgeCheck}
					title="Visitors"
					description="Manage visitor sign-in, DBS checks, and history"
				/>

				{/* Tabs */}
				<div className="flex gap-2 border-b pb-2">
					{tabs.map((tab) => (
						<Button
							key={tab.key}
							type="button"
							variant={activeTab === tab.key ? "default" : "outline"}
							size="sm"
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</Button>
					))}
				</div>

				{activeTab === "signin" && <SignInTab schoolId={schoolId} />}
				{activeTab === "onsite" && <OnSiteTab schoolId={schoolId} />}
				{activeTab === "dbs" && <DbsRegisterTab schoolId={schoolId} />}
				{activeTab === "history" && <HistoryTab schoolId={schoolId} />}
			</div>
		</PageShell>
	);
}
