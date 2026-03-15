export interface MisSyncResult<T> {
	records: T[];
	errors: Array<{ row: number; field: string; message: string }>;
}

export interface MisStudentRecord {
	firstName: string;
	lastName: string;
	dateOfBirth: Date;
	yearGroup: string;
	className?: string;
}

export interface MisAttendanceRecord {
	studentFirstName: string;
	studentLastName: string;
	studentDob: Date;
	date: Date;
	session: "AM" | "PM";
	mark: "PRESENT" | "ABSENT_AUTHORISED" | "ABSENT_UNAUTHORISED" | "LATE" | "NOT_REQUIRED";
}

export interface MisAdapter {
	syncStudents(data: string | Buffer): Promise<MisSyncResult<MisStudentRecord>>;
	syncAttendance(data: string | Buffer): Promise<MisSyncResult<MisAttendanceRecord>>;
	testConnection(): Promise<boolean>;
}
