import { prisma } from "@schoolconnect/db";
import type { FastifyInstance } from "fastify";
import { hashPassword } from "better-auth/crypto";

const TEST_CREDENTIALS = {
	parent: { email: "parent@test.com", password: "testpass123" },
	staff: { email: "staff@test.com", password: "testpass123" },
} as const;

type FixtureName = "parent-with-school" | "staff-with-school" | "staff-with-messages" | "parent-with-payments";

async function cleanTestData() {
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
