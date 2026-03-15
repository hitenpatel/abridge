import type { MisAdapter, MisAttendanceRecord, MisStudentRecord, MisSyncResult } from "./types";

const SIMS_ATTENDANCE_CODE_MAP: Record<string, MisAttendanceRecord["mark"]> = {
	"/": "PRESENT",
	"\\": "PRESENT",
	L: "LATE",
	B: "PRESENT", // Educated off-site
	C: "ABSENT_AUTHORISED",
	D: "ABSENT_AUTHORISED", // Dual registration
	E: "ABSENT_AUTHORISED", // Excluded
	H: "ABSENT_AUTHORISED", // Holiday agreed
	I: "ABSENT_AUTHORISED", // Illness
	J: "ABSENT_AUTHORISED", // Interview
	M: "ABSENT_AUTHORISED", // Medical
	N: "ABSENT_UNAUTHORISED",
	O: "ABSENT_UNAUTHORISED",
	P: "PRESENT", // Approved sporting activity
	R: "ABSENT_AUTHORISED", // Religious observance
	S: "ABSENT_AUTHORISED", // Study leave
	T: "ABSENT_AUTHORISED", // Traveller absence
	U: "LATE", // Late after register closed
	V: "PRESENT", // Educational visit
	W: "PRESENT", // Work experience
	X: "NOT_REQUIRED",
	Y: "NOT_REQUIRED", // Enforced closure
	Z: "NOT_REQUIRED", // Pupil not on roll
	"#": "NOT_REQUIRED", // School closed
	G: "ABSENT_UNAUTHORISED", // Unauthorised holiday
};

export class SimsAdapter implements MisAdapter {
	private apiUrl: string;
	private credentials: string;

	constructor(apiUrl: string, credentials: string) {
		this.apiUrl = apiUrl;
		this.credentials = credentials;
	}

	private getAuthHeaders(): Record<string, string> {
		const encoded = Buffer.from(this.credentials).toString("base64");
		return {
			Authorization: `Basic ${encoded}`,
			"Content-Type": "application/json",
		};
	}

	async syncStudents(_data: string | Buffer): Promise<MisSyncResult<MisStudentRecord>> {
		const records: MisStudentRecord[] = [];
		const errors: MisSyncResult<MisStudentRecord>["errors"] = [];

		const response = await fetch(`${this.apiUrl}/students`, {
			headers: this.getAuthHeaders(),
		});

		if (!response.ok) {
			throw new Error(`SIMS API error: ${response.status} ${response.statusText}`);
		}

		const students = (await response.json()) as Array<Record<string, any>>;

		for (let i = 0; i < students.length; i++) {
			const s = students[i];
			if (!s) continue;
			const rowNum = i + 1;

			const firstName = s.forename as string | undefined;
			const lastName = s.surname as string | undefined;
			const dobStr = s.dob as string | undefined;
			const yearGroup = s.year as string | undefined;
			const className = s.reg_group as string | undefined;

			if (!firstName) {
				errors.push({
					row: rowNum,
					field: "forename",
					message: "Forename is required",
				});
				continue;
			}
			if (!lastName) {
				errors.push({
					row: rowNum,
					field: "surname",
					message: "Surname is required",
				});
				continue;
			}
			if (!dobStr) {
				errors.push({
					row: rowNum,
					field: "dob",
					message: "Date of birth is required",
				});
				continue;
			}
			if (!yearGroup) {
				errors.push({
					row: rowNum,
					field: "year",
					message: "Year group is required",
				});
				continue;
			}

			const dob = new Date(dobStr);
			if (Number.isNaN(dob.getTime())) {
				errors.push({
					row: rowNum,
					field: "dob",
					message: "Invalid date format",
				});
				continue;
			}

			records.push({
				firstName,
				lastName,
				dateOfBirth: dob,
				yearGroup,
				className: className || undefined,
			});
		}

		return { records, errors };
	}

	async syncAttendance(_data: string | Buffer): Promise<MisSyncResult<MisAttendanceRecord>> {
		const records: MisAttendanceRecord[] = [];
		const errors: MisSyncResult<MisAttendanceRecord>["errors"] = [];

		const response = await fetch(`${this.apiUrl}/attendance`, {
			headers: this.getAuthHeaders(),
		});

		if (!response.ok) {
			throw new Error(`SIMS API error: ${response.status} ${response.statusText}`);
		}

		const entries = (await response.json()) as Array<Record<string, any>>;

		for (let i = 0; i < entries.length; i++) {
			const e = entries[i];
			if (!e) continue;
			const rowNum = i + 1;

			const firstName = e.forename as string | undefined;
			const lastName = e.surname as string | undefined;
			const dobStr = e.dob as string | undefined;
			const dateStr = e.date as string | undefined;
			const session = e.session as string | undefined;
			const code = e.code as string | undefined;

			if (!firstName || !lastName || !dobStr || !dateStr || !session || !code) {
				errors.push({
					row: rowNum,
					field: "record",
					message: "Missing required fields",
				});
				continue;
			}

			const dob = new Date(dobStr);
			const date = new Date(dateStr);

			if (Number.isNaN(dob.getTime()) || Number.isNaN(date.getTime())) {
				errors.push({
					row: rowNum,
					field: "date",
					message: "Invalid date format",
				});
				continue;
			}

			const normalizedSession = session.toUpperCase();
			if (normalizedSession !== "AM" && normalizedSession !== "PM") {
				errors.push({
					row: rowNum,
					field: "session",
					message: "Invalid session: must be AM or PM",
				});
				continue;
			}

			const mark = SIMS_ATTENDANCE_CODE_MAP[code];
			if (!mark) {
				errors.push({
					row: rowNum,
					field: "code",
					message: `Unknown SIMS attendance code: ${code}`,
				});
				continue;
			}

			records.push({
				studentFirstName: firstName,
				studentLastName: lastName,
				studentDob: dob,
				date,
				session: normalizedSession as "AM" | "PM",
				mark,
			});
		}

		return { records, errors };
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.apiUrl}/ping`, {
				headers: this.getAuthHeaders(),
			});
			return response.status === 200;
		} catch {
			return false;
		}
	}
}
