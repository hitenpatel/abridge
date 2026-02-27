import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const mealBookingRouter = router({
	createMenu: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				weekStarting: z.date(),
				options: z.array(
					z.object({
						day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
						name: z.string().min(1).max(200),
						description: z.string().max(500).optional(),
						category: z.enum(["HOT_MAIN", "VEGETARIAN", "JACKET_POTATO", "SANDWICH", "DESSERT"]),
						allergens: z.array(z.string()).default([]),
						priceInPence: z.number().int().min(0),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "mealBooking");

			const menu = await ctx.prisma.mealMenu.create({
				data: {
					schoolId: input.schoolId,
					weekStarting: input.weekStarting,
					createdBy: ctx.user.id,
				},
			});

			if (input.options.length > 0) {
				await ctx.prisma.mealOption.createMany({
					data: input.options.map((opt, idx) => ({
						menuId: menu.id,
						day: opt.day,
						name: opt.name,
						description: opt.description ?? null,
						category: opt.category,
						allergens: opt.allergens,
						priceInPence: opt.priceInPence,
						sortOrder: idx,
					})),
				});
			}

			return menu;
		}),

	publishMenu: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				menuId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "mealBooking");

			return ctx.prisma.mealMenu.update({
				where: { id: input.menuId },
				data: { publishedAt: new Date() },
			});
		}),

	getMenuForWeek: protectedProcedure
		.input(
			z.object({
				schoolId: z.string(),
				weekStarting: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return ctx.prisma.mealMenu.findUnique({
				where: {
					schoolId_weekStarting: {
						schoolId: input.schoolId,
						weekStarting: input.weekStarting,
					},
				},
				include: {
					options: {
						where: { available: true },
						orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
					},
				},
			});
		}),

	listMenus: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				limit: z.number().min(1).max(20).default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "mealBooking");

			return ctx.prisma.mealMenu.findMany({
				where: { schoolId: input.schoolId },
				orderBy: { weekStarting: "desc" },
				take: input.limit,
				include: { _count: { select: { options: true } } },
			});
		}),

	bookMeal: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				mealOptionId: z.string(),
				date: z.date(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { parentId: ctx.user.id, childId: input.childId },
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

			return ctx.prisma.mealBooking.upsert({
				where: {
					childId_date: { childId: input.childId, date: input.date },
				},
				update: { mealOptionId: input.mealOptionId, status: "BOOKED" },
				create: {
					childId: input.childId,
					schoolId: child.schoolId,
					mealOptionId: input.mealOptionId,
					date: input.date,
					bookedBy: ctx.user.id,
				},
			});
		}),

	cancelBooking: protectedProcedure
		.input(z.object({ bookingId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.mealBooking.update({
				where: { id: input.bookingId },
				data: { status: "CANCELLED" },
			});
		}),

	getBookingsForChild: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				weekStarting: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const weekEnd = new Date(input.weekStarting);
			weekEnd.setDate(weekEnd.getDate() + 5);

			return ctx.prisma.mealBooking.findMany({
				where: {
					childId: input.childId,
					date: { gte: input.weekStarting, lt: weekEnd },
					status: "BOOKED",
				},
				include: { mealOption: true },
				orderBy: { date: "asc" },
			});
		}),

	updateDietaryProfile: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				allergies: z.array(z.string()).default([]),
				dietaryNeeds: z
					.array(
						z.enum([
							"VEGETARIAN",
							"VEGAN",
							"HALAL",
							"KOSHER",
							"GLUTEN_FREE",
							"DAIRY_FREE",
							"OTHER",
						]),
					)
					.default([]),
				otherNotes: z.string().max(300).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { parentId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Not a parent of this child",
				});
			}

			return ctx.prisma.dietaryProfile.upsert({
				where: { childId: input.childId },
				update: {
					allergies: input.allergies,
					dietaryNeeds: input.dietaryNeeds,
					otherNotes: input.otherNotes ?? null,
				},
				create: {
					childId: input.childId,
					allergies: input.allergies,
					dietaryNeeds: input.dietaryNeeds,
					otherNotes: input.otherNotes ?? null,
				},
			});
		}),

	getDietaryProfile: protectedProcedure
		.input(z.object({ childId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.dietaryProfile.findUnique({
				where: { childId: input.childId },
			});
		}),

	getKitchenSummary: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				date: z.date(),
			}),
		)
		.query(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "mealBooking");

			return ctx.prisma.mealBooking.groupBy({
				by: ["mealOptionId"],
				where: {
					schoolId: input.schoolId,
					date: input.date,
					status: "BOOKED",
				},
				_count: { id: true },
			});
		}),

	toggleOptionAvailability: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				optionId: z.string(),
				available: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "mealBooking");

			return ctx.prisma.mealOption.update({
				where: { id: input.optionId },
				data: { available: input.available },
			});
		}),
});
