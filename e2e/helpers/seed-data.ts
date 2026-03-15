/**
 * Helper functions to seed test data via direct database access
 * Used by E2E tests that need realistic data scenarios
 */

import { PrismaClient } from "@schoolconnect/db";

const prisma = new PrismaClient();

// Elasticsearch indexing helpers (optional — skip if module unavailable)
let elasticsearchClient: {
	indices: { refresh: (opts: { index: string }) => Promise<void> };
} | null = null;
let indexMessage: ((data: Record<string, unknown>) => Promise<void>) | null = null;
let indexPaymentItem: ((data: Record<string, unknown>) => Promise<void>) | null = null;
let indexEvent: ((data: Record<string, unknown>) => Promise<void>) | null = null;

try {
	const es = require("../../apps/api/src/lib/elasticsearch");
	const si = require("../../apps/api/src/lib/search-indexer");
	elasticsearchClient = es.elasticsearchClient;
	indexMessage = si.indexMessage;
	indexPaymentItem = si.indexPaymentItem;
	indexEvent = si.indexEvent;
} catch {
	// Elasticsearch not available — search indexing will be skipped
}

export interface TestChild {
	id: string;
	firstName: string;
	lastName: string;
	schoolId: string;
}

export interface TestUser {
	id: string;
	email: string;
	name: string;
}

/**
 * Create a child and link to a parent user
 */
export async function seedChildForParent(params: {
	userId: string;
	schoolId: string;
	firstName?: string;
	lastName?: string;
}): Promise<TestChild> {
	const firstName = params.firstName || "Test";
	const lastName = params.lastName || "Child";

	const child = await prisma.child.create({
		data: {
			firstName,
			lastName,
			dateOfBirth: new Date("2015-09-01"), // 8-9 years old (Year 4)
			yearGroup: "4",
			className: "4A",
			schoolId: params.schoolId,
			parentLinks: {
				create: {
					userId: params.userId,
					relation: "PARENT",
				},
			},
		},
	});

	return {
		id: child.id,
		firstName: child.firstName,
		lastName: child.lastName,
		schoolId: child.schoolId,
	};
}

/**
 * Seed attendance records for a child
 */
export async function seedAttendanceRecords(params: {
	childId: string;
	schoolId: string;
	daysBack?: number;
}): Promise<{ count: number }> {
	const daysBack = params.daysBack || 7;
	const records = [];

	for (let i = 0; i < daysBack; i++) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);

		// Skip weekends (simplified - doesn't account for holidays)
		const dayOfWeek = date.getDay();
		if (dayOfWeek === 0 || dayOfWeek === 6) continue;

		// Create AM and PM sessions
		records.push(
			{
				childId: params.childId,
				schoolId: params.schoolId,
				date,
				session: "AM" as const,
				mark: "PRESENT" as const,
			},
			{
				childId: params.childId,
				schoolId: params.schoolId,
				date,
				session: "PM" as const,
				mark: "PRESENT" as const,
			},
		);
	}

	await prisma.attendanceRecord.createMany({
		data: records,
		skipDuplicates: true,
	});

	return { count: records.length };
}

/**
 * Seed payment items for a school
 */
export async function seedPaymentItem(params: {
	schoolId: string;
	childId: string;
	title?: string;
	amount?: number;
	description?: string;
	dueDate?: Date;
}): Promise<{ id: string; title: string; amount: number }> {
	const title = params.title || "School Trip";
	const amount = params.amount || 2500; // £25.00 in pence
	const dueDate = params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

	const paymentItem = await prisma.paymentItem.create({
		data: {
			schoolId: params.schoolId,
			title,
			description: params.description || `Payment for ${title}`,
			amount,
			dueDate,
			category: "OTHER", // Default category
			children: {
				create: {
					childId: params.childId,
				},
			},
		},
	});

	// Index in Elasticsearch for search (optional - skip if ES unavailable)
	try {
		if (indexPaymentItem && elasticsearchClient) {
			await indexPaymentItem({
				id: paymentItem.id,
				schoolId: paymentItem.schoolId,
				title: paymentItem.title,
				description: paymentItem.description,
				category: paymentItem.category,
				amount: paymentItem.amount,
				dueDate: paymentItem.dueDate,
			});
			await elasticsearchClient.indices.refresh({ index: "payment_items" });
		}
	} catch (error) {
		console.warn("Could not index payment item in Elasticsearch:", (error as Error).message);
	}

	return {
		id: paymentItem.id,
		title: paymentItem.title,
		amount: paymentItem.amount,
	};
}

/**
 * Seed a form template for a school
 */
export async function seedFormTemplate(params: {
	schoolId: string;
	title?: string;
	description?: string;
}): Promise<{ id: string; title: string }> {
	const title = params.title || "Medical Consent Form";
	const description = params.description || "Please complete this medical information form";

	const formTemplate = await prisma.formTemplate.create({
		data: {
			schoolId: params.schoolId,
			title,
			description,
			isActive: true,
			fields: [
				{
					id: "allergies",
					type: "textarea",
					label: "Does your child have any allergies?",
					required: true,
				},
				{
					id: "medications",
					type: "text",
					label: "List any medications your child takes",
					required: false,
				},
				{
					id: "emergency_contact",
					type: "text",
					label: "Emergency contact number",
					required: true,
				},
				{
					id: "consent",
					type: "checkbox",
					label: "I consent to emergency medical treatment if required",
					required: true,
				},
			] as unknown as Record<string, unknown>[],
		},
	});

	return {
		id: formTemplate.id,
		title: formTemplate.title,
	};
}

/**
 * Get user ID by email
 */
export async function getUserByEmail(email: string): Promise<TestUser | null> {
	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true, email: true, name: true },
	});

	if (!user) return null;

	return {
		id: user.id,
		email: user.email,
		name: user.name || "",
	};
}

/**
 * Get school ID by URN
 */
export async function getSchoolByURN(urn: string): Promise<{ id: string; name: string } | null> {
	const school = await prisma.school.findUnique({
		where: { urn },
		select: { id: true, name: true },
	});

	return school;
}

/**
 * Clean up test data (use sparingly, only in isolated test scenarios)
 */
export async function cleanupTestData(params: { userId?: string; schoolId?: string }) {
	if (params.userId) {
		await prisma.parentChild.deleteMany({ where: { userId: params.userId } });
		await prisma.payment.deleteMany({ where: { userId: params.userId } });
		await prisma.formResponse.deleteMany({ where: { userId: params.userId } });
	}

	if (params.schoolId) {
		await prisma.child.deleteMany({ where: { schoolId: params.schoolId } });
		await prisma.paymentItem.deleteMany({ where: { schoolId: params.schoolId } });
		await prisma.formTemplate.deleteMany({ where: { schoolId: params.schoolId } });
		await prisma.attendanceRecord.deleteMany({ where: { schoolId: params.schoolId } });
	}
}

/**
 * Seed a message for a school
 */
export async function seedMessage(params: {
	schoolId: string;
	childId: string;
	subject?: string;
	body?: string;
	category?: "URGENT" | "STANDARD" | "FYI";
}): Promise<{ id: string; subject: string }> {
	const subject = params.subject || "Important School Update";
	const body = params.body || "This is an important message from the school";
	const category = params.category || "STANDARD";

	const message = await prisma.message.create({
		data: {
			schoolId: params.schoolId,
			subject,
			body,
			category,
			children: {
				create: {
					childId: params.childId,
				},
			},
		},
	});

	// Index in Elasticsearch for search (optional - skip if ES unavailable)
	try {
		if (indexMessage && elasticsearchClient) {
			await indexMessage({
				id: message.id,
				schoolId: message.schoolId,
				subject: message.subject,
				body: message.body,
				category: message.category,
				createdAt: message.createdAt,
			});
			await elasticsearchClient.indices.refresh({ index: "messages" });
		}
	} catch (error) {
		console.warn("Could not index message in Elasticsearch:", (error as Error).message);
	}

	return {
		id: message.id,
		subject: message.subject,
	};
}

/**
 * Seed a calendar event for a school
 */
export async function seedEvent(params: {
	schoolId: string;
	title?: string;
	body?: string;
	startDate?: Date;
	endDate?: Date;
	category?: "TERM_DATE" | "INSET_DAY" | "EVENT" | "DEADLINE" | "CLUB";
}): Promise<{ id: string; title: string }> {
	const title = params.title || "School Event";
	const body = params.body || "This is a school event";
	const startDate = params.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const endDate = params.endDate || new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
	const category = params.category || "EVENT";

	const event = await prisma.event.create({
		data: {
			schoolId: params.schoolId,
			title,
			body,
			startDate,
			endDate,
			category,
		},
	});

	// Index in Elasticsearch for search (optional - skip if ES unavailable)
	if (indexEvent && elasticsearchClient) {
		try {
			await indexEvent({
				id: event.id,
				schoolId: event.schoolId,
				title: event.title,
				body: event.body,
				category: event.category,
				startDate: event.startDate,
				endDate: event.endDate,
			});
			await elasticsearchClient.indices.refresh({ index: "events" });
		} catch (error) {
			console.warn("Could not index event in Elasticsearch:", (error as Error).message);
		}
	}

	return {
		id: event.id,
		title: event.title,
	};
}

/**
 * Seed wellbeing check-ins for a child
 */
export async function seedWellbeingCheckIns(params: {
	childId: string;
	schoolId: string;
	daysBack?: number;
	moods?: ("GREAT" | "GOOD" | "OK" | "LOW" | "STRUGGLING")[];
}): Promise<{ count: number }> {
	const daysBack = params.daysBack || 5;
	const defaultMoods: ("GREAT" | "GOOD" | "OK" | "LOW" | "STRUGGLING")[] = [
		"GOOD",
		"GREAT",
		"OK",
		"LOW",
		"GOOD",
	];
	const moods = params.moods || defaultMoods;
	let count = 0;

	for (let i = 0; i < daysBack; i++) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);

		const dayOfWeek = date.getDay();
		if (dayOfWeek === 0 || dayOfWeek === 6) continue;

		await prisma.wellbeingCheckIn.upsert({
			where: {
				childId_date: { childId: params.childId, date },
			},
			update: {},
			create: {
				childId: params.childId,
				schoolId: params.schoolId,
				mood: moods[i % moods.length],
				checkedInBy: "PARENT",
				date,
			},
		});
		count++;
	}

	return { count };
}

/**
 * Seed wellbeing check-ins that trigger a THREE_LOW_DAYS alert pattern
 */
export async function seedLowMoodPattern(params: {
	childId: string;
	schoolId: string;
}): Promise<{ count: number }> {
	return seedWellbeingCheckIns({
		...params,
		daysBack: 5,
		moods: ["LOW", "STRUGGLING", "LOW", "STRUGGLING", "LOW"],
	});
}

/**
 * Seed a wellbeing alert for a child
 */
export async function seedWellbeingAlert(params: {
	childId: string;
	schoolId: string;
	triggerRule?: "THREE_LOW_DAYS" | "FIVE_ABSENT_DAYS" | "MOOD_DROP" | "MANUAL";
	status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
}): Promise<{ id: string }> {
	const alert = await prisma.wellbeingAlert.create({
		data: {
			childId: params.childId,
			schoolId: params.schoolId,
			triggerRule: params.triggerRule || "THREE_LOW_DAYS",
			status: params.status || "OPEN",
		},
	});

	return { id: alert.id };
}

/**
 * Seed an emergency alert for a school
 */
export async function seedEmergencyAlert(params: {
	schoolId: string;
	initiatedBy: string;
	type?: "LOCKDOWN" | "EVACUATION" | "SHELTER_IN_PLACE" | "MEDICAL" | "OTHER";
	status?: "ACTIVE" | "ALL_CLEAR" | "CANCELLED";
	message?: string;
}): Promise<{ id: string; title: string }> {
	const type = params.type || "LOCKDOWN";
	const titles: Record<string, string> = {
		LOCKDOWN: "Lockdown in Effect",
		EVACUATION: "Evacuation in Progress",
		SHELTER_IN_PLACE: "Shelter in Place",
		MEDICAL: "Medical Emergency",
		OTHER: "Emergency Alert",
	};

	const alert = await prisma.emergencyAlert.create({
		data: {
			schoolId: params.schoolId,
			type,
			title: titles[type],
			message: params.message || null,
			status: params.status || "ACTIVE",
			initiatedBy: params.initiatedBy,
		},
	});

	return { id: alert.id, title: alert.title };
}

/**
 * Enable specific feature toggles for a school
 */
export async function enableSchoolFeature(params: {
	schoolId: string;
	features: Partial<{
		wellbeingEnabled: boolean;
		emergencyCommsEnabled: boolean;
		analyticsEnabled: boolean;
		mealBookingEnabled: boolean;
		reportCardsEnabled: boolean;
		communityHubEnabled: boolean;
		homeworkEnabled: boolean;
		readingDiaryEnabled: boolean;
		visitorManagementEnabled: boolean;
		misIntegrationEnabled: boolean;
		achievementsEnabled: boolean;
	}>;
}): Promise<void> {
	await prisma.school.update({
		where: { id: params.schoolId },
		data: params.features,
	});
}

/**
 * Seed a meal menu for a school
 */
export async function seedMealMenu(params: {
	schoolId: string;
	createdBy: string;
	weekStarting?: Date;
	published?: boolean;
}): Promise<{ id: string; weekStarting: Date }> {
	const monday =
		params.weekStarting ||
		(() => {
			const d = new Date();
			d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
			d.setHours(0, 0, 0, 0);
			return d;
		})();

	const menu = await prisma.mealMenu.create({
		data: {
			schoolId: params.schoolId,
			weekStarting: monday,
			publishedAt: (params.published ?? true) ? new Date() : undefined,
			createdBy: params.createdBy,
			options: {
				create: [
					{
						day: "MONDAY",
						category: "HOT_MAIN",
						name: "Fish Fingers & Chips",
						allergens: ["FISH", "GLUTEN"],
						priceInPence: 250,
						sortOrder: 1,
					},
					{
						day: "MONDAY",
						category: "VEGETARIAN",
						name: "Veggie Pasta",
						allergens: ["GLUTEN"],
						priceInPence: 250,
						sortOrder: 2,
					},
					{
						day: "TUESDAY",
						category: "HOT_MAIN",
						name: "Roast Chicken",
						allergens: [],
						priceInPence: 250,
						sortOrder: 1,
					},
					{
						day: "TUESDAY",
						category: "VEGETARIAN",
						name: "Pasta Bake",
						allergens: ["GLUTEN", "MILK"],
						priceInPence: 250,
						sortOrder: 2,
					},
				],
			},
		},
	});

	return { id: menu.id, weekStarting: monday };
}

/**
 * Seed a community post for a school
 */
export async function seedCommunityPost(params: {
	schoolId: string;
	authorId: string;
	type?: "DISCUSSION" | "EVENT" | "VOLUNTEER_REQUEST";
	title?: string;
	body?: string;
	tags?: string[];
	isPinned?: boolean;
}): Promise<{ id: string; title: string }> {
	const post = await prisma.communityPost.create({
		data: {
			schoolId: params.schoolId,
			authorId: params.authorId,
			type: params.type || "DISCUSSION",
			title: params.title || "Test Discussion Post",
			body: params.body || "This is a test community post for E2E testing.",
			tags: params.tags || [],
			isPinned: params.isPinned || false,
		},
	});
	return { id: post.id, title: post.title };
}

/**
 * Seed a volunteer post with slots
 */
export async function seedVolunteerPost(params: {
	schoolId: string;
	authorId: string;
	title?: string;
	spotsTotal?: number;
}): Promise<{ id: string; slotIds: string[] }> {
	const post = await prisma.communityPost.create({
		data: {
			schoolId: params.schoolId,
			authorId: params.authorId,
			type: "VOLUNTEER_REQUEST",
			title: params.title || "Volunteers Needed",
			body: "We need help setting up for the school fair.",
			tags: ["Help Needed"],
			volunteerSlots: {
				create: [
					{
						description: "Set up chairs",
						date: new Date(),
						startTime: "14:00",
						endTime: "15:00",
						spotsTotal: params.spotsTotal || 4,
					},
				],
			},
		},
		include: { volunteerSlots: true },
	});
	return { id: post.id, slotIds: post.volunteerSlots.map((s) => s.id) };
}

/**
 * Seed a report cycle with report card and grades
 */
export async function seedReportCycle(params: {
	schoolId: string;
	createdBy: string;
	name?: string;
	status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}): Promise<{ id: string; name: string }> {
	const name = params.name || "Autumn Term 2026";
	const cycle = await prisma.reportCycle.create({
		data: {
			schoolId: params.schoolId,
			name,
			type: "TERMLY",
			assessmentModel: "PRIMARY_DESCRIPTIVE",
			publishDate: new Date(),
			status: params.status || "PUBLISHED",
			createdBy: params.createdBy,
		},
	});
	return { id: cycle.id, name: cycle.name };
}

export async function seedReportCard(params: {
	cycleId: string;
	childId: string;
	schoolId: string;
	teacherId?: string;
	generalComment?: string;
}): Promise<{ id: string }> {
	const card = await prisma.reportCard.create({
		data: {
			cycleId: params.cycleId,
			childId: params.childId,
			schoolId: params.schoolId,
			generalComment: params.generalComment || "Good progress this term.",
			attendancePct: 95.5,
			subjectGrades: {
				create: [
					{
						subject: "Mathematics",
						sortOrder: 0,
						level: "EXPECTED",
						effort: "GOOD",
						comment: "Solid number work.",
					},
					{
						subject: "English",
						sortOrder: 1,
						level: "EXCEEDING",
						effort: "OUTSTANDING",
						comment: "Excellent reader.",
					},
					{
						subject: "Science",
						sortOrder: 2,
						level: "EXPECTED",
						effort: "GOOD",
						comment: "Enjoys experiments.",
					},
				],
			},
		},
	});
	return { id: card.id };
}

/**
 * Seed a homework assignment for a school
 */
export async function seedHomeworkAssignment(params: {
	schoolId: string;
	setBy: string;
	subject?: string;
	title?: string;
	yearGroup?: string;
	className?: string;
	dueDate?: Date;
	isReadingTask?: boolean;
}): Promise<{ id: string; title: string }> {
	const title = params.title || "Maths Worksheet Chapter 5";
	const dueDate = params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	const assignment = await prisma.homeworkAssignment.create({
		data: {
			schoolId: params.schoolId,
			setBy: params.setBy,
			subject: params.subject || "Mathematics",
			title,
			description: `Complete the ${title} assignment`,
			yearGroup: params.yearGroup || "4",
			className: params.className || "4A",
			setDate: new Date(),
			dueDate,
			isReadingTask: params.isReadingTask || false,
		},
	});

	return { id: assignment.id, title: assignment.title };
}

/**
 * Seed a homework completion record
 */
export async function seedHomeworkCompletion(params: {
	assignmentId: string;
	childId: string;
	status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
	grade?: string;
	feedback?: string;
	gradedBy?: string;
}): Promise<{ id: string }> {
	const completion = await prisma.homeworkCompletion.upsert({
		where: {
			assignmentId_childId: {
				assignmentId: params.assignmentId,
				childId: params.childId,
			},
		},
		update: {
			status: params.status || "NOT_STARTED",
			grade: params.grade,
			feedback: params.feedback,
			gradedBy: params.gradedBy,
		},
		create: {
			assignmentId: params.assignmentId,
			childId: params.childId,
			status: params.status || "NOT_STARTED",
			grade: params.grade,
			feedback: params.feedback,
			gradedBy: params.gradedBy,
		},
	});

	return { id: completion.id };
}

/**
 * Seed a reading diary for a child
 */
export async function seedReadingDiary(params: {
	childId: string;
	schoolId: string;
	currentBook?: string;
	readingLevel?: string;
}): Promise<{ id: string }> {
	const diary = await prisma.readingDiary.upsert({
		where: { childId: params.childId },
		update: {
			currentBook: params.currentBook,
			readingLevel: params.readingLevel,
		},
		create: {
			childId: params.childId,
			schoolId: params.schoolId,
			currentBook: params.currentBook || "Charlotte's Web",
			readingLevel: params.readingLevel || "Turquoise",
		},
	});

	return { id: diary.id };
}

/**
 * Seed reading entries for the last N weekdays
 */
export async function seedReadingEntries(params: {
	diaryId: string;
	daysBack?: number;
}): Promise<{ count: number }> {
	const daysBack = params.daysBack || 5;
	const entries = [];

	for (let i = 0; i < daysBack; i++) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		date.setHours(0, 0, 0, 0);

		const dayOfWeek = date.getDay();
		if (dayOfWeek === 0 || dayOfWeek === 6) continue;

		entries.push({
			diaryId: params.diaryId,
			date,
			bookTitle: "Charlotte's Web",
			minutesRead: 15 + Math.floor(Math.random() * 16), // 15-30 mins
			pagesOrChapter: `Chapter ${i + 1}`,
			readWith: "PARENT" as const,
			entryBy: "PARENT" as const,
			parentComment: "Read well today",
		});
	}

	await prisma.readingEntry.createMany({
		data: entries,
		skipDuplicates: true,
	});

	return { count: entries.length };
}

/**
 * Seed a visitor record for a school
 */
export async function seedVisitor(params: {
	schoolId: string;
	name?: string;
	organisation?: string;
	isRegular?: boolean;
}): Promise<{ id: string; name: string }> {
	const name = params.name || "John Smith";

	const visitor = await prisma.visitor.create({
		data: {
			schoolId: params.schoolId,
			name,
			organisation: params.organisation || null,
			isRegular: params.isRegular || false,
		},
	});

	return { id: visitor.id, name: visitor.name };
}

/**
 * Seed a visitor sign-in log entry
 */
export async function seedVisitorSignIn(params: {
	schoolId: string;
	visitorId: string;
	signedInBy: string;
	purpose?:
		| "MEETING"
		| "MAINTENANCE"
		| "DELIVERY"
		| "VOLUNTEERING"
		| "INSPECTION"
		| "PARENT_VISIT"
		| "CONTRACTOR"
		| "OTHER";
}): Promise<{ id: string }> {
	const log = await prisma.visitorLog.create({
		data: {
			schoolId: params.schoolId,
			visitorId: params.visitorId,
			signedInBy: params.signedInBy,
			purpose: params.purpose || "MEETING",
			signInAt: new Date(),
		},
	});

	return { id: log.id };
}

/**
 * Seed a MIS connection for CSV manual upload
 */
export async function seedMisConnection(params: {
	schoolId: string;
}): Promise<{ id: string }> {
	const connection = await prisma.misConnection.upsert({
		where: { schoolId: params.schoolId },
		update: {},
		create: {
			schoolId: params.schoolId,
			provider: "CSV_MANUAL",
			credentials: "manual",
			status: "CONNECTED",
			syncFrequency: "MANUAL",
		},
	});
	return { id: connection.id };
}

/**
 * Seed a calendar event with RSVP enabled
 */
export async function seedEventWithRsvp(params: {
	schoolId: string;
	title?: string;
	body?: string;
	startDate?: Date;
	rsvpRequired?: boolean;
	maxCapacity?: number;
}): Promise<{ id: string; title: string }> {
	const title = params.title || "RSVP Event";
	const startDate = params.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	const event = await prisma.event.create({
		data: {
			schoolId: params.schoolId,
			title,
			body: params.body || "An event requiring RSVP",
			startDate,
			allDay: true,
			category: "EVENT",
			rsvpRequired: params.rsvpRequired ?? true,
			maxCapacity: params.maxCapacity ?? null,
		},
	});

	return { id: event.id, title: event.title };
}

/**
 * Seed an achievement category for a school
 */
export async function seedAchievementCategory(params: {
	schoolId: string;
	name?: string;
	icon?: string;
	pointValue?: number;
	type?: "POINTS" | "BADGE";
}): Promise<{ id: string; name: string }> {
	const name = params.name || "Star of the Week";

	const category = await prisma.achievementCategory.create({
		data: {
			schoolId: params.schoolId,
			name,
			icon: params.icon || "⭐",
			pointValue: params.pointValue || 5,
			type: params.type || "POINTS",
		},
	});

	return { id: category.id, name: category.name };
}

/**
 * Seed an achievement award for a child
 */
export async function seedAchievement(params: {
	schoolId: string;
	childId: string;
	categoryId: string;
	awardedBy: string;
	reason?: string;
	points?: number;
}): Promise<{ id: string; points: number }> {
	const achievement = await prisma.achievement.create({
		data: {
			schoolId: params.schoolId,
			childId: params.childId,
			categoryId: params.categoryId,
			awardedBy: params.awardedBy,
			points: params.points || 5,
			reason: params.reason || "Great effort",
		},
	});

	return { id: achievement.id, points: achievement.points };
}

export { prisma };
