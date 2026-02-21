import { db } from "@schoolconnect/db";
import { hashPassword } from "better-auth/crypto";
import { TEST_CREDENTIALS } from "./constants.js";

export type FixtureName =
	| "parent-with-school"
	| "staff-with-school"
	| "staff-with-messages"
	| "parent-with-payments"
	| "parent-with-posts"
	| "staff-with-posts"
	| "both-roles"
	| "clean-db"
	| "pending-invitation"
	| "expired-invitation"
	| "parent-with-multiple-children"
	| "parent-with-reacted-post"
	| "parent-with-action-items"
	| "parent-with-many-posts"
	| "parent-no-children"
	| "parent-with-categorized-messages"
	| "parent-with-many-messages"
	| "parent-with-payment-history"
	| "parent-with-pending-forms"
	| "parent-with-signature-form"
	| "parent-with-calendar-events"
	| "parent-with-disabled-attendance"
	| "parent-with-disabled-features"
	| "admin-with-multiple-staff"
	| "admin-with-analytics-data"
	| "staff-with-disabled-features"
	| "teacher-staff"
	| "staff-with-children";

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
		case "both-roles":
			throw new Error("both-roles fixture not yet implemented");
		case "clean-db":
			return {};
		case "pending-invitation":
			return await createPendingInvitation();
		case "expired-invitation":
			return await createExpiredInvitation();
		case "parent-with-multiple-children":
			return await createParentWithMultipleChildren();
		case "parent-with-reacted-post":
			return await createParentWithReactedPost();
		case "parent-with-action-items":
			return await createParentWithActionItems();
		case "parent-with-many-posts":
			return await createParentWithManyPosts();
		case "parent-no-children":
			return await createParentNoChildren();
		case "parent-with-categorized-messages":
			return await createParentWithCategorizedMessages();
		case "parent-with-many-messages":
			return await createParentWithManyMessages();
		case "parent-with-payment-history":
			return await createParentWithPaymentHistory();
		case "parent-with-pending-forms":
			return await createParentWithPendingForms();
		case "parent-with-signature-form":
			return await createParentWithSignatureForm();
		case "parent-with-calendar-events":
			return await createParentWithCalendarEvents();
		case "parent-with-disabled-attendance":
			return await createParentWithDisabledAttendance();
		case "parent-with-disabled-features":
			return await createParentWithDisabledFeatures();
		case "admin-with-multiple-staff":
			return await createAdminWithMultipleStaff();
		case "admin-with-analytics-data":
			return await createAdminWithAnalyticsData();
		case "staff-with-disabled-features":
			return await createStaffWithDisabledFeatures();
		case "teacher-staff":
			return await createTeacherStaff();
		case "staff-with-children":
			return await createStaffWithChildren();
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

async function createPendingInvitation() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const invitation = await db.invitation.create({
		data: {
			email: "newstaff@test.com",
			schoolId: school.id,
			role: "TEACHER",
			token: "test-invitation-token",
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});

	return { school, invitation };
}

async function createExpiredInvitation() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const invitation = await db.invitation.create({
		data: {
			email: "expired@test.com",
			schoolId: school.id,
			role: "TEACHER",
			token: "expired-token",
			expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
		},
	});

	return { school, invitation };
}

async function createParentWithMultipleChildren() {
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

	const child1 = await db.child.create({
		data: {
			firstName: "Child",
			lastName: "One",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: school.id,
		},
	});

	const child2 = await db.child.create({
		data: {
			firstName: "Child",
			lastName: "Two",
			dateOfBirth: new Date("2017-06-15"),
			yearGroup: "3",
			className: "3B",
			schoolId: school.id,
		},
	});

	await db.parentChild.createMany({
		data: [
			{ userId: user.id, childId: child1.id, relation: "PARENT" },
			{ userId: user.id, childId: child2.id, relation: "PARENT" },
		],
	});

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
		data: { userId: staffUser.id, schoolId: school.id, role: "ADMIN" },
	});

	await db.classPost.create({
		data: {
			schoolId: school.id,
			authorId: staffUser.id,
			body: "Child One post: Art class today!",
			yearGroup: "1",
			className: "1A",
			mediaUrls: [],
		},
	});

	await db.classPost.create({
		data: {
			schoolId: school.id,
			authorId: staffUser.id,
			body: "Child Two post: Science experiment!",
			yearGroup: "3",
			className: "3B",
			mediaUrls: [],
		},
	});

	return { school, user, child1, child2, staffUser };
}

async function createParentNoChildren() {
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

	return { user };
}

async function createParentWithReactedPost() {
	const base = await createParentWithPosts();

	await db.classPostReaction.create({
		data: {
			postId: base.posts[0].id,
			userId: base.user.id,
			emoji: "HEART",
		},
	});

	return base;
}

async function createParentWithActionItems() {
	const base = await createParentWithSchool();

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
		data: { userId: staffUser.id, schoolId: base.school.id, role: "ADMIN" },
	});

	await db.paymentItem.create({
		data: {
			schoolId: base.school.id,
			title: "School Trip",
			amount: 1500,
			category: "TRIP",
			children: { create: { childId: base.child.id } },
		},
	});

	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Permission Form",
			fields: [
				{ id: "1", type: "text", label: "Do you consent?", required: true },
			],
			isActive: true,
		},
	});

	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "Urgent Notice",
			body: "Please read this urgent message",
			category: "URGENT",
			authorId: staffUser.id,
			children: { create: { childId: base.child.id } },
		},
	});

	return { ...base, staffUser };
}

async function createParentWithManyPosts() {
	const base = await createParentWithSchool();

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
		data: { userId: staffUser.id, schoolId: base.school.id, role: "ADMIN" },
	});

	await Promise.all(
		Array.from({ length: 15 }, (_, i) =>
			db.classPost.create({
				data: {
					schoolId: base.school.id,
					authorId: staffUser.id,
					body: `Post ${i + 1}: Daily update`,
					yearGroup: "1",
					className: "1A",
					mediaUrls: [],
				},
			}),
		),
	);

	return { ...base, staffUser };
}

// --- Messaging fixtures ---

async function createParentWithCategorizedMessages() {
	const base = await createStaffWithMessages();

	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "Urgent Message",
			body: "This is an urgent notification",
			category: "URGENT",
			authorId: base.user.id,
			children: { create: { childId: base.child.id } },
		},
	});

	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "FYI Message",
			body: "This is just for your information",
			category: "FYI",
			authorId: base.user.id,
			children: { create: { childId: base.child.id } },
		},
	});

	return base;
}

async function createParentWithManyMessages() {
	const base = await createStaffWithMessages();

	await Promise.all(
		Array.from({ length: 15 }, (_, i) =>
			db.message.create({
				data: {
					schoolId: base.school.id,
					subject: `Test Message ${i + 6}`,
					body: `This is test message ${i + 6}`,
					category: "STANDARD",
					authorId: base.user.id,
					children: { create: { childId: base.child.id } },
				},
			}),
		),
	);

	return base;
}

// --- Payment, form, calendar, feature-toggle fixtures ---

async function createParentWithPaymentHistory() {
	const base = await createParentWithSchool();

	const paymentItem = await db.paymentItem.create({
		data: {
			schoolId: base.school.id,
			title: "School Expenses",
			amount: 1000,
			category: "TRIP",
			children: { create: { childId: base.child.id } },
		},
	});

	await db.payment.create({
		data: {
			userId: base.user.id,
			totalAmount: 1000,
			status: "COMPLETED",
			receiptNumber: "REC-001",
			completedAt: new Date(),
			lineItems: {
				create: {
					paymentItemId: paymentItem.id,
					childId: base.child.id,
					amount: 1000,
				},
			},
		},
	});

	return base;
}

async function createParentWithPendingForms() {
	const base = await createParentWithSchool();

	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Permission Form",
			description: "Please complete this form",
			fields: [
				{ id: "1", type: "text", label: "Do you consent?", required: true },
			],
			isActive: true,
		},
	});

	return base;
}

async function createParentWithSignatureForm() {
	const base = await createParentWithSchool();

	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Consent Form",
			description: "Requires signature",
			fields: [
				{ id: "1", type: "text", label: "Do you consent?", required: true },
				{
					id: "2",
					type: "signature",
					label: "Parent signature",
					required: true,
				},
			],
			isActive: true,
		},
	});

	return base;
}

async function createParentWithCalendarEvents() {
	const base = await createParentWithSchool();

	await db.event.createMany({
		data: [
			{
				schoolId: base.school.id,
				title: "Half Term",
				startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
				allDay: true,
				category: "TERM_DATE",
			},
			{
				schoolId: base.school.id,
				title: "Sports Day",
				body: "Annual sports day event",
				startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				allDay: true,
				category: "EVENT",
			},
			{
				schoolId: base.school.id,
				title: "Chess Club",
				startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				allDay: false,
				category: "CLUB",
			},
		],
	});

	return base;
}

async function createParentWithDisabledAttendance() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
			attendanceEnabled: false,
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
		data: { userId: user.id, childId: child.id, relation: "PARENT" },
	});

	return { school, user, child };
}

async function createParentWithDisabledFeatures() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
			messagingEnabled: false,
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
		data: { userId: user.id, childId: child.id, relation: "PARENT" },
	});

	return { school, user, child };
}

// --- Admin & staff fixtures ---

async function createAdminWithMultipleStaff() {
	const base = await createStaffWithSchool();

	const teacher = await db.user.create({
		data: {
			email: "teacher@test.com",
			name: "Test Teacher",
			emailVerified: true,
		},
	});
	await db.staffMember.create({
		data: { userId: teacher.id, schoolId: base.school.id, role: "TEACHER" },
	});

	const office = await db.user.create({
		data: {
			email: "office@test.com",
			name: "Test Office",
			emailVerified: true,
		},
	});
	await db.staffMember.create({
		data: { userId: office.id, schoolId: base.school.id, role: "OFFICE" },
	});

	return { ...base, teacher, office };
}

async function createTeacherStaff() {
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
			name: "Test Teacher",
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

	await db.staffMember.create({
		data: { userId: user.id, schoolId: school.id, role: "TEACHER" },
	});

	return { school, user };
}

async function createStaffWithChildren() {
	const base = await createStaffWithSchool();

	const children = await Promise.all(
		Array.from({ length: 3 }, (_, i) =>
			db.child.create({
				data: {
					firstName: "Student",
					lastName: `${i + 1}`,
					dateOfBirth: new Date("2015-01-01"),
					yearGroup: "1",
					className: "1A",
					schoolId: base.school.id,
				},
			}),
		),
	);

	return { ...base, children };
}

async function createStaffWithDisabledFeatures() {
	const school = await db.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
			messagingEnabled: false,
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
	await db.staffMember.create({
		data: { userId: user.id, schoolId: school.id, role: "ADMIN" },
	});

	return { school, user };
}

async function createAdminWithAnalyticsData() {
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

	const today = new Date();
	await db.attendanceRecord.createMany({
		data: [
			{
				childId: child.id,
				schoolId: base.school.id,
				date: today,
				session: "AM",
				mark: "PRESENT",
			},
			{
				childId: child.id,
				schoolId: base.school.id,
				date: today,
				session: "PM",
				mark: "LATE",
			},
		],
	});

	await db.paymentItem.create({
		data: {
			schoolId: base.school.id,
			title: "Trip Fee",
			amount: 2000,
			category: "TRIP",
			children: { create: { childId: child.id } },
		},
	});

	await db.formTemplate.create({
		data: {
			schoolId: base.school.id,
			title: "Analytics Form",
			fields: [{ id: "1", type: "text", label: "Field", required: true }],
			isActive: true,
		},
	});

	await db.message.create({
		data: {
			schoolId: base.school.id,
			subject: "Analytics Message",
			body: "Test message for analytics",
			category: "STANDARD",
			authorId: base.user.id,
			children: { create: { childId: child.id } },
		},
	});

	return { ...base, child };
}
