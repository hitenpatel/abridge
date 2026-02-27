import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { protectedProcedure, router, schoolFeatureProcedure } from "../trpc";

export const communityRouter = router({
	createPost: protectedProcedure
		.input(
			z.object({
				schoolId: z.string(),
				type: z.enum(["DISCUSSION", "EVENT", "VOLUNTEER_REQUEST"]),
				title: z.string().min(1).max(150),
				body: z.string().min(1).max(2000),
				tags: z.array(z.string()).max(3).default([]),
				imageUrls: z.array(z.string()).max(4).default([]),
				volunteerSlots: z
					.array(
						z.object({
							description: z.string().min(1),
							date: z.date(),
							startTime: z.string(),
							endTime: z.string(),
							spotsTotal: z.number().int().min(1),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Rate limit: new accounts (< 7 days) max 2 posts/day
			const accountAge = Date.now() - new Date(ctx.user.createdAt ?? 0).getTime();
			const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

			if (isNewAccount) {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const postsToday = await ctx.prisma.communityPost.count({
					where: {
						authorId: ctx.user.id,
						schoolId: input.schoolId,
						createdAt: { gte: today },
					},
				});
				if (postsToday >= 2) {
					throw new TRPCError({
						code: "TOO_MANY_REQUESTS",
						message: "New accounts can only create 2 posts per day",
					});
				}
			}

			const post = await ctx.prisma.communityPost.create({
				data: {
					schoolId: input.schoolId,
					authorId: ctx.user.id,
					type: input.type,
					title: input.title,
					body: input.body,
					tags: input.tags,
					imageUrls: input.imageUrls,
					...(input.type === "VOLUNTEER_REQUEST" && input.volunteerSlots
						? {
								volunteerSlots: {
									create: input.volunteerSlots.map((slot) => ({
										description: slot.description,
										date: slot.date,
										startTime: slot.startTime,
										endTime: slot.endTime,
										spotsTotal: slot.spotsTotal,
									})),
								},
							}
						: {}),
				},
			});

			return post;
		}),

	listPosts: protectedProcedure
		.input(
			z.object({
				schoolId: z.string(),
				type: z.enum(["DISCUSSION", "EVENT", "VOLUNTEER_REQUEST"]).optional(),
				tag: z.string().optional(),
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const items = await ctx.prisma.communityPost.findMany({
				where: {
					schoolId: input.schoolId,
					status: "ACTIVE",
					...(input.type ? { type: input.type } : {}),
					...(input.tag ? { tags: { has: input.tag } } : {}),
				},
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
				include: {
					author: { select: { id: true, name: true } },
					_count: { select: { comments: true } },
					volunteerSlots:
						input.type === "VOLUNTEER_REQUEST" || !input.type
							? { include: { _count: { select: { signups: true } } } }
							: false,
				},
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const next = items.pop();
				nextCursor = next?.id;
			}

			return { items, nextCursor };
		}),

	getPost: protectedProcedure
		.input(z.object({ postId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.prisma.communityPost.findUnique({
				where: { id: input.postId },
				include: {
					author: { select: { id: true, name: true } },
					comments: {
						where: { status: "ACTIVE" },
						orderBy: { createdAt: "asc" },
						include: { author: { select: { id: true, name: true } } },
					},
					volunteerSlots: {
						include: {
							signups: {
								include: { user: { select: { id: true, name: true } } },
							},
						},
					},
				},
			});
		}),

	addComment: protectedProcedure
		.input(
			z.object({
				postId: z.string(),
				body: z.string().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.communityComment.create({
				data: {
					postId: input.postId,
					authorId: ctx.user.id,
					body: input.body,
				},
			});
		}),

	getComments: protectedProcedure
		.input(
			z.object({
				postId: z.string(),
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const items = await ctx.prisma.communityComment.findMany({
				where: { postId: input.postId, status: "ACTIVE" },
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				orderBy: { createdAt: "asc" },
				include: { author: { select: { id: true, name: true } } },
			});

			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				const next = items.pop();
				nextCursor = next?.id;
			}

			return { items, nextCursor };
		}),

	signUpForSlot: protectedProcedure
		.input(z.object({ slotId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const slot = await ctx.prisma.volunteerSlot.findUnique({
				where: { id: input.slotId },
			});

			if (!slot) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Volunteer slot not found",
				});
			}

			if (slot.spotsTaken >= slot.spotsTotal) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This slot is full",
				});
			}

			const existing = await ctx.prisma.volunteerSignup.findUnique({
				where: {
					slotId_userId: { slotId: input.slotId, userId: ctx.user.id },
				},
			});

			if (existing) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Already signed up for this slot",
				});
			}

			const signup = await ctx.prisma.volunteerSignup.create({
				data: { slotId: input.slotId, userId: ctx.user.id },
			});

			await ctx.prisma.volunteerSlot.update({
				where: { id: input.slotId },
				data: { spotsTaken: { increment: 1 } },
			});

			return signup;
		}),

	cancelSignup: protectedProcedure
		.input(z.object({ slotId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.volunteerSignup.delete({
				where: {
					slotId_userId: { slotId: input.slotId, userId: ctx.user.id },
				},
			});

			await ctx.prisma.volunteerSlot.update({
				where: { id: input.slotId },
				data: { spotsTaken: { decrement: 1 } },
			});

			return { success: true };
		}),

	pinPost: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				postId: z.string(),
				pinned: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "communityHub");

			if (input.pinned) {
				const pinnedCount = await ctx.prisma.communityPost.count({
					where: { schoolId: input.schoolId, isPinned: true },
				});
				if (pinnedCount >= 3) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Maximum 3 pinned posts allowed",
					});
				}
			}

			return ctx.prisma.communityPost.update({
				where: { id: input.postId },
				data: { isPinned: input.pinned },
			});
		}),

	removePost: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				postId: z.string(),
				reason: z.string().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "communityHub");

			return ctx.prisma.communityPost.update({
				where: { id: input.postId },
				data: {
					status: "REMOVED",
					removedBy: ctx.user.id,
					removedReason: input.reason,
				},
			});
		}),
});
