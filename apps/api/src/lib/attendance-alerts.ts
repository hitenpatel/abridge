import type { PrismaClient } from "@schoolconnect/db";
import { logger } from "./logger";

interface AlertData {
	childId: string;
	type: "CONSECUTIVE_ABSENCE" | "DECLINING_TREND" | "DAY_PATTERN" | "POST_HOLIDAY" | "BELOW_THRESHOLD";
	description: string;
	data: Record<string, unknown>;
}

/**
 * Detect attendance patterns for all children in a school.
 * Pure heuristic — no AI calls. Creates AttendanceAlert records.
 */
export async function detectPatterns(
	prisma: PrismaClient,
	schoolId: string,
): Promise<{ alertsCreated: number }> {
	const children = await prisma.child.findMany({
		where: { schoolId },
		select: { id: true, firstName: true, lastName: true },
	});

	const alerts: AlertData[] = [];

	for (const child of children) {
		const childAlerts = await detectChildPatterns(prisma, child.id, child.firstName, child.lastName);
		alerts.push(...childAlerts);
	}

	// Create alerts that don't already have an OPEN duplicate
	let created = 0;
	for (const alert of alerts) {
		const existing = await prisma.attendanceAlert.findFirst({
			where: {
				childId: alert.childId,
				schoolId,
				type: alert.type,
				status: { in: ["OPEN", "ACKNOWLEDGED"] },
			},
		});

		if (!existing) {
			await prisma.attendanceAlert.create({
				data: {
					childId: alert.childId,
					schoolId,
					type: alert.type,
					description: alert.description,
					data: alert.data,
				},
			});
			created++;
		}
	}

	logger.info({ schoolId, alertsCreated: created, totalDetected: alerts.length }, "Attendance pattern detection complete");
	return { alertsCreated: created };
}

async function detectChildPatterns(
	prisma: PrismaClient,
	childId: string,
	firstName: string,
	lastName: string,
): Promise<AlertData[]> {
	const alerts: AlertData[] = [];
	const now = new Date();

	// Fetch last 6 weeks of attendance records (AM session only to avoid double-counting)
	const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
	const records = await prisma.attendanceRecord.findMany({
		where: {
			childId,
			date: { gte: sixWeeksAgo },
			session: "AM",
		},
		orderBy: { date: "desc" },
	});

	if (records.length === 0) return alerts;

	// 1. Consecutive absences (3+)
	const consecutiveAlert = detectConsecutiveAbsences(childId, firstName, lastName, records);
	if (consecutiveAlert) alerts.push(consecutiveAlert);

	// 2. Declining trend over 4 weeks (>5% drop)
	const trendAlert = detectDecliningTrend(childId, firstName, lastName, records, now);
	if (trendAlert) alerts.push(trendAlert);

	// 3. Day pattern (3+ same-day absences in 6 weeks)
	const dayAlert = detectDayPattern(childId, firstName, lastName, records);
	if (dayAlert) alerts.push(dayAlert);

	// 4. Below 90% threshold
	const thresholdAlert = detectBelowThreshold(childId, firstName, lastName, records);
	if (thresholdAlert) alerts.push(thresholdAlert);

	return alerts;
}

function isUnauthorisedAbsence(mark: string): boolean {
	return mark === "ABSENT_UNAUTHORISED";
}

function isAnyAbsence(mark: string): boolean {
	return mark === "ABSENT_UNAUTHORISED" || mark === "ABSENT_AUTHORISED";
}

function detectConsecutiveAbsences(
	childId: string,
	firstName: string,
	lastName: string,
	records: Array<{ date: Date; mark: string }>,
): AlertData | null {
	// Sort by date descending (already sorted)
	let consecutive = 0;
	let maxConsecutive = 0;

	// Sort ascending for consecutive check
	const sorted = [...records].sort((a, b) => a.date.getTime() - b.date.getTime());

	for (let i = 0; i < sorted.length; i++) {
		if (isAnyAbsence(sorted[i]!.mark)) {
			consecutive++;
			maxConsecutive = Math.max(maxConsecutive, consecutive);
		} else {
			consecutive = 0;
		}
	}

	// Check if current streak is still ongoing (most recent records)
	let currentStreak = 0;
	for (let i = records.length - 1; i >= 0; i--) {
		// records is desc, so iterate from end (oldest) to start (newest)
	}
	// Use sorted (ascending) and check from end
	currentStreak = 0;
	for (let i = sorted.length - 1; i >= 0; i--) {
		if (isAnyAbsence(sorted[i]!.mark)) {
			currentStreak++;
		} else {
			break;
		}
	}

	if (currentStreak >= 3) {
		return {
			childId,
			type: "CONSECUTIVE_ABSENCE",
			description: `${firstName} ${lastName} has been absent for ${currentStreak} consecutive days.`,
			data: { consecutiveDays: currentStreak },
		};
	}

	return null;
}

function detectDecliningTrend(
	childId: string,
	firstName: string,
	lastName: string,
	records: Array<{ date: Date; mark: string }>,
	now: Date,
): AlertData | null {
	// Compare last 2 weeks vs previous 2 weeks
	const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
	const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

	const recentRecords = records.filter((r) => r.date >= twoWeeksAgo);
	const previousRecords = records.filter((r) => r.date >= fourWeeksAgo && r.date < twoWeeksAgo);

	if (recentRecords.length < 5 || previousRecords.length < 5) return null;

	const recentPresent = recentRecords.filter((r) => !isAnyAbsence(r.mark)).length;
	const recentPct = (recentPresent / recentRecords.length) * 100;

	const prevPresent = previousRecords.filter((r) => !isAnyAbsence(r.mark)).length;
	const prevPct = (prevPresent / previousRecords.length) * 100;

	const drop = prevPct - recentPct;

	if (drop > 5) {
		return {
			childId,
			type: "DECLINING_TREND",
			description: `${firstName} ${lastName}'s attendance has declined by ${Math.round(drop)}% over the last 4 weeks (${Math.round(prevPct)}% to ${Math.round(recentPct)}%).`,
			data: { previousPct: Math.round(prevPct), recentPct: Math.round(recentPct), dropPct: Math.round(drop) },
		};
	}

	return null;
}

function detectDayPattern(
	childId: string,
	firstName: string,
	lastName: string,
	records: Array<{ date: Date; mark: string }>,
): AlertData | null {
	// Count absences by day of week (0=Sunday, 1=Monday, ... 5=Friday)
	const dayAbsences: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	const dayNames: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

	for (const r of records) {
		const day = r.date.getDay();
		if (day >= 1 && day <= 5 && isAnyAbsence(r.mark)) {
			dayAbsences[day]!++;
		}
	}

	for (const [day, count] of Object.entries(dayAbsences)) {
		const dayNum = Number(day);
		if (count >= 3) {
			return {
				childId,
				type: "DAY_PATTERN",
				description: `${firstName} ${lastName} has been absent on ${dayNames[dayNum]} ${count} times in the last 6 weeks.`,
				data: { day: dayNames[dayNum], count },
			};
		}
	}

	return null;
}

function detectBelowThreshold(
	childId: string,
	firstName: string,
	lastName: string,
	records: Array<{ date: Date; mark: string }>,
): AlertData | null {
	if (records.length < 10) return null; // Need enough data

	const present = records.filter((r) => !isAnyAbsence(r.mark)).length;
	const pct = (present / records.length) * 100;

	if (pct < 90) {
		return {
			childId,
			type: "BELOW_THRESHOLD",
			description: `${firstName} ${lastName}'s attendance is ${Math.round(pct)}%, below the 90% threshold.`,
			data: { attendancePct: Math.round(pct), totalDays: records.length, daysPresent: present },
		};
	}

	return null;
}
