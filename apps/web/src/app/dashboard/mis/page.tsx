"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	AlertTriangle,
	CheckCircle2,
	CloudOff,
	Database,
	History,
	Link2,
	Upload,
	XCircle,
} from "lucide-react";
import { useRef, useState } from "react";

const PROVIDERS = [
	{ value: "SIMS", label: "SIMS" },
	{ value: "ARBOR", label: "Arbor" },
	{ value: "BROMCOM", label: "Bromcom" },
	{ value: "SCHOLARPACK", label: "ScholarPack" },
	{ value: "CSV_MANUAL", label: "CSV Manual" },
] as const;

type Provider = (typeof PROVIDERS)[number]["value"];

const SYNC_FREQUENCIES = [
	{ value: "HOURLY", label: "Every hour" },
	{ value: "TWICE_DAILY", label: "Twice daily" },
	{ value: "DAILY", label: "Once daily" },
	{ value: "MANUAL", label: "Manual only" },
] as const;

type SyncFrequency = (typeof SYNC_FREQUENCIES)[number]["value"];

const STATUS_COLORS: Record<string, string> = {
	SUCCESS: "bg-green-100 text-green-800",
	PARTIAL: "bg-amber-100 text-amber-800",
	FAILED: "bg-red-100 text-red-800",
};

const CONNECTION_STATUS_COLORS: Record<string, string> = {
	CONNECTED: "bg-green-100 text-green-800",
	DISCONNECTED: "bg-gray-100 text-gray-800",
	ERROR: "bg-red-100 text-red-800",
};

interface UploadResult {
	created: number;
	updated: number;
	skipped: number;
	errors: { row: number; message: string }[];
}

function ConnectionSetup({ schoolId }: { schoolId: string }) {
	const [provider, setProvider] = useState<Provider>("SIMS");
	const [apiUrl, setApiUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [apiSecret, setApiSecret] = useState("");
	const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("DAILY");
	const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

	const utils = trpc.useUtils();

	const setupConnectionMutation = trpc.mis.setupConnection.useMutation({
		onSuccess: () => {
			utils.mis.getConnectionStatus.invalidate({ schoolId });
		},
	});

	const [testPending, setTestPending] = useState(false);

	const isApiProvider = provider !== "CSV_MANUAL";

	const handleTestConnection = async () => {
		setTestResult(null);
		setTestPending(true);
		try {
			const result = await utils.mis.testConnection.fetch({ schoolId });
			setTestResult(result.success ? "success" : "error");
		} catch {
			setTestResult("error");
		} finally {
			setTestPending(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Link2 className="h-5 w-5" />
					Connection Setup
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div>
						<label className="text-sm font-medium" htmlFor="mis-provider">
							MIS Provider
						</label>
						<select
							id="mis-provider"
							value={provider}
							onChange={(e) => {
								setProvider(e.target.value as Provider);
								setTestResult(null);
							}}
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						>
							{PROVIDERS.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>

					{isApiProvider && (
						<>
							<div>
								<label className="text-sm font-medium" htmlFor="mis-api-url">
									API URL
								</label>
								<input
									id="mis-api-url"
									type="url"
									value={apiUrl}
									onChange={(e) => setApiUrl(e.target.value)}
									placeholder="https://your-school.sims.co.uk/api"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium" htmlFor="mis-api-key">
									API Key
								</label>
								<input
									id="mis-api-key"
									type="text"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									placeholder="Enter API key"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>
							<div>
								<label className="text-sm font-medium" htmlFor="mis-api-secret">
									API Secret
								</label>
								<input
									id="mis-api-secret"
									type="password"
									value={apiSecret}
									onChange={(e) => setApiSecret(e.target.value)}
									placeholder="Enter API secret"
									className="mt-1 block w-full rounded-md border p-2 text-sm"
								/>
							</div>

							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={handleTestConnection}
									disabled={testPending || !apiUrl || !apiKey}
									className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
								>
									{testPending ? "Testing..." : "Test Connection"}
								</button>
								{testResult === "success" && (
									<span className="flex items-center gap-1 text-sm text-green-600">
										<CheckCircle2 className="h-4 w-4" />
										Connection successful
									</span>
								)}
								{testResult === "error" && (
									<span className="flex items-center gap-1 text-sm text-red-600">
										<XCircle className="h-4 w-4" />
										Connection failed
									</span>
								)}
							</div>
						</>
					)}

					<div>
						<label className="text-sm font-medium" htmlFor="mis-sync-frequency">
							Sync Frequency
						</label>
						<select
							id="mis-sync-frequency"
							value={syncFrequency}
							onChange={(e) => setSyncFrequency(e.target.value as SyncFrequency)}
							className="mt-1 block w-full rounded-md border p-2 text-sm"
						>
							{SYNC_FREQUENCIES.map((f) => (
								<option key={f.value} value={f.value}>
									{f.label}
								</option>
							))}
						</select>
					</div>

					<button
						type="button"
						onClick={() => {
							setupConnectionMutation.mutate({
								schoolId,
								provider,
								apiUrl: isApiProvider ? apiUrl : undefined,
								credentials: isApiProvider ? `${apiKey}:${apiSecret}` : "manual",
								syncFrequency,
							});
						}}
						disabled={setupConnectionMutation.isPending || (isApiProvider && (!apiUrl || !apiKey))}
						className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{setupConnectionMutation.isPending ? "Saving..." : "Save"}
					</button>

					{setupConnectionMutation.isSuccess && (
						<p className="text-sm text-green-600">Connection saved successfully.</p>
					)}
					{setupConnectionMutation.isError && (
						<p className="text-sm text-red-600">
							Failed to save connection: {setupConnectionMutation.error.message}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function CsvUpload({ schoolId }: { schoolId: string }) {
	const studentFileRef = useRef<HTMLInputElement>(null);
	const attendanceFileRef = useRef<HTMLInputElement>(null);

	const [studentResult, setStudentResult] = useState<UploadResult | null>(null);
	const [attendanceResult, setAttendanceResult] = useState<UploadResult | null>(null);

	const uploadStudentsMutation = trpc.mis.uploadStudentsCsv.useMutation({
		onSuccess: (data) => setStudentResult(data as UploadResult),
	});

	const uploadAttendanceMutation = trpc.mis.uploadAttendanceCsv.useMutation({
		onSuccess: (data) => setAttendanceResult(data as UploadResult),
	});

	const readFileAsText = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
	};

	const handleStudentUpload = async () => {
		const file = studentFileRef.current?.files?.[0];
		if (!file) return;
		setStudentResult(null);
		const csvContent = await readFileAsText(file);
		uploadStudentsMutation.mutate({ schoolId, csvData: csvContent });
	};

	const handleAttendanceUpload = async () => {
		const file = attendanceFileRef.current?.files?.[0];
		if (!file) return;
		setAttendanceResult(null);
		const csvContent = await readFileAsText(file);
		uploadAttendanceMutation.mutate({ schoolId, csvData: csvContent });
	};

	const renderResult = (result: UploadResult) => (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-3 text-sm">
				<span className="text-green-600">{result.created} created</span>
				<span className="text-blue-600">{result.updated} updated</span>
				<span className="text-gray-500">{result.skipped} skipped</span>
				{result.errors.length > 0 && (
					<span className="text-red-600">{result.errors.length} errors</span>
				)}
			</div>
			{result.errors.length > 0 && (
				<div className="rounded-md border border-red-200 overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-red-50">
								<th className="px-3 py-1.5 text-left font-medium">Row</th>
								<th className="px-3 py-1.5 text-left font-medium">Error</th>
							</tr>
						</thead>
						<tbody>
							{result.errors.map((err) => (
								<tr key={err.row} className="border-t border-red-100">
									<td className="px-3 py-1.5">{err.row}</td>
									<td className="px-3 py-1.5 text-red-600">{err.message}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Upload className="h-5 w-5" />
					CSV Upload
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{/* Students CSV */}
					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium">Upload Students CSV</p>
							<p className="text-xs text-muted-foreground mt-1">
								Expected columns: first_name, last_name, date_of_birth, year_group, class_name
							</p>
						</div>
						<div className="flex items-center gap-3">
							<input
								ref={studentFileRef}
								type="file"
								accept=".csv"
								className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white hover:file:bg-gray-50"
							/>
							<button
								type="button"
								onClick={handleStudentUpload}
								disabled={uploadStudentsMutation.isPending}
								className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{uploadStudentsMutation.isPending ? "Uploading..." : "Upload"}
							</button>
						</div>
						{uploadStudentsMutation.isError && (
							<p className="text-sm text-red-600">
								Upload failed: {uploadStudentsMutation.error.message}
							</p>
						)}
						{studentResult && renderResult(studentResult)}
					</div>

					<hr />

					{/* Attendance CSV */}
					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium">Upload Attendance CSV</p>
							<p className="text-xs text-muted-foreground mt-1">
								Expected columns: first_name, last_name, date_of_birth, date, session, mark
							</p>
						</div>
						<div className="flex items-center gap-3">
							<input
								ref={attendanceFileRef}
								type="file"
								accept=".csv"
								className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white hover:file:bg-gray-50"
							/>
							<button
								type="button"
								onClick={handleAttendanceUpload}
								disabled={uploadAttendanceMutation.isPending}
								className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{uploadAttendanceMutation.isPending ? "Uploading..." : "Upload"}
							</button>
						</div>
						{uploadAttendanceMutation.isError && (
							<p className="text-sm text-red-600">
								Upload failed: {uploadAttendanceMutation.error.message}
							</p>
						)}
						{attendanceResult && renderResult(attendanceResult)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ConnectionStatus({ schoolId }: { schoolId: string }) {
	const { data: status, isLoading } = trpc.mis.getConnectionStatus.useQuery({ schoolId });
	const utils = trpc.useUtils();

	const disconnectMutation = trpc.mis.disconnect.useMutation({
		onSuccess: () => {
			utils.mis.getConnectionStatus.invalidate({ schoolId });
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Database className="h-5 w-5" />
					Connection Status
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-24 w-full" />
				) : !status ? (
					<p className="text-sm text-muted-foreground">No connection configured.</p>
				) : (
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<Badge
								className={CONNECTION_STATUS_COLORS[status.status] ?? "bg-gray-100 text-gray-800"}
							>
								{status.status === "CONNECTED" && <CheckCircle2 className="h-3 w-3 mr-1" />}
								{status.status === "DISCONNECTED" && <CloudOff className="h-3 w-3 mr-1" />}
								{status.status === "ERROR" && <AlertTriangle className="h-3 w-3 mr-1" />}
								{status.status}
							</Badge>
							{status.provider && (
								<span className="text-sm text-muted-foreground">
									Provider:{" "}
									{PROVIDERS.find((p) => p.value === status.provider)?.label ?? status.provider}
								</span>
							)}
						</div>

						{status.lastSyncAt && (
							<p className="text-sm text-muted-foreground">
								Last sync:{" "}
								{new Date(status.lastSyncAt).toLocaleString("en-GB", {
									day: "numeric",
									month: "short",
									year: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						)}

						{status.status === "CONNECTED" && (
							<button
								type="button"
								onClick={() => disconnectMutation.mutate({ schoolId })}
								disabled={disconnectMutation.isPending}
								className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
							>
								{disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function SyncHistory({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.mis.getSyncHistory.useQuery({
		schoolId,
		limit: 20,
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<History className="h-5 w-5" />
					Sync History
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-48 w-full" />
				) : !data?.length ? (
					<p className="text-sm text-muted-foreground">No sync history yet.</p>
				) : (
					<div className="space-y-3">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b">
										<th className="px-3 py-2 text-left font-medium">Type</th>
										<th className="px-3 py-2 text-left font-medium">Status</th>
										<th className="px-3 py-2 text-left font-medium">Processed</th>
										<th className="px-3 py-2 text-left font-medium">Created</th>
										<th className="px-3 py-2 text-left font-medium">Updated</th>
										<th className="px-3 py-2 text-left font-medium">Skipped</th>
										<th className="px-3 py-2 text-left font-medium">Duration</th>
										<th className="px-3 py-2 text-left font-medium">Timestamp</th>
									</tr>
								</thead>
								<tbody>
									{data.map((item) => (
										<tr key={item.id} className="border-b last:border-b-0">
											<td className="px-3 py-2">{item.syncType}</td>
											<td className="px-3 py-2">
												<Badge
													className={STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-800"}
												>
													{item.status}
												</Badge>
											</td>
											<td className="px-3 py-2">{item.recordsProcessed}</td>
											<td className="px-3 py-2">{item.recordsCreated}</td>
											<td className="px-3 py-2">{item.recordsUpdated}</td>
											<td className="px-3 py-2">{item.recordsSkipped}</td>
											<td className="px-3 py-2">
												{item.durationMs != null ? `${(item.durationMs / 1000).toFixed(1)}s` : "-"}
											</td>
											<td className="px-3 py-2 text-muted-foreground">
												{new Date(item.startedAt).toLocaleString("en-GB", {
													day: "numeric",
													month: "short",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default function MisPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isAdmin = session?.staffRole === "ADMIN" && !!session?.schoolId;

	if (!features.misIntegrationEnabled) {
		return <FeatureDisabled featureName="MIS Integration" />;
	}

	if (!isAdmin || !session?.schoolId) {
		return (
			<div className="flex flex-col items-center justify-center py-24 px-6 text-center">
				<h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Access Required</h2>
				<p className="text-gray-500 max-w-md">
					MIS Integration is only available to school administrators.
				</p>
			</div>
		);
	}

	const schoolId = session.schoolId;

	return (
		<PageShell maxWidth="4xl">
			<div className="space-y-6 p-6">
				<PageHeader
					icon={Database}
					title="MIS Integration"
					description="Connect your Management Information System to sync student and attendance data"
				/>

				<ConnectionStatus schoolId={schoolId} />
				<ConnectionSetup schoolId={schoolId} />
				<CsvUpload schoolId={schoolId} />
				<SyncHistory schoolId={schoolId} />
			</div>
		</PageShell>
	);
}
