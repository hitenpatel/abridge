import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { getPresignedUploadUrl, isAllowedContentType } from "../lib/s3";
import { protectedProcedure, router, schoolFeatureProcedure, schoolStaffProcedure } from "../trpc";

const classPostEmojiValues = ["HEART", "THUMBS_UP", "CLAP", "LAUGH", "WOW"] as const;

export const classPostRouter = router({
	getUploadUrl: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				filename: z.string().min(1),
				contentType: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			if (!isAllowedContentType(input.contentType)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Unsupported content type. Allowed: image/jpeg, image/png, image/webp, image/heic, video/mp4, video/quicktime",
				});
			}

			const result = await getPresignedUploadUrl({
				schoolId: input.schoolId,
				filename: input.filename,
				contentType: input.contentType,
			});

			return { uploadUrl: result.uploadUrl, publicUrl: result.publicUrl };
		}),

	create: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				yearGroup: z.string().min(1),
				className: z.string().min(1),
				body: z.string().optional(),
				mediaUrls: z.array(z.string().url()).max(10).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertFeatureEnabled(ctx, "messaging");

			const hasBody = input.body && input.body.trim().length > 0;
			const hasMedia = input.mediaUrls && input.mediaUrls.length > 0;

			if (!hasBody && !hasMedia) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "At least one of body or mediaUrls is required",
				});
			}

			const post = await ctx.prisma.classPost.create({
				data: {
					schoolId: input.schoolId,
					authorId: ctx.user.id,
					body: input.body ?? null,
					yearGroup: input.yearGroup,
					className: input.className,
					mediaUrls: hasMedia ? input.mediaUrls : [],
				},
			});

			return post;
		}),

	delete: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				postId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const post = await ctx.prisma.classPost.findUnique({
				where: { id: input.postId, deletedAt: null },
			});

			if (!post || post.schoolId !== input.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
			}

			if (post.authorId !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own posts" });
			}

			await ctx.prisma.classPost.update({
				where: { id: input.postId },
				data: { deletedAt: new Date() },
			});

			return { success: true };
		}),

	update: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				postId: z.string(),
				body: z.string().max(5000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const post = await ctx.prisma.classPost.findUnique({
				where: { id: input.postId, deletedAt: null },
			});

			if (!post || post.schoolId !== input.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
			}

			if (post.authorId !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own posts" });
			}

			const updated = await ctx.prisma.classPost.update({
				where: { id: input.postId },
				data: {
					body: input.body ?? post.body,
				},
			});

			return updated;
		}),

	getById: protectedProcedure
		.input(z.object({ postId: z.string() }))
		.query(async ({ ctx, input }) => {
			const post = await ctx.prisma.classPost.findUnique({
				where: { id: input.postId, deletedAt: null },
				include: {
					reactions: { select: { emoji: true, userId: true } },
				},
			});

			if (!post) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
			}

			// Verify access: user is either staff at the school or a parent with a child in this class
			const staffMember = await ctx.prisma.staffMember.findUnique({
				where: { userId_schoolId: { userId: ctx.user.id, schoolId: post.schoolId } },
			});

			if (!staffMember) {
				const hasChild = await ctx.prisma.parentChild.findFirst({
					where: {
						userId: ctx.user.id,
						child: {
							schoolId: post.schoolId,
							yearGroup: post.yearGroup,
							className: post.className,
						},
					},
				});

				if (!hasChild) {
					throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view this post" });
				}
			}

			// Look up author name separately (no relation defined on ClassPost)
			const author = await ctx.prisma.user.findUnique({
				where: { id: post.authorId },
				select: { name: true },
			});

			const reactionCounts: Record<string, number> = {};
			let myReaction: string | null = null;
			for (const r of post.reactions) {
				reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
				if (r.userId === ctx.user.id) {
					myReaction = r.emoji;
				}
			}

			return {
				id: post.id,
				authorId: post.authorId,
				authorName: author?.name ?? "Staff",
				body: post.body,
				yearGroup: post.yearGroup,
				className: post.className,
				mediaUrls: post.mediaUrls,
				createdAt: post.createdAt,
				reactionCounts,
				totalReactions: post.reactions.length,
				myReaction,
			};
		}),

	listRecent: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				limit: z.number().min(1).max(20).default(5),
			}),
		)
		.query(async ({ ctx, input }) => {
			const posts = await ctx.prisma.classPost.findMany({
				where: { schoolId: input.schoolId, deletedAt: null },
				orderBy: { createdAt: "desc" },
				take: input.limit,
			});

			return posts.map((post) => ({
				id: post.id,
				body: post.body,
				yearGroup: post.yearGroup,
				className: post.className,
				mediaUrls: post.mediaUrls,
				authorId: post.authorId,
				createdAt: post.createdAt,
			}));
		}),

	listByClass: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				yearGroup: z.string(),
				className: z.string(),
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const posts = await ctx.prisma.classPost.findMany({
				where: {
					schoolId: input.schoolId,
					yearGroup: input.yearGroup,
					className: input.className,
					deletedAt: null,
				},
				orderBy: { createdAt: "desc" },
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				include: {
					reactions: {
						select: { emoji: true },
					},
				},
			});

			let nextCursor: string | undefined;
			if (posts.length > input.limit) {
				const nextItem = posts.pop();
				nextCursor = nextItem?.id;
			}

			return {
				items: posts.map((post) => {
					const reactionCounts: Record<string, number> = {};
					for (const r of post.reactions) {
						reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
					}
					return {
						id: post.id,
						authorId: post.authorId,
						body: post.body,
						yearGroup: post.yearGroup,
						className: post.className,
						mediaUrls: post.mediaUrls,
						createdAt: post.createdAt,
						reactionCounts,
						totalReactions: post.reactions.length,
					};
				}),
				nextCursor,
			};
		}),

	feed: protectedProcedure
		.input(
			z.object({
				childId: z.string(),
				limit: z.number().min(1).max(50).default(20),
				cursor: z.string().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify parent-child link
			const link = await ctx.prisma.parentChild.findUnique({
				where: {
					userId_childId: { userId: ctx.user.id, childId: input.childId },
				},
				include: { child: { select: { yearGroup: true, className: true, schoolId: true } } },
			});

			if (!link) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this child" });
			}

			const { yearGroup, className, schoolId } = link.child;
			if (!yearGroup || !className) {
				return { items: [], nextCursor: undefined };
			}

			const posts = await ctx.prisma.classPost.findMany({
				where: { schoolId, yearGroup, className, deletedAt: null },
				orderBy: { createdAt: "desc" },
				take: input.limit + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
				include: {
					reactions: {
						select: { emoji: true, userId: true },
					},
				},
			});

			let nextCursor: string | undefined;
			if (posts.length > input.limit) {
				const nextItem = posts.pop();
				nextCursor = nextItem?.id;
			}

			return {
				items: posts.map((post) => {
					const reactionCounts: Record<string, number> = {};
					let myReaction: string | null = null;
					for (const r of post.reactions) {
						reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
						if (r.userId === ctx.user.id) {
							myReaction = r.emoji;
						}
					}
					return {
						id: post.id,
						authorId: post.authorId,
						body: post.body,
						yearGroup: post.yearGroup,
						className: post.className,
						mediaUrls: post.mediaUrls,
						createdAt: post.createdAt,
						reactionCounts,
						totalReactions: post.reactions.length,
						myReaction,
					};
				}),
				nextCursor,
			};
		}),

	react: protectedProcedure
		.input(
			z.object({
				postId: z.string(),
				emoji: z.enum(classPostEmojiValues),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify post exists and parent can see it
			const post = await ctx.prisma.classPost.findUnique({
				where: { id: input.postId, deletedAt: null },
				select: { schoolId: true, yearGroup: true, className: true },
			});

			if (!post) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
			}

			// Check parent has a child in this class
			const hasChild = await ctx.prisma.parentChild.findFirst({
				where: {
					userId: ctx.user.id,
					child: {
						schoolId: post.schoolId,
						yearGroup: post.yearGroup,
						className: post.className,
					},
				},
			});

			if (!hasChild) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized for this class" });
			}

			await ctx.prisma.classPostReaction.upsert({
				where: {
					postId_userId: { postId: input.postId, userId: ctx.user.id },
				},
				update: { emoji: input.emoji },
				create: {
					postId: input.postId,
					userId: ctx.user.id,
					emoji: input.emoji,
				},
			});

			return { success: true };
		}),

	removeReaction: protectedProcedure
		.input(z.object({ postId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.prisma.classPostReaction
				.delete({
					where: {
						postId_userId: { postId: input.postId, userId: ctx.user.id },
					},
				})
				.catch(() => {
					// Idempotent - if no reaction exists, that's fine
				});

			return { success: true };
		}),
});
