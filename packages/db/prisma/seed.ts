import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	await prisma.$transaction(async (tx) => {
		// Delete in reverse dependency order to avoid FK constraint violations
		await tx.paymentLineItem.deleteMany();
		await tx.payment.deleteMany();
		await tx.paymentItemChild.deleteMany();
		await tx.paymentItem.deleteMany();
		await tx.attendanceRecord.deleteMany();
		await tx.messageRead.deleteMany();
		await tx.messageChild.deleteMany();
		await tx.message.deleteMany();
		await tx.parentChild.deleteMany();
		await tx.child.deleteMany();
		await tx.staffMember.deleteMany();
		// Keep users and schools - upsert handles them

		// Create a school
		const school = await tx.school.upsert({
			where: { urn: "123456" },
			update: {},
			create: {
				name: "Oakwood Primary School",
				urn: "123456",
				address: "123 Oak Lane, London, SE1 1AA",
				phone: "020 7123 4567",
				email: "office@oakwood.sch.uk",
			},
		});

		// Create a parent user
		const parent = await tx.user.upsert({
			where: { email: "sarah@example.com" },
			update: {},
			create: {
				email: "sarah@example.com",
				name: "Sarah Johnson",
				phone: "+447700900001",
			},
		});

		// Create an admin user
		const admin = await tx.user.upsert({
			where: { email: "claire@oakwood.sch.uk" },
			update: {},
			create: {
				email: "claire@oakwood.sch.uk",
				name: "Claire Thompson",
			},
		});

		// Link admin as staff
		await tx.staffMember.create({
			data: {
				userId: admin.id,
				schoolId: school.id,
				role: "ADMIN",
			},
		});

		// Create children
		const child1 = await tx.child.create({
			data: {
				firstName: "Emily",
				lastName: "Johnson",
				dateOfBirth: new Date("2019-03-15"),
				yearGroup: "Year 2",
				className: "2B",
				schoolId: school.id,
			},
		});

		const child2 = await tx.child.create({
			data: {
				firstName: "Jack",
				lastName: "Johnson",
				dateOfBirth: new Date("2016-07-22"),
				yearGroup: "Year 5",
				className: "5A",
				schoolId: school.id,
			},
		});

		// Link parent to children
		await tx.parentChild.createMany({
			data: [
				{ userId: parent.id, childId: child1.id, relation: "PARENT" },
				{ userId: parent.id, childId: child2.id, relation: "PARENT" },
			],
		});

		// Create a sample message
		await tx.message.create({
			data: {
				schoolId: school.id,
				subject: "Welcome to SchoolConnect!",
				body: "We are excited to launch our new communication platform. You can now receive messages, view attendance, and make payments all in one place.",
				category: "STANDARD",
				children: {
					create: [{ childId: child1.id }, { childId: child2.id }],
				},
			},
		});

		// Create sample attendance
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		await tx.attendanceRecord.createMany({
			data: [
				{ childId: child1.id, schoolId: school.id, date: today, session: "AM", mark: "PRESENT" },
				{ childId: child1.id, schoolId: school.id, date: today, session: "PM", mark: "PRESENT" },
				{ childId: child2.id, schoolId: school.id, date: today, session: "AM", mark: "PRESENT" },
				{
					childId: child2.id,
					schoolId: school.id,
					date: today,
					session: "PM",
					mark: "LATE",
					note: "Arrived at 1:15pm",
				},
			],
		});

		// Create sample payment item
		await tx.paymentItem.create({
			data: {
				schoolId: school.id,
				title: "School Trip - Science Museum",
				description: "Year 2 and Year 5 joint trip to the Science Museum",
				amount: 1500, // 15.00
				dueDate: new Date("2026-03-01"),
				category: "TRIP",
				children: {
					create: [{ childId: child1.id }, { childId: child2.id }],
				},
			},
		});
	});

	console.log("Seed data created successfully");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
