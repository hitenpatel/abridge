import type { MisAdapter, MisAttendanceRecord, MisStudentRecord, MisSyncResult } from "./types";

const VALID_SESSIONS = ["AM", "PM"] as const;
const VALID_MARKS = [
	"PRESENT",
	"ABSENT_AUTHORISED",
	"ABSENT_UNAUTHORISED",
	"LATE",
	"NOT_REQUIRED",
] as const;

function parseCsv(data: string | Buffer): { headers: string[]; rows: string[][] } {
	const text = typeof data === "string" ? data : data.toString("utf-8");
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return { headers: [], rows: [] };
	}

	const headerLine = lines[0];
	if (!headerLine) return { headers: [], rows: [] };
	const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
	const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));

	return { headers, rows };
}

function parseDate(value: string): Date | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

export class CsvAdapter implements MisAdapter {
	async syncStudents(data: string | Buffer): Promise<MisSyncResult<MisStudentRecord>> {
		const { headers, rows } = parseCsv(data);
		const records: MisStudentRecord[] = [];
		const errors: MisSyncResult<MisStudentRecord>["errors"] = [];

		const firstNameIdx = headers.indexOf("first_name");
		const lastNameIdx = headers.indexOf("last_name");
		const dobIdx = headers.indexOf("date_of_birth");
		const yearGroupIdx = headers.indexOf("year_group");
		const classNameIdx = headers.indexOf("class_name");

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			if (!row) continue;
			const rowNum = i + 2; // 1-indexed, skip header

			const firstName = firstNameIdx >= 0 ? row[firstNameIdx] : undefined;
			const lastName = lastNameIdx >= 0 ? row[lastNameIdx] : undefined;
			const dobStr = dobIdx >= 0 ? row[dobIdx] : undefined;
			const yearGroup = yearGroupIdx >= 0 ? row[yearGroupIdx] : undefined;
			const className = classNameIdx >= 0 ? row[classNameIdx] : undefined;

			let hasError = false;

			if (!firstName) {
				errors.push({ row: rowNum, field: "first_name", message: "First name is required" });
				hasError = true;
			}
			if (!lastName) {
				errors.push({ row: rowNum, field: "last_name", message: "Last name is required" });
				hasError = true;
			}
			if (!dobStr) {
				errors.push({
					row: rowNum,
					field: "date_of_birth",
					message: "Date of birth is required",
				});
				hasError = true;
			}
			if (!yearGroup) {
				errors.push({ row: rowNum, field: "year_group", message: "Year group is required" });
				hasError = true;
			}

			if (hasError) continue;

			const dob = parseDate(dobStr as string);
			if (!dob) {
				errors.push({
					row: rowNum,
					field: "date_of_birth",
					message: "Invalid date format",
				});
				continue;
			}

			records.push({
				firstName: firstName as string,
				lastName: lastName as string,
				dateOfBirth: dob,
				yearGroup: yearGroup as string,
				className: className || undefined,
			});
		}

		return { records, errors };
	}

	async syncAttendance(data: string | Buffer): Promise<MisSyncResult<MisAttendanceRecord>> {
		const { headers, rows } = parseCsv(data);
		const records: MisAttendanceRecord[] = [];
		const errors: MisSyncResult<MisAttendanceRecord>["errors"] = [];

		const firstNameIdx = headers.indexOf("first_name");
		const lastNameIdx = headers.indexOf("last_name");
		const dobIdx = headers.indexOf("date_of_birth");
		const dateIdx = headers.indexOf("date");
		const sessionIdx = headers.indexOf("session");
		const markIdx = headers.indexOf("mark");

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			if (!row) continue;
			const rowNum = i + 2;

			const firstName = firstNameIdx >= 0 ? row[firstNameIdx] : undefined;
			const lastName = lastNameIdx >= 0 ? row[lastNameIdx] : undefined;
			const dobStr = dobIdx >= 0 ? row[dobIdx] : undefined;
			const dateStr = dateIdx >= 0 ? row[dateIdx] : undefined;
			const session = sessionIdx >= 0 ? row[sessionIdx] : undefined;
			const mark = markIdx >= 0 ? row[markIdx] : undefined;

			let hasError = false;

			if (!firstName) {
				errors.push({ row: rowNum, field: "first_name", message: "First name is required" });
				hasError = true;
			}
			if (!lastName) {
				errors.push({ row: rowNum, field: "last_name", message: "Last name is required" });
				hasError = true;
			}
			if (!dobStr) {
				errors.push({
					row: rowNum,
					field: "date_of_birth",
					message: "Date of birth is required",
				});
				hasError = true;
			}
			if (!dateStr) {
				errors.push({ row: rowNum, field: "date", message: "Date is required" });
				hasError = true;
			}
			if (!session) {
				errors.push({ row: rowNum, field: "session", message: "Session is required" });
				hasError = true;
			} else if (!VALID_SESSIONS.includes(session as (typeof VALID_SESSIONS)[number])) {
				errors.push({
					row: rowNum,
					field: "session",
					message: "Invalid session: must be AM or PM",
				});
				hasError = true;
			}
			if (!mark) {
				errors.push({ row: rowNum, field: "mark", message: "Mark is required" });
				hasError = true;
			} else if (!VALID_MARKS.includes(mark as (typeof VALID_MARKS)[number])) {
				errors.push({
					row: rowNum,
					field: "mark",
					message: `Invalid mark: must be one of ${VALID_MARKS.join(", ")}`,
				});
				hasError = true;
			}

			if (hasError) continue;

			const dob = parseDate(dobStr as string);
			if (!dob) {
				errors.push({
					row: rowNum,
					field: "date_of_birth",
					message: "Invalid date format",
				});
				continue;
			}

			const date = parseDate(dateStr as string);
			if (!date) {
				errors.push({ row: rowNum, field: "date", message: "Invalid date format" });
				continue;
			}

			records.push({
				studentFirstName: firstName as string,
				studentLastName: lastName as string,
				studentDob: dob,
				date,
				session: session as "AM" | "PM",
				mark: mark as MisAttendanceRecord["mark"],
			});
		}

		return { records, errors };
	}

	async testConnection(): Promise<boolean> {
		return true;
	}
}
