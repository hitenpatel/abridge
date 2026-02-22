import {
	type AttendanceMark,
	type ClassPostEmoji,
	PrismaClient,
	type SchoolSession,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const SEED_PASSWORD = "password123";

async function main() {
	const hashedPassword = await hashPassword(SEED_PASSWORD);
	// 1. School
	const school = await prisma.school.upsert({
		where: { urn: "123456" },
		update: {},
		create: {
			name: "Oakwood Primary School",
			urn: "123456",
			address: "123 Oak Lane, London, SE1 1AA",
			phone: "020 7123 4567",
			email: "office@oakwood.sch.uk",
			defaultNotifyByPush: true,
			defaultNotifyBySms: false,
			defaultNotifyByEmail: true,
			messagingEnabled: true,
			paymentsEnabled: true,
			attendanceEnabled: true,
			calendarEnabled: true,
			formsEnabled: true,
			paymentDinnerMoneyEnabled: true,
			paymentTripsEnabled: true,
			paymentClubsEnabled: true,
			paymentUniformEnabled: true,
			paymentOtherEnabled: true,
		},
	});

	// 2. Users
	const parent = await prisma.user.upsert({
		where: { email: "sarah@example.com" },
		update: {
			name: "Sarah Johnson",
			phone: "+447700900001",
		},
		create: {
			email: "sarah@example.com",
			name: "Sarah Johnson",
			phone: "+447700900001",
			notifyByPush: true,
			notifyBySms: false,
			notifyByEmail: true,
		},
	});

	// Create credential account for parent so they can login with email/password
	await prisma.account.upsert({
		where: {
			providerId_accountId: {
				providerId: "credential",
				accountId: parent.id,
			},
		},
		update: { password: hashedPassword },
		create: {
			providerId: "credential",
			accountId: parent.id,
			userId: parent.id,
			password: hashedPassword,
		},
	});

	const admin = await prisma.user.upsert({
		where: { email: "claire@oakwood.sch.uk" },
		update: { name: "Claire Thompson" },
		create: {
			email: "claire@oakwood.sch.uk",
			name: "Claire Thompson",
			notifyByPush: true,
			notifyBySms: false,
			notifyByEmail: true,
		},
	});

	// Create credential account for admin so they can login with email/password
	await prisma.account.upsert({
		where: {
			providerId_accountId: {
				providerId: "credential",
				accountId: admin.id,
			},
		},
		update: { password: hashedPassword },
		create: {
			providerId: "credential",
			accountId: admin.id,
			userId: admin.id,
			password: hashedPassword,
		},
	});

	// 3. Staff
	await prisma.staffMember.upsert({
		where: {
			userId_schoolId: {
				userId: admin.id,
				schoolId: school.id,
			},
		},
		update: { role: "ADMIN" },
		create: {
			userId: admin.id,
			schoolId: school.id,
			role: "ADMIN",
		},
	});

	// 4. Children (Manual idempotent check)
	// Child 1
	let child1 = await prisma.child.findFirst({
		where: {
			schoolId: school.id,
			firstName: "Emily",
			lastName: "Johnson",
		},
	});

	if (!child1) {
		child1 = await prisma.child.create({
			data: {
				firstName: "Emily",
				lastName: "Johnson",
				dateOfBirth: new Date("2019-03-15"),
				yearGroup: "Year 2",
				className: "2B",
				schoolId: school.id,
			},
		});
	}

	// Child 2
	let child2 = await prisma.child.findFirst({
		where: {
			schoolId: school.id,
			firstName: "Jack",
			lastName: "Johnson",
		},
	});

	if (!child2) {
		child2 = await prisma.child.create({
			data: {
				firstName: "Jack",
				lastName: "Johnson",
				dateOfBirth: new Date("2016-07-22"),
				yearGroup: "Year 5",
				className: "5A",
				schoolId: school.id,
			},
		});
	}

	// 5. Parent Links
	await prisma.parentChild.upsert({
		where: {
			userId_childId: {
				userId: parent.id,
				childId: child1.id,
			},
		},
		update: {},
		create: { userId: parent.id, childId: child1.id, relation: "PARENT" },
	});

	await prisma.parentChild.upsert({
		where: {
			userId_childId: {
				userId: parent.id,
				childId: child2.id,
			},
		},
		update: {},
		create: { userId: parent.id, childId: child2.id, relation: "PARENT" },
	});

	// 6. Messages (STANDARD, URGENT, FYI categories)
	const seedMessages = [
		{
			subject: "Welcome to SchoolConnect!",
			body: "We are excited to launch our new communication platform. You can now receive messages, view attendance, and make payments all in one place.",
			category: "STANDARD" as const,
		},
		{
			subject: "Urgent: School Closure Tomorrow",
			body: "Due to severe weather conditions, the school will be closed tomorrow. Please make alternative arrangements for your children. We will update you by 6pm if the situation changes.",
			category: "URGENT" as const,
		},
		{
			subject: "FYI: New Library Books Available",
			body: "We have added 50 new books to the school library this term. Children are welcome to borrow up to 3 books at a time. Please encourage reading at home!",
			category: "FYI" as const,
		},
	];

	for (const msg of seedMessages) {
		const existing = await prisma.message.findFirst({
			where: { schoolId: school.id, subject: msg.subject },
		});
		if (!existing) {
			await prisma.message.create({
				data: {
					schoolId: school.id,
					authorId: admin.id,
					subject: msg.subject,
					body: msg.body,
					category: msg.category,
					children: {
						create: [{ childId: child1.id }, { childId: child2.id }],
					},
				},
			});
		}
	}

	// 7. Attendance
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const attendanceData = [
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
	];

	for (const record of attendanceData) {
		await prisma.attendanceRecord.upsert({
			where: {
				childId_date_session: {
					childId: record.childId,
					date: record.date,
					session: record.session as SchoolSession,
				},
			},
			update: { mark: record.mark as AttendanceMark, note: record.note },
			create: {
				childId: record.childId,
				schoolId: record.schoolId,
				date: record.date,
				session: record.session as SchoolSession,
				mark: record.mark as AttendanceMark,
				note: record.note,
			},
		});
	}

	// 8. Payment Item
	const tripTitle = "School Trip - Science Museum";
	const existingTrip = await prisma.paymentItem.findFirst({
		where: {
			schoolId: school.id,
			title: tripTitle,
		},
	});

	if (!existingTrip) {
		await prisma.paymentItem.create({
			data: {
				schoolId: school.id,
				title: tripTitle,
				description: "Year 2 and Year 5 joint trip to the Science Museum",
				amount: 1500, // 15.00
				dueDate: new Date("2026-03-01"),
				category: "TRIP",
				children: {
					create: [{ childId: child1.id }, { childId: child2.id }],
				},
			},
		});
	}

	// 9. Class Posts
	const existingPost = await prisma.classPost.findFirst({
		where: { schoolId: school.id },
	});

	if (!existingPost) {
		const post1 = await prisma.classPost.create({
			data: {
				schoolId: school.id,
				authorId: admin.id,
				body: "Year 2 had an amazing art lesson today! The children created beautiful collages inspired by Henri Matisse. So proud of their creativity! 🎨",
				yearGroup: "Year 2",
				className: "2B",
				mediaUrls: JSON.parse(
					'["https://placeholder.example.com/art1.jpg", "https://placeholder.example.com/art2.jpg"]',
				),
			},
		});

		const post2 = await prisma.classPost.create({
			data: {
				schoolId: school.id,
				authorId: admin.id,
				body: "Great science experiment in Year 5 today! We made volcanoes erupt using baking soda and vinegar. The children loved it! 🌋",
				yearGroup: "Year 5",
				className: "5A",
				mediaUrls: JSON.parse('["https://placeholder.example.com/science1.jpg"]'),
			},
		});

		const post3 = await prisma.classPost.create({
			data: {
				schoolId: school.id,
				authorId: admin.id,
				body: "Reminder: Please bring PE kits tomorrow for our sports day practice.",
				yearGroup: "Year 2",
				className: "2B",
			},
		});

		// Add reactions from parent
		await prisma.classPostReaction.create({
			data: {
				postId: post1.id,
				userId: parent.id,
				emoji: "HEART" as ClassPostEmoji,
			},
		});

		await prisma.classPostReaction.create({
			data: {
				postId: post2.id,
				userId: parent.id,
				emoji: "WOW" as ClassPostEmoji,
			},
		});
	}

	console.log("Seed data created successfully");
	console.log(
		`\nLogin credentials:\n  Parent: sarah@example.com / ${SEED_PASSWORD}\n  Admin:  claire@oakwood.sch.uk / ${SEED_PASSWORD}`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
