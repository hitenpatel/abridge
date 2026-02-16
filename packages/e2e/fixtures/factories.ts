import { db } from "@schoolconnect/db";
import { hashPassword } from "better-auth/crypto";
import { TEST_CREDENTIALS } from "./constants.js";

export type FixtureName =
	| "parent-with-school"
	| "staff-with-school"
	| "staff-with-messages"
	| "parent-with-payments"
	| "parent-with-posts"
	| "staff-with-posts";

export async function cleanTestData() {
	// Truncate in dependency order to avoid FK violations
	await db.$executeRaw`TRUNCATE TABLE class_post_reactions CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE class_posts CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE notification_deliveries CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE form_responses CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE form_templates CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE events CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE payment_line_items CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE payments CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE payment_item_children CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE payment_items CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE attendance_records CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE message_reads CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE message_children CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE messages CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE parent_children CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE children CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE staff_members CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE invitations CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE verifications CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE sessions CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE accounts CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE users CASCADE`;
	await db.$executeRaw`TRUNCATE TABLE schools CASCADE`;
}

export async function seedFixture(name: FixtureName) {
	await cleanTestData();

	switch (name) {
		case "parent-with-school":
			return await createParentWithSchool();
		case "staff-with-school":
			return await createStaffWithSchool();
		case "staff-with-messages":
			return await createStaffWithMessages();
		case "parent-with-payments":
			return await createParentWithPayments();
		case "parent-with-posts":
			return await createParentWithPosts();
		case "staff-with-posts":
			return await createStaffWithPosts();
		default:
			throw new Error(`Unknown fixture: ${name}`);
	}
}

export async function createParentWithSchool() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);

	const user = await db.user.create({
		data: {
			email: TEST_CREDENTIALS.parent.email,
			name: "Test Parent",
			emailVerified: true,
		},
	});

	await db.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: hashedPassword,
		},
	});

	const child = await db.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: school.id,
		},
	});

	await db.parentChild.create({
		data: {
			userId: user.id,
			childId: child.id,
			relation: "PARENT",
		},
	});

	return { school, user, child };
}

export async function createStaffWithSchool() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);

	const user = await db.user.create({
		data: {
			email: TEST_CREDENTIALS.staff.email,
			name: "Test Staff",
			emailVerified: true,
		},
	});

	await db.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: hashedPassword,
		},
	});

	const staffMember = await db.staffMember.create({
		data: {
			userId: user.id,
			schoolId: school.id,
			role: "ADMIN",
		},
	});

	return { school, user, staffMember };
}

export async function createStaffWithMessages() {
	const base = await createStaffWithSchool();

	const child = await db.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: base.school.id,
		},
	});

	// Create a parent user linked to the child so parent role can view messages
	const parentHashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);
	const parentUser = await db.user.create({
		data: {
			email: TEST_CREDENTIALS.parent.email,
			name: "Test Parent",
			emailVerified: true,
		},
	});
	await db.account.create({
		data: {
			userId: parentUser.id,
			accountId: parentUser.id,
			providerId: "credential",
			password: parentHashedPassword,
		},
	});
	await db.parentChild.create({
		data: {
			userId: parentUser.id,
			childId: child.id,
			relation: "PARENT",
		},
	});

	const messages = await Promise.all(
		Array.from({ length: 5 }, (_, i) =>
			db.message.create({
				data: {
					schoolId: base.school.id,
					subject: `Test Message ${i + 1}`,
					body: `This is test message ${i + 1}`,
					category: "STANDARD",
					authorId: base.user.id,
					children: {
						create: {
							childId: child.id,
						},
					},
				},
			}),
		),
	);

	return { ...base, parentUser, child, messages };
}

export async function createParentWithPayments() {
	const base = await createParentWithSchool();

	const paymentItems = await Promise.all(
		Array.from({ length: 3 }, (_, i) =>
			db.paymentItem.create({
				data: {
					schoolId: base.school.id,
					title: `Payment Item ${i + 1}`,
					description: `Test payment item ${i + 1}`,
					amount: (i + 1) * 1000, // £10, £20, £30
					category: "TRIP",
					dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
					children: {
						create: {
							childId: base.child.id,
						},
					},
				},
			}),
		),
	);

	return { ...base, paymentItems };
}

export async function createParentWithPosts() {
	const base = await createParentWithSchool();

	// Create a staff user to author posts
	const staffHashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const staffUser = await db.user.create({
		data: {
			email: TEST_CREDENTIALS.staff.email,
			name: "Test Staff",
			emailVerified: true,
		},
	});
	await db.account.create({
		data: {
			userId: staffUser.id,
			accountId: staffUser.id,
			providerId: "credential",
			password: staffHashedPassword,
		},
	});
	await db.staffMember.create({
		data: {
			userId: staffUser.id,
			schoolId: base.school.id,
			role: "ADMIN",
		},
	});

	// Create class posts for the child's class
	const posts = await Promise.all(
		Array.from({ length: 3 }, (_, i) =>
			db.classPost.create({
				data: {
					schoolId: base.school.id,
					authorId: staffUser.id,
					body: `Class update ${i + 1}: Today we did something fun!`,
					yearGroup: "1",
					className: "1A",
					mediaUrls: [],
				},
			}),
		),
	);

	return { ...base, staffUser, posts };
}

export async function createStaffWithPosts() {
	const base = await createStaffWithSchool();

	// Create a child so posts have a target class
	const child = await db.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: base.school.id,
		},
	});

	// Create some existing class posts
	const posts = await Promise.all(
		Array.from({ length: 2 }, (_, i) =>
			db.classPost.create({
				data: {
					schoolId: base.school.id,
					authorId: base.user.id,
					body: `Staff post ${i + 1}: Class activity report`,
					yearGroup: "1",
					className: "1A",
					mediaUrls: [],
				},
			}),
		),
	);

	return { ...base, child, posts };
}
