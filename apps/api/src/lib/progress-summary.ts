import Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@schoolconnect/db";
import { logger } from "./logger";

export interface ChildWeeklyMetrics {
	childName: string;
	weekStart: Date;
	attendance: {
		percentage: number;
		daysPresent: number;
		daysTotal: number;
		lateCount: number;
	};
	homework: {
		completed: number;
		total: number;
		overdue: number;
	};
	reading: {
		daysRead: number;
		totalMinutes: number;
		avgMinutes: number;
		currentStreak: number;
		currentBook: string | null;
	};
	achievements: {
		pointsEarned: number;
		awardsReceived: number;
		categories: string[];
	};
	wellbeing: {
		avgMood: string | null;
		checkInCount: number;
		trend: "improving" | "stable" | "declining" | null;
	};
}

const MOOD_ORDINAL: Record<string, number> = {
	GREAT: 5,
	GOOD: 4,
	OK: 3,
	LOW: 2,
	STRUGGLING: 1,
};

function avgMoodOrdinal(moods: string[]): number {
	if (moods.length === 0) return 0;
	const sum = moods.reduce((acc, m) => acc + (MOOD_ORDINAL[m] ?? 3), 0);
	return sum / moods.length;
}

function ordinalToMood(ordinal: number): string {
	if (ordinal >= 4.5) return "GREAT";
	if (ordinal >= 3.5) return "GOOD";
	if (ordinal >= 2.5) return "OK";
	if (ordinal >= 1.5) return "LOW";
	return "STRUGGLING";
}

export async function gatherChildMetrics(
	prisma: PrismaClient,
	childId: string,
	weekStart: Date,
	weekEnd: Date,
): Promise<ChildWeeklyMetrics> {
	// Get child info
	const child = await prisma.child.findUniqueOrThrow({
		where: { id: childId },
		select: { firstName: true, lastName: true, schoolId: true, yearGroup: true },
	});

	// 1. Attendance
	const attendanceRecords = await prisma.attendanceRecord.findMany({
		where: { childId, date: { gte: weekStart, lt: weekEnd } },
	});
	// Count unique days (AM/PM sessions)
	const dayMap = new Map<string, { present: boolean; late: boolean }>();
	for (const rec of attendanceRecords) {
		const dateKey = rec.date.toISOString().split("T")[0] ?? "";
		const existing = dayMap.get(dateKey) ?? { present: false, late: false };
		if (rec.mark === "PRESENT") {
			existing.present = true;
		}
		if (
			rec.mark === "LATE" ||
			(rec.mark === "PRESENT" && rec.note?.toLowerCase().includes("late"))
		) {
			existing.late = true;
		}
		dayMap.set(dateKey, existing);
	}
	const daysTotal = dayMap.size;
	const daysPresent = [...dayMap.values()].filter((d) => d.present).length;
	const lateCount = [...dayMap.values()].filter((d) => d.late).length;
	const attendancePercentage = daysTotal > 0 ? Math.round((daysPresent / daysTotal) * 100) : 0;

	// 2. Homework
	const homeworkAssignments = await prisma.homeworkAssignment.findMany({
		where: {
			schoolId: child.schoolId,
			...(child.yearGroup ? { yearGroup: child.yearGroup } : {}),
			dueDate: { gte: weekStart, lt: weekEnd },
		},
		select: { id: true, dueDate: true },
	});

	const homeworkCompletions = await prisma.homeworkCompletion.findMany({
		where: {
			childId,
			assignment: { dueDate: { gte: weekStart, lt: weekEnd } },
		},
		include: { assignment: true },
	});

	const completedCount = homeworkCompletions.filter(
		(c) => c.status === "COMPLETED",
	).length;
	const overdueCount = homeworkAssignments.filter((a) => {
		const completion = homeworkCompletions.find((c) => c.assignmentId === a.id);
		return !completion || completion.status !== "COMPLETED";
	}).length;

	// 3. Reading
	const readingDiary = await prisma.readingDiary.findUnique({
		where: { childId },
		select: { id: true, currentBook: true },
	});

	let readingMetrics = {
		daysRead: 0,
		totalMinutes: 0,
		avgMinutes: 0,
		currentStreak: 0,
		currentBook: null as string | null,
	};
	if (readingDiary) {
		const readingEntries = await prisma.readingEntry.findMany({
			where: { diaryId: readingDiary.id, date: { gte: weekStart, lt: weekEnd } },
			orderBy: { date: "asc" },
		});

		const uniqueDays = new Set(readingEntries.map((e) => e.date.toISOString().split("T")[0] ?? ""));
		const totalMinutes = readingEntries.reduce((sum, e) => sum + (e.minutesRead ?? 0), 0);

		// Calculate streak: consecutive days reading ending at weekEnd
		let streak = 0;
		const sortedDates = [...uniqueDays].sort().reverse();
		const dayMs = 86400000;
		let expectedDate = new Date(weekEnd.getTime() - dayMs);
		for (const dateStr of sortedDates) {
			const entryDate = new Date(dateStr);
			if (entryDate.toISOString().split("T")[0] === expectedDate.toISOString().split("T")[0]) {
				streak++;
				expectedDate = new Date(expectedDate.getTime() - dayMs);
			} else {
				break;
			}
		}

		readingMetrics = {
			daysRead: uniqueDays.size,
			totalMinutes,
			avgMinutes: uniqueDays.size > 0 ? Math.round(totalMinutes / uniqueDays.size) : 0,
			currentStreak: streak,
			currentBook: readingDiary.currentBook,
		};
	}

	// 4. Achievements
	const achievements = await prisma.achievement.findMany({
		where: { childId, createdAt: { gte: weekStart, lt: weekEnd } },
		include: { category: { select: { name: true } } },
	});
	const pointsEarned = achievements.reduce((sum, a) => sum + a.points, 0);
	const categories = [...new Set(achievements.map((a) => a.category.name))];

	// 5. Wellbeing
	const wellbeingCheckIns = await prisma.wellbeingCheckIn.findMany({
		where: { childId, date: { gte: weekStart, lt: weekEnd } },
	});

	let wellbeingMetrics: ChildWeeklyMetrics["wellbeing"] = {
		avgMood: null,
		checkInCount: 0,
		trend: null,
	};

	if (wellbeingCheckIns.length > 0) {
		const currentMoods = wellbeingCheckIns.map((c) => c.mood);
		const currentAvg = avgMoodOrdinal(currentMoods);

		// Compare with prior week for trend
		const priorWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
		const priorCheckIns = await prisma.wellbeingCheckIn.findMany({
			where: { childId, date: { gte: priorWeekStart, lt: weekStart } },
		});

		let trend: "improving" | "stable" | "declining" | null = null;
		if (priorCheckIns.length > 0) {
			const priorAvg = avgMoodOrdinal(priorCheckIns.map((c) => c.mood));
			const diff = currentAvg - priorAvg;
			if (diff > 0.5) trend = "improving";
			else if (diff < -0.5) trend = "declining";
			else trend = "stable";
		}

		wellbeingMetrics = {
			avgMood: ordinalToMood(currentAvg),
			checkInCount: wellbeingCheckIns.length,
			trend,
		};
	}

	return {
		childName: `${child.firstName} ${child.lastName}`,
		weekStart,
		attendance: {
			percentage: attendancePercentage,
			daysPresent,
			daysTotal,
			lateCount,
		},
		homework: {
			completed: completedCount,
			total: homeworkAssignments.length,
			overdue: overdueCount,
		},
		reading: readingMetrics,
		achievements: {
			pointsEarned,
			awardsReceived: achievements.length,
			categories,
		},
		wellbeing: wellbeingMetrics,
	};
}

export function renderTemplateSummary(metrics: ChildWeeklyMetrics): string {
	const lines: string[] = [];

	// Attendance line (always present)
	lines.push(
		`Attendance: ${metrics.attendance.percentage}% (${metrics.attendance.daysPresent}/${metrics.attendance.daysTotal} days${metrics.attendance.lateCount > 0 ? `, ${metrics.attendance.lateCount} late` : ""}).`,
	);

	// Homework line (if any assignments)
	if (metrics.homework.total > 0) {
		lines.push(
			`Homework: completed ${metrics.homework.completed} of ${metrics.homework.total} assignments${metrics.homework.overdue > 0 ? ` (${metrics.homework.overdue} overdue)` : ""}.`,
		);
	}

	// Reading line (if any entries)
	if (metrics.reading.daysRead > 0) {
		let readingLine = `Reading: read ${metrics.reading.daysRead} days this week (avg ${metrics.reading.avgMinutes} min/day`;
		if (metrics.reading.currentStreak > 0) {
			readingLine += `, ${metrics.reading.currentStreak}-day streak`;
		}
		readingLine += ").";
		if (metrics.reading.currentBook) {
			readingLine += ` Currently reading "${metrics.reading.currentBook}".`;
		}
		lines.push(readingLine);
	}

	// Achievements line (if any)
	if (metrics.achievements.awardsReceived > 0) {
		let achieveLine = `Achievements: earned ${metrics.achievements.pointsEarned} points`;
		if (metrics.achievements.categories.length > 0) {
			achieveLine += ` — ${metrics.achievements.categories.join(", ")}`;
		}
		achieveLine += ".";
		lines.push(achieveLine);
	}

	// Wellbeing line (if any check-ins)
	if (metrics.wellbeing.checkInCount > 0) {
		let wellbeingLine = `Wellbeing: mood average ${metrics.wellbeing.avgMood}`;
		if (metrics.wellbeing.trend) {
			wellbeingLine += `, ${metrics.wellbeing.trend} trend`;
		}
		wellbeingLine += ".";
		lines.push(wellbeingLine);
	}

	return lines.join("\n");
}

export async function generateInsight(metrics: ChildWeeklyMetrics): Promise<string | null> {
	if (process.env.AI_SUMMARY_PROVIDER !== "claude") return null;

	try {
		const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
		const metricsText = renderTemplateSummary(metrics);

		const response = await Promise.race([
			client.messages.create({
				model: "claude-haiku-4-5-20251001",
				max_tokens: 100,
				system:
					"You are a primary school teaching assistant writing a one-sentence weekly insight for a parent about their child's progress. Be warm, specific, and encouraging. Reference concrete data. Do not be generic. Maximum 150 characters.",
				messages: [{ role: "user", content: `Child: ${metrics.childName}\n\n${metricsText}` }],
			}),
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 5000)),
		]);

		const text = response.content[0]?.type === "text" ? response.content[0].text : null;
		return text;
	} catch (err) {
		logger.warn({ err }, "AI insight generation failed, falling back to template");
		return null;
	}
}

export async function generateWeeklySummary(
	prisma: PrismaClient,
	childId: string,
	weekStart: Date,
): Promise<{ id: string; summary: string }> {
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);

	const child = await prisma.child.findUniqueOrThrow({
		where: { id: childId },
		select: { schoolId: true },
	});
	const metrics = await gatherChildMetrics(prisma, childId, weekStart, weekEnd);
	const templateText = renderTemplateSummary(metrics);
	const insight = await generateInsight(metrics);
	const summary = insight ? `${templateText}\n\nInsight: ${insight}` : templateText;

	const result = await prisma.progressSummary.upsert({
		where: { childId_weekStart: { childId, weekStart } },
		update: { templateData: metrics as any, insight, summary },
		create: {
			childId,
			schoolId: child.schoolId,
			weekStart,
			templateData: metrics as any,
			insight,
			summary,
		},
	});

	return { id: result.id, summary: result.summary };
}
