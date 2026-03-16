import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

const readWithEnum = z.enum(["ALONE", "PARENT", "TEACHER", "SIBLING", "OTHER"]);

export const readingDiaryRouter = router({
	logReading: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				date: z.date(),
				bookTitle: z.string().min(1).max(200),
				pagesOrChapter: z.string().max(100).optional(),
				minutesRead: z.number().int().min(0).max(600).optional(),
				readWith: readWithEnum,
				parentComment: z.string().max(1000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
			});
			if (!child) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found",
				});
			}

			const diary = await ctx.prisma.readingDiary.upsert({
				where: { childId: input.childId },
				update: {},
				create: {
					childId: input.childId,
					schoolId: child.schoolId,
				},
			});

			const entry = await ctx.prisma.readingEntry.create({
				data: {
					diaryId: diary.id,
					date: input.date,
					bookTitle: input.bookTitle,
					pagesOrChapter: input.pagesOrChapter ?? null,
					minutesRead: input.minutesRead ?? null,
					readWith: input.readWith,
					parentComment: input.parentComment ?? null,
					entryBy: "PARENT",
				},
			});

			return entry;
		}),

	getEntries: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				startDate: z.date(),
				endDate: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent or staff
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
			});
			if (!parentChild && child) {
				const staffMember = await ctx.prisma.staffMember.findUnique({
					where: {
						userId_schoolId: {
							userId: ctx.user.id,
							schoolId: child.schoolId,
						},
					},
				});
				if (!staffMember) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Not authorised to view this child's reading diary",
					});
				}
			}
			if (!child) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found",
				});
			}

			const diary = await ctx.prisma.readingDiary.findUnique({
				where: { childId: input.childId },
			});
			if (!diary) {
				return [];
			}

			return ctx.prisma.readingEntry.findMany({
				where: {
					diaryId: diary.id,
					date: { gte: input.startDate, lte: input.endDate },
				},
				orderBy: { date: "desc" },
			});
		}),

	addTeacherComment: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				entryId: z.string(),
				teacherComment: z.string().max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "readingDiary");

			return ctx.prisma.readingEntry.update({
				where: { id: input.entryId },
				data: { teacherComment: input.teacherComment },
			});
		}),

	createTeacherEntry: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
				date: z.date(),
				bookTitle: z.string().min(1).max(200),
				minutesRead: z.number().int().min(0).max(600).optional(),
				readWith: readWithEnum,
				teacherComment: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "readingDiary");

			const child = await ctx.prisma.child.findUnique({
				where: { id: input.childId },
			});
			if (!child) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Child not found",
				});
			}

			const diary = await ctx.prisma.readingDiary.upsert({
				where: { childId: input.childId },
				update: {},
				create: {
					childId: input.childId,
					schoolId: child.schoolId,
				},
			});

			return ctx.prisma.readingEntry.create({
				data: {
					diaryId: diary.id,
					date: input.date,
					bookTitle: input.bookTitle,
					minutesRead: input.minutesRead ?? null,
					readWith: input.readWith,
					teacherComment: input.teacherComment ?? null,
					entryBy: "TEACHER",
				},
			});
		}),

	updateDiary: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				childId: z.string(),
				currentBook: z.string().max(200).optional(),
				readingLevel: z.string().max(50).optional(),
				targetMinsPerDay: z.number().int().min(0).max(300).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "readingDiary");

			return ctx.prisma.readingDiary.update({
				where: { childId: input.childId },
				data: {
					currentBook: input.currentBook,
					readingLevel: input.readingLevel,
					targetMinsPerDay: input.targetMinsPerDay,
				},
			});
		}),

	getDiary: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				const child = await ctx.prisma.child.findUnique({
					where: { id: input.childId },
				});
				if (child) {
					const staffMember = await ctx.prisma.staffMember.findUnique({
						where: {
							userId_schoolId: {
								userId: ctx.user.id,
								schoolId: child.schoolId,
							},
						},
					});
					if (!staffMember) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Not authorised to view this child's reading diary",
						});
					}
				} else {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Child not found",
					});
				}
			}

			return ctx.prisma.readingDiary.findUnique({
				where: { childId: input.childId },
				select: {
					id: true,
					childId: true,
					schoolId: true,
					currentBook: true,
					readingLevel: true,
					targetMinsPerDay: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		}),

	getClassOverview: schoolFeatureProcedure
		.input(z.object({ schoolId: z.string() }))
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "readingDiary");

			const now = new Date();
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
			weekStart.setHours(0, 0, 0, 0);

			const children = await ctx.prisma.child.findMany({
				where: { schoolId: input.schoolId },
				include: {
					readingDiary: {
						include: {
							entries: {
								orderBy: { date: "desc" },
							},
						},
					},
				},
			});

			return children.map((child) => {
				const diary = child.readingDiary;
				const entries = diary?.entries ?? [];
				const entriesThisWeek = entries.filter((e) => e.date >= weekStart);
				const lastEntry = entries[0] ?? null;

				return {
					childId: child.id,
					childName: `${child.firstName} ${child.lastName}`,
					readingLevel: diary?.readingLevel ?? null,
					lastEntryDate: lastEntry?.date ?? null,
					entriesThisWeek: entriesThisWeek.length,
				};
			});
		}),

	getStats: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				const child = await ctx.prisma.child.findUnique({
					where: { id: input.childId },
				});
				if (child) {
					const staffMember = await ctx.prisma.staffMember.findUnique({
						where: {
							userId_schoolId: {
								userId: ctx.user.id,
								schoolId: child.schoolId,
							},
						},
					});
					if (!staffMember) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Not authorised to view this child's reading stats",
						});
					}
				} else {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Child not found",
					});
				}
			}

			const diary = await ctx.prisma.readingDiary.findUnique({
				where: { childId: input.childId },
				include: {
					entries: {
						orderBy: { date: "desc" },
					},
				},
			});

			if (!diary) {
				return {
					totalEntriesThisTerm: 0,
					avgMinutes: 0,
					daysReadThisWeek: 0,
					currentStreak: 0,
				};
			}

			const now = new Date();
			// Term start: September 1 of current academic year
			const termStart = new Date(
				now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1,
				8,
				1,
			);

			const entries = diary.entries;
			const termEntries = entries.filter((e) => e.date >= termStart);

			// Average minutes
			const withMinutes = termEntries.filter((e) => e.minutesRead != null);
			const avgMinutes =
				withMinutes.length > 0
					? Math.round(
							withMinutes.reduce((sum, e) => sum + (e.minutesRead ?? 0), 0) / withMinutes.length,
						)
					: 0;

			// Days read this week
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - now.getDay() + 1);
			weekStart.setHours(0, 0, 0, 0);
			const weekEntries = entries.filter((e) => e.date >= weekStart);
			const uniqueWeekDays = new Set(weekEntries.map((e) => e.date.toISOString().slice(0, 10)));

			// Current streak (consecutive days with entry, going backwards from today)
			let streak = 0;
			const checkDate = new Date(now);
			checkDate.setHours(0, 0, 0, 0);
			const entryDates = new Set(entries.map((e) => e.date.toISOString().slice(0, 10)));
			while (entryDates.has(checkDate.toISOString().slice(0, 10))) {
				streak++;
				checkDate.setDate(checkDate.getDate() - 1);
			}

			return {
				totalEntriesThisTerm: termEntries.length,
				avgMinutes,
				daysReadThisWeek: uniqueWeekDays.size,
				currentStreak: streak,
			};
		}),
});
