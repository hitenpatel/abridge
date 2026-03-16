import {
	type AttendanceMark,
	type CheckInBy,
	type ClassPostEmoji,
	type DayOfWeek,
	type MealCategory,
	type Mood,
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
			wellbeingEnabled: true,
			emergencyCommsEnabled: true,
			analyticsEnabled: true,
			mealBookingEnabled: true,
			reportCardsEnabled: true,
			communityHubEnabled: true,
			homeworkEnabled: true,
			readingDiaryEnabled: true,
			visitorManagementEnabled: true,
			misIntegrationEnabled: false,
			achievementsEnabled: true,
			galleryEnabled: true,
			progressSummariesEnabled: true,
			communityTags: ["General", "Events", "Help Needed", "PTA", "Lost & Found"],
			brandColor: "#1E3A5F",
			brandFont: "DEFAULT",
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

	const teacher = await prisma.user.upsert({
		where: { email: "marcus@oakwood.sch.uk" },
		update: { name: "Marcus Williams" },
		create: {
			email: "marcus@oakwood.sch.uk",
			name: "Marcus Williams",
			notifyByPush: true,
			notifyBySms: false,
			notifyByEmail: true,
		},
	});

	await prisma.account.upsert({
		where: {
			providerId_accountId: {
				providerId: "credential",
				accountId: teacher.id,
			},
		},
		update: { password: hashedPassword },
		create: {
			providerId: "credential",
			accountId: teacher.id,
			userId: teacher.id,
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

	await prisma.staffMember.upsert({
		where: {
			userId_schoolId: {
				userId: teacher.id,
				schoolId: school.id,
			},
		},
		update: { role: "TEACHER" },
		create: {
			userId: teacher.id,
			schoolId: school.id,
			role: "TEACHER",
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
			subject: "Welcome to Abridge!",
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

	// ─── Calendar Events ──────────────────────────────────────────
	const seedEvents = [
		{
			title: "Spring Term Ends",
			category: "TERM_DATE" as const,
			startDate: new Date("2026-04-10"),
			allDay: true,
		},
		{
			title: "Year 2 Trip to Science Museum",
			body: "Year 2 and Year 5 joint trip. Please bring packed lunch.",
			category: "EVENT" as const,
			startDate: new Date("2026-03-20T09:00:00"),
			endDate: new Date("2026-03-20T15:00:00"),
			allDay: false,
		},
		{
			title: "Sports Day",
			body: "Annual sports day on the school field. Parents welcome from 1pm.",
			category: "EVENT" as const,
			startDate: new Date("2026-04-25"),
			allDay: true,
			rsvpRequired: true,
			maxCapacity: 30,
		},
	];

	for (const evt of seedEvents) {
		const existing = await prisma.event.findFirst({
			where: { schoolId: school.id, title: evt.title },
		});
		if (!existing) {
			await prisma.event.create({
				data: { schoolId: school.id, ...evt },
			});
		}
	}
	console.log("Seeded calendar events");

	// ─── Form Templates ───────────────────────────────────────────
	const consentForm = await prisma.formTemplate.upsert({
		where: { id: "form-photo-consent" },
		update: {},
		create: {
			id: "form-photo-consent",
			schoolId: school.id,
			title: "Photography Consent Form",
			description: "Permission for your child to be photographed during school activities",
			fields: [
				{
					id: "consent",
					type: "checkbox",
					label: "I give consent for my child to be photographed during school activities",
					required: true,
				},
				{
					id: "signature",
					type: "text",
					label: "Parent/Guardian full name (as signature)",
					required: true,
				},
			],
		},
	});
	console.log("Seeded form templates");

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

	// 10. Wellbeing Check-Ins
	const moods: Mood[] = ["GREAT", "GOOD", "OK", "LOW", "GOOD"];
	for (const child of [child1, child2]) {
		for (let i = 0; i < 5; i++) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			await prisma.wellbeingCheckIn.upsert({
				where: {
					childId_date: { childId: child.id, date },
				},
				update: {},
				create: {
					childId: child.id,
					schoolId: school.id,
					mood: moods[i],
					checkedInBy: "PARENT" as CheckInBy,
					date,
				},
			});
		}
	}

	// 11. Meal Booking — sample menu for this week
	const monday = new Date(today);
	monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // current Monday
	const existingMenu = await prisma.mealMenu.findFirst({
		where: { schoolId: school.id, weekStarting: monday },
	});
	if (!existingMenu) {
		await prisma.mealMenu.create({
			data: {
				schoolId: school.id,
				weekStarting: monday,
				publishedAt: new Date(),
				createdBy: admin.id,
				options: {
					create: [
						{
							day: "MONDAY" as DayOfWeek,
							category: "HOT_MAIN" as MealCategory,
							name: "Fish Fingers & Chips",
							allergens: ["FISH", "GLUTEN"],
							priceInPence: 250,
							sortOrder: 1,
						},
						{
							day: "MONDAY" as DayOfWeek,
							category: "VEGETARIAN" as MealCategory,
							name: "Veggie Burger & Chips",
							allergens: ["GLUTEN", "SOYA"],
							priceInPence: 250,
							sortOrder: 2,
						},
						{
							day: "TUESDAY" as DayOfWeek,
							category: "HOT_MAIN" as MealCategory,
							name: "Roast Chicken & Veg",
							allergens: [],
							priceInPence: 250,
							sortOrder: 1,
						},
						{
							day: "TUESDAY" as DayOfWeek,
							category: "VEGETARIAN" as MealCategory,
							name: "Pasta Bake",
							allergens: ["GLUTEN", "MILK"],
							priceInPence: 250,
							sortOrder: 2,
						},
						{
							day: "WEDNESDAY" as DayOfWeek,
							category: "HOT_MAIN" as MealCategory,
							name: "Beef Bolognese",
							allergens: ["GLUTEN"],
							priceInPence: 250,
							sortOrder: 1,
						},
						{
							day: "WEDNESDAY" as DayOfWeek,
							category: "VEGETARIAN" as MealCategory,
							name: "Jacket Potato & Beans",
							allergens: [],
							priceInPence: 250,
							sortOrder: 2,
						},
					],
				},
			},
		});
	}

	// 12. Community Hub — sample post
	const existingCommunityPost = await prisma.communityPost.findFirst({
		where: { schoolId: school.id },
	});
	if (!existingCommunityPost) {
		await prisma.communityPost.create({
			data: {
				schoolId: school.id,
				authorId: parent.id,
				type: "DISCUSSION",
				title: "Best after-school clubs this term?",
				body: "Hi everyone! My daughter is in Year 2 and wants to try some after-school clubs. Which ones have your children enjoyed? We're particularly interested in art or sports clubs.",
				tags: ["General"],
				isPinned: false,
			},
		});
	}

	// 13. Report Cards — sample cycle
	const existingCycle = await prisma.reportCycle.findFirst({
		where: { schoolId: school.id },
	});
	if (!existingCycle) {
		const cycle = await prisma.reportCycle.create({
			data: {
				schoolId: school.id,
				name: "Spring Term 2026",
				type: "TERMLY",
				assessmentModel: "PRIMARY_DESCRIPTIVE",
				publishDate: new Date("2026-04-01"),
				status: "PUBLISHED",
				createdBy: admin.id,
			},
		});

		await prisma.reportCard.create({
			data: {
				cycleId: cycle.id,
				childId: child1.id,
				schoolId: school.id,
				generalComment:
					"Emily has had a wonderful spring term. She is making excellent progress in reading and is always enthusiastic in class.",
				subjectGrades: {
					create: [
						{
							subject: "English",
							sortOrder: 1,
							level: "EXCEEDING",
							effort: "OUTSTANDING",
							comment: "Excellent reading progress",
						},
						{
							subject: "Mathematics",
							sortOrder: 2,
							level: "EXPECTED",
							effort: "GOOD",
							comment: "Good number work",
						},
						{
							subject: "Science",
							sortOrder: 3,
							level: "EXPECTED",
							effort: "GOOD",
							comment: "Enjoys experiments",
						},
					],
				},
			},
		});
	}

	// ─── Phase 3C: Homework ───────────────────────────────────
	const hwAssignment = await prisma.homeworkAssignment.upsert({
		where: { id: "hw-seed-1" },
		update: {},
		create: {
			id: "hw-seed-1",
			schoolId: school.id,
			setBy: teacher.id,
			subject: "Mathematics",
			title: "Chapter 5 Practice Questions",
			description: "Complete questions 1-10 on page 45.",
			yearGroup: "4",
			setDate: new Date(),
			dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		},
	});

	await prisma.homeworkAssignment.upsert({
		where: { id: "hw-seed-2" },
		update: {},
		create: {
			id: "hw-seed-2",
			schoolId: school.id,
			setBy: teacher.id,
			subject: "English",
			title: "Creative Writing - My Favourite Day",
			description: "Write a short story about your favourite day out.",
			yearGroup: "4",
			setDate: new Date(),
			dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
		},
	});

	// ─── Phase 3C: Reading Diary ──────────────────────────────
	const diary = await prisma.readingDiary.upsert({
		where: { childId: child1.id },
		update: {},
		create: {
			childId: child1.id,
			schoolId: school.id,
			currentBook: "Charlotte's Web",
			readingLevel: "Orange Band",
			targetMinsPerDay: 15,
		},
	});

	// Add a few reading entries
	const readingDates = [0, 1, 2, 3, 4].map((i) => {
		const d = new Date();
		d.setDate(d.getDate() - i);
		d.setHours(0, 0, 0, 0);
		return d;
	});
	for (const date of readingDates) {
		if (date.getDay() === 0 || date.getDay() === 6) continue;
		await prisma.readingEntry.upsert({
			where: { id: `reading-${date.toISOString().split("T")[0]}-${child1.id}` },
			update: {},
			create: {
				id: `reading-${date.toISOString().split("T")[0]}-${child1.id}`,
				diaryId: diary.id,
				date,
				bookTitle: "Charlotte's Web",
				minutesRead: 15 + Math.floor(Math.random() * 10),
				readWith: "PARENT",
				entryBy: "PARENT",
				parentComment: date.getDate() === new Date().getDate() ? "Read really well tonight!" : null,
			},
		});
	}

	// ─── Phase 3C: Visitor ────────────────────────────────────
	await prisma.visitor.upsert({
		where: { id: "visitor-seed-1" },
		update: {},
		create: {
			id: "visitor-seed-1",
			schoolId: school.id,
			name: "John Smith",
			organisation: "ABC Plumbing",
			phone: "07700 900100",
			isRegular: true,
		},
	});

	await prisma.visitor.upsert({
		where: { id: "visitor-seed-2" },
		update: {},
		create: {
			id: "visitor-seed-2",
			schoolId: school.id,
			name: "Emma Brown",
			organisation: "Ofsted",
			isRegular: false,
		},
	});

	// ─── Achievement Categories & Awards ─────────────────────────
	const achievementCategories = [
		{ name: "Star of the Week", icon: "⭐", pointValue: 10, type: "POINTS" as const },
		{ name: "Reading Champion", icon: "📚", pointValue: 5, type: "BADGE" as const },
		{ name: "Kindness Award", icon: "💛", pointValue: 5, type: "POINTS" as const },
	];

	for (const cat of achievementCategories) {
		const existing = await prisma.achievementCategory.findFirst({
			where: { schoolId: school.id, name: cat.name },
		});
		if (!existing) {
			const category = await prisma.achievementCategory.create({
				data: { schoolId: school.id, ...cat },
			});
			// Award a sample achievement to child1
			await prisma.achievement.create({
				data: {
					schoolId: school.id,
					childId: child1.id,
					categoryId: category.id,
					awardedBy: admin.id,
					points: cat.pointValue,
					reason: `${cat.name} award for great effort`,
				},
			});
		}
	}
	console.log("Seeded achievement categories and awards");

	// ─── Gallery Albums & Photos ──────────────────────────────
	const existingAlbum = await prisma.galleryAlbum.findFirst({
		where: { schoolId: school.id },
	});
	if (!existingAlbum) {
		// Create sample media uploads
		const mediaUpload1 = await prisma.mediaUpload.create({
			data: {
				schoolId: school.id,
				uploadedBy: admin.id,
				key: `schools/${school.id}/media/sports-day-1.jpg`,
				filename: "sports-day-1.jpg",
				mimeType: "image/jpeg",
				sizeBytes: 204800,
			},
		});

		const mediaUpload2 = await prisma.mediaUpload.create({
			data: {
				schoolId: school.id,
				uploadedBy: admin.id,
				key: `schools/${school.id}/media/sports-day-2.jpg`,
				filename: "sports-day-2.jpg",
				mimeType: "image/jpeg",
				sizeBytes: 307200,
			},
		});

		// Published album for Year 2
		const album = await prisma.galleryAlbum.create({
			data: {
				schoolId: school.id,
				createdBy: admin.id,
				title: "Sports Day 2026",
				description: "Photos from our annual sports day event",
				yearGroup: "Year 2",
				isPublished: true,
				photos: {
					create: [
						{ mediaId: mediaUpload1.id, caption: "Egg and spoon race", sortOrder: 0 },
						{ mediaId: mediaUpload2.id, caption: "Relay race final", sortOrder: 1 },
					],
				},
			},
		});

		// Draft album (not visible to parents)
		await prisma.galleryAlbum.create({
			data: {
				schoolId: school.id,
				createdBy: admin.id,
				title: "Art Exhibition (Draft)",
				description: "Year 5 art exhibition photos - not yet published",
				yearGroup: "Year 5",
				isPublished: false,
			},
		});

		console.log("Seeded gallery albums and photos");
	}

	// ─── Progress Summaries ─────────────────────────────────
	const lastMonday = new Date(today);
	lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7));
	const existingProgressSummary = await prisma.progressSummary.findUnique({
		where: { childId_weekStart: { childId: child1.id, weekStart: lastMonday } },
	});
	if (!existingProgressSummary) {
		await prisma.progressSummary.create({
			data: {
				childId: child1.id,
				schoolId: school.id,
				weekStart: lastMonday,
				templateData: {
					childName: "Emily Johnson",
					weekStart: lastMonday.toISOString(),
					attendance: { percentage: 100, daysPresent: 5, daysTotal: 5, lateCount: 0 },
					homework: { completed: 3, total: 4, overdue: 0 },
					reading: {
						daysRead: 4,
						totalMinutes: 72,
						avgMinutes: 18,
						currentStreak: 4,
						currentBook: "Charlotte's Web",
					},
					achievements: {
						pointsEarned: 15,
						awardsReceived: 2,
						categories: ["Star of the Week", "Reading Champion"],
					},
					wellbeing: { avgMood: "GOOD", checkInCount: 5, trend: "stable" },
				},
				summary:
					'Attendance: 100% (5/5 days).\nHomework: completed 3 of 4 assignments.\nReading: read 4 days this week (avg 18 min/day, 4-day streak). Currently reading "Charlotte\'s Web".\nAchievements: earned 15 points — Star of the Week, Reading Champion.\nWellbeing: mood average GOOD, stable trend.',
			},
		});
		console.log("Seeded progress summary");
	}

	console.log("Seed data created successfully");
	console.log(
		`\nLogin credentials:\n  Parent:  sarah@example.com / ${SEED_PASSWORD}\n  Admin:   claire@oakwood.sch.uk / ${SEED_PASSWORD}\n  Teacher: marcus@oakwood.sch.uk / ${SEED_PASSWORD}`,
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
