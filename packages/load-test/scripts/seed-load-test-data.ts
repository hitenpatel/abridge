/**
 * Seeds the database with load test data.
 * Run with: npx tsx packages/load-test/scripts/seed-load-test-data.ts
 *
 * Creates:
 * - 10 schools
 * - 2 staff per school (1 admin, 1 teacher)
 * - 50 parents per school (500 total)
 * - 2 children per parent (1000 total)
 * - 5 messages per school (50 total)
 */
import { PrismaClient } from "@schoolconnect/db";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
	console.log("Seeding load test data...");

	const password = await hashPassword("LoadTest123!");

	for (let s = 0; s < 10; s++) {
		console.log(`Creating school ${s + 1}/10...`);

		const school = await prisma.school.create({
			data: {
				name: `Load Test School ${s}`,
				urn: `LT${String(s).padStart(6, "0")}`,
				address: `${s} Test Street`,
				phone: `0700000000${s}`,
				messagingEnabled: true,
				paymentsEnabled: true,
				attendanceEnabled: true,
				calendarEnabled: true,
				formsEnabled: true,
				translationEnabled: true,
				parentsEveningEnabled: true,
			},
		});

		// Create admin
		const admin = await prisma.user.create({
			data: {
				email: `admin${s}@loadtest.com`,
				name: `Admin ${s}`,
				emailVerified: true,
			},
		});
		await prisma.account.create({
			data: {
				userId: admin.id,
				accountId: admin.id,
				providerId: "credential",
				password,
			},
		});
		await prisma.staffMember.create({
			data: { userId: admin.id, schoolId: school.id, role: "ADMIN" },
		});

		// Create teacher
		const teacher = await prisma.user.create({
			data: {
				email: `teacher${s}@loadtest.com`,
				name: `Teacher ${s}`,
				emailVerified: true,
			},
		});
		await prisma.account.create({
			data: {
				userId: teacher.id,
				accountId: teacher.id,
				providerId: "credential",
				password,
			},
		});
		await prisma.staffMember.create({
			data: { userId: teacher.id, schoolId: school.id, role: "TEACHER" },
		});

		// Create parents and children
		for (let p = 0; p < 50; p++) {
			const parentIdx = s * 50 + p;
			const parent = await prisma.user.create({
				data: {
					email: `parent${parentIdx}@loadtest.com`,
					name: `Parent ${parentIdx}`,
					emailVerified: true,
				},
			});
			await prisma.account.create({
				data: {
					userId: parent.id,
					accountId: parent.id,
					providerId: "credential",
					password,
				},
			});

			// 2 children per parent
			for (let c = 0; c < 2; c++) {
				const child = await prisma.child.create({
					data: {
						firstName: `Child${c}`,
						lastName: `Parent${parentIdx}`,
						dateOfBirth: new Date(2018, 0, 1),
						yearGroup: `Year ${(c % 6) + 1}`,
						schoolId: school.id,
					},
				});
				await prisma.parentChild.create({
					data: { userId: parent.id, childId: child.id },
				});
			}
		}

		// Create 5 broadcast messages per school
		for (let m = 0; m < 5; m++) {
			await prisma.message.create({
				data: {
					schoolId: school.id,
					subject: `Load Test Message ${m}`,
					body: `This is load test message ${m} for school ${s}.`,
					category: "STANDARD",
					type: "BROADCAST",
					authorId: admin.id,
				},
			});
		}
	}

	console.log("Load test data seeded successfully!");
	console.log("  10 schools, 20 staff, 500 parents, 1000 children, 50 messages");
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
