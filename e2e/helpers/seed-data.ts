/**
 * Helper functions to seed test data via direct database access
 * Used by E2E tests that need realistic data scenarios
 */

import { PrismaClient } from "@schoolconnect/db";
import { elasticsearchClient } from "../../apps/api/src/lib/elasticsearch";
import { indexEvent, indexMessage, indexPaymentItem } from "../../apps/api/src/lib/search-indexer";

const prisma = new PrismaClient();

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
			] as any,
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
		await indexMessage({
			id: message.id,
			schoolId: message.schoolId,
			subject: message.subject,
			body: message.body,
			category: message.category,
			createdAt: message.createdAt,
		});
		await elasticsearchClient.indices.refresh({ index: "messages" });
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

	return {
		id: event.id,
		title: event.title,
	};
}

export { prisma };
