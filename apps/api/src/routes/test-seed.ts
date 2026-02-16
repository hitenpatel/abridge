import { prisma } from "@schoolconnect/db";
import { hashPassword } from "better-auth/crypto";
import type { FastifyInstance } from "fastify";
import { auth } from "../lib/auth";

const TEST_CREDENTIALS = {
	parent: { email: "parent@test.com", password: "testpass123" },
	staff: { email: "staff@test.com", password: "testpass123" },
} as const;

type FixtureName =
	| "parent-with-school"
	| "staff-with-school"
	| "staff-with-messages"
	| "parent-with-payments"
	| "parent-with-posts"
	| "staff-with-posts";

async function cleanTestData() {
	await prisma.$executeRaw`TRUNCATE TABLE class_post_reactions CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE class_posts CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE notification_deliveries CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE form_responses CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE form_templates CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE events CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE payment_line_items CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE payments CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE payment_item_children CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE payment_items CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE attendance_records CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE message_reads CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE message_children CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE messages CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE parent_children CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE children CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE staff_members CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE invitations CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE verifications CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE sessions CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE accounts CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
	await prisma.$executeRaw`TRUNCATE TABLE schools CASCADE`;
}

async function createParentWithSchool() {
	const school = await prisma.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.parent.password);

	const user = await prisma.user.create({
		data: {
			email: TEST_CREDENTIALS.parent.email,
			name: "Test Parent",
			emailVerified: true,
		},
	});

	await prisma.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: hashedPassword,
		},
	});

	const child = await prisma.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: school.id,
		},
	});

	await prisma.parentChild.create({
		data: {
			userId: user.id,
			childId: child.id,
			relation: "PARENT",
		},
	});

	return { school, user, child };
}

async function createStaffWithSchool() {
	const school = await prisma.school.create({
		data: {
			name: "Test School",
			urn: "123456",
			address: "123 Test St",
			phone: "01234567890",
			email: "school@test.com",
		},
	});

	const hashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);

	const user = await prisma.user.create({
		data: {
			email: TEST_CREDENTIALS.staff.email,
			name: "Test Staff",
			emailVerified: true,
		},
	});

	await prisma.account.create({
		data: {
			userId: user.id,
			accountId: user.id,
			providerId: "credential",
			password: hashedPassword,
		},
	});

	const staffMember = await prisma.staffMember.create({
		data: {
			userId: user.id,
			schoolId: school.id,
			role: "ADMIN",
		},
	});

	return { school, user, staffMember };
}

async function createStaffWithMessages() {
	const base = await createStaffWithSchool();

	const child = await prisma.child.create({
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
	const parentUser = await prisma.user.create({
		data: {
			email: TEST_CREDENTIALS.parent.email,
			name: "Test Parent",
			emailVerified: true,
		},
	});
	await prisma.account.create({
		data: {
			userId: parentUser.id,
			accountId: parentUser.id,
			providerId: "credential",
			password: parentHashedPassword,
		},
	});
	await prisma.parentChild.create({
		data: {
			userId: parentUser.id,
			childId: child.id,
			relation: "PARENT",
		},
	});

	const messages = await Promise.all(
		Array.from({ length: 5 }, (_, i) =>
			prisma.message.create({
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

async function createParentWithPayments() {
	const base = await createParentWithSchool();

	const paymentItems = await Promise.all(
		Array.from({ length: 3 }, (_, i) =>
			prisma.paymentItem.create({
				data: {
					schoolId: base.school.id,
					title: `Payment Item ${i + 1}`,
					description: `Test payment item ${i + 1}`,
					amount: (i + 1) * 1000,
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

async function createParentWithPosts() {
	const base = await createParentWithSchool();

	const staffHashedPassword = await hashPassword(TEST_CREDENTIALS.staff.password);
	const staffUser = await prisma.user.create({
		data: {
			email: TEST_CREDENTIALS.staff.email,
			name: "Test Staff",
			emailVerified: true,
		},
	});
	await prisma.account.create({
		data: {
			userId: staffUser.id,
			accountId: staffUser.id,
			providerId: "credential",
			password: staffHashedPassword,
		},
	});
	await prisma.staffMember.create({
		data: {
			userId: staffUser.id,
			schoolId: base.school.id,
			role: "ADMIN",
		},
	});

	const posts = await Promise.all(
		Array.from({ length: 3 }, (_, i) =>
			prisma.classPost.create({
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

async function createStaffWithPosts() {
	const base = await createStaffWithSchool();

	const child = await prisma.child.create({
		data: {
			firstName: "Test",
			lastName: "Child",
			dateOfBirth: new Date("2015-01-01"),
			yearGroup: "1",
			className: "1A",
			schoolId: base.school.id,
		},
	});

	const posts = await Promise.all(
		Array.from({ length: 2 }, (_, i) =>
			prisma.classPost.create({
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

async function seedFixture(name: FixtureName) {
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

export async function testSeedRoutes(server: FastifyInstance) {
	server.post("/api/test/seed", async (req, res) => {
		const { fixture } = req.body as { fixture: FixtureName };

		if (!fixture) {
			return res.status(400).send({ error: "Missing fixture name" });
		}

		try {
			const result = await seedFixture(fixture);
			return res.status(200).send({ ok: true, fixture });
		} catch (error) {
			server.log.error(error);
			return res.status(500).send({
				error: error instanceof Error ? error.message : "Seed failed",
			});
		}
	});

	server.post("/api/test/login", async (req, res) => {
		const { email, password } = req.body as { email: string; password: string };

		if (!email || !password) {
			return res.status(400).send({ error: "Missing email or password" });
		}

		try {
			const response = await auth.api.signInEmail({
				body: { email, password },
			});

			// Extract session token from the response
			const sessionToken = response.token;
			return res.status(200).send({ ok: true, sessionToken });
		} catch (error) {
			server.log.error(error);
			return res.status(500).send({
				error: error instanceof Error ? error.message : "Login failed",
			});
		}
	});

	server.post("/api/test/clean", async (_req, res) => {
		try {
			await cleanTestData();
			return res.status(200).send({ ok: true });
		} catch (error) {
			server.log.error(error);
			return res.status(500).send({
				error: error instanceof Error ? error.message : "Clean failed",
			});
		}
	});
}
