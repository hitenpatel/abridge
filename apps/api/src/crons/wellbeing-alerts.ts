import type { PrismaClient } from "@schoolconnect/db";
import { logger } from "../lib/logger";

const MOOD_VALUES: Record<string, number> = {
	GREAT: 5,
	GOOD: 4,
	OK: 3,
	LOW: 2,
	STRUGGLING: 1,
};

export async function processWellbeingAlerts(prisma: PrismaClient) {
	const schools = await prisma.school.findMany({
		where: { wellbeingEnabled: true },
		select: { id: true },
	});

	for (const school of schools) {
		await processSchoolAlerts(prisma, school.id);
	}
}

async function processSchoolAlerts(prisma: PrismaClient, schoolId: string) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const sevenDaysAgo = new Date(today);
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const recentCheckIns = await prisma.wellbeingCheckIn.findMany({
		where: {
			schoolId,
			date: { gte: sevenDaysAgo },
		},
		orderBy: { date: "desc" },
	});

	const byChild = new Map<string, typeof recentCheckIns>();
	for (const ci of recentCheckIns) {
		const existing = byChild.get(ci.childId) ?? [];
		existing.push(ci);
		byChild.set(ci.childId, existing);
	}

	for (const [childId, checkIns] of byChild) {
		const lowDays = checkIns.filter((ci) => ci.mood === "LOW" || ci.mood === "STRUGGLING").length;

		if (lowDays >= 3) {
			await createAlertIfNoCooldown(prisma, childId, schoolId, "THREE_LOW_DAYS", 7);
		}

		if (checkIns.length >= 2) {
			const avgMood =
				checkIns.reduce((sum, ci) => sum + (MOOD_VALUES[ci.mood] ?? 3), 0) / checkIns.length;
			const firstCheckIn = checkIns[0];
			if (firstCheckIn) {
				const latestMood = MOOD_VALUES[firstCheckIn.mood] ?? 3;
				if (avgMood - latestMood >= 2) {
					await createAlertIfNoCooldown(prisma, childId, schoolId, "MOOD_DROP", 7);
				}
			}
		}
	}

	const absences = await prisma.attendanceRecord.groupBy({
		by: ["childId"],
		where: {
			schoolId,
			date: { gte: thirtyDaysAgo },
			mark: { in: ["ABSENT_AUTHORISED", "ABSENT_UNAUTHORISED"] },
		},
		_count: { id: true },
		having: {
			id: { _count: { gte: 5 } },
		},
	});

	for (const absence of absences) {
		await createAlertIfNoCooldown(prisma, absence.childId, schoolId, "FIVE_ABSENT_DAYS", 14);
	}
}

async function createAlertIfNoCooldown(
	prisma: PrismaClient,
	childId: string,
	schoolId: string,
	triggerRule: "THREE_LOW_DAYS" | "FIVE_ABSENT_DAYS" | "MOOD_DROP",
	cooldownDays: number,
) {
	const cooldownDate = new Date();
	cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

	const recentAlert = await prisma.wellbeingAlert.findFirst({
		where: {
			childId,
			schoolId,
			triggerRule,
			createdAt: { gte: cooldownDate },
		},
	});

	if (recentAlert) return;

	await prisma.wellbeingAlert.create({
		data: {
			childId,
			schoolId,
			triggerRule,
		},
	});

	logger.info({ childId, schoolId, triggerRule }, "Wellbeing alert created");
}
