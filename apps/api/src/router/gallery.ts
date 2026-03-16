import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertFeatureEnabled } from "../lib/feature-guards";
import { getMediaUrl } from "../lib/media";
import { protectedProcedure, router, schoolStaffProcedure } from "../trpc";

export const galleryRouter = router({
	createAlbum: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				title: z.string().min(1).max(200),
				description: z.string().max(2000).optional(),
				yearGroup: z.string().max(50).optional(),
				className: z.string().max(100).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Load features manually since schoolStaffProcedure doesn't
			const school = await ctx.prisma.school.findUnique({
				where: { id: ctx.schoolId },
				select: {
					galleryEnabled: true,
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
					translationEnabled: true,
					parentsEveningEnabled: true,
					wellbeingEnabled: true,
					emergencyCommsEnabled: true,
					analyticsEnabled: true,
					mealBookingEnabled: true,
					clubBookingEnabled: true,
					reportCardsEnabled: true,
					communityHubEnabled: true,
					homeworkEnabled: true,
					readingDiaryEnabled: true,
					visitorManagementEnabled: true,
					misIntegrationEnabled: true,
					achievementsEnabled: true,
					progressSummariesEnabled: true,
					liveChatEnabled: true,
					aiDraftingEnabled: true,
					attendanceAlertsEnabled: true,
				},
			});
			if (!school) {
				throw new TRPCError({ code: "NOT_FOUND", message: "School not found" });
			}
			assertFeatureEnabled({ schoolFeatures: school }, "gallery");

			const album = await ctx.prisma.galleryAlbum.create({
				data: {
					schoolId: ctx.schoolId,
					createdBy: ctx.user.id,
					title: input.title,
					description: input.description,
					yearGroup: input.yearGroup,
					className: input.className,
				},
			});

			return album;
		}),

	addPhotos: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				albumId: z.string(),
				photos: z.array(
					z.object({
						mediaId: z.string(),
						caption: z.string().max(500).optional(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify album belongs to this school
			const album = await ctx.prisma.galleryAlbum.findFirst({
				where: { id: input.albumId, schoolId: ctx.schoolId },
			});
			if (!album) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Album not found" });
			}

			// Get current max sort order
			const lastPhoto = await ctx.prisma.galleryPhoto.findFirst({
				where: { albumId: input.albumId },
				orderBy: { sortOrder: "desc" },
				select: { sortOrder: true },
			});
			const startOrder = (lastPhoto?.sortOrder ?? -1) + 1;

			const photos = await Promise.all(
				input.photos.map((p, idx) =>
					ctx.prisma.galleryPhoto.create({
						data: {
							albumId: input.albumId,
							mediaId: p.mediaId,
							caption: p.caption,
							sortOrder: startOrder + idx,
						},
					}),
				),
			);

			return photos;
		}),

	listAlbums: protectedProcedure
		.input(
			z.object({
				schoolId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Resolve school
			let schoolId = input.schoolId;

			if (!schoolId) {
				// Parent path — derive from child link
				const parentChild = await ctx.prisma.parentChild.findFirst({
					where: { userId: ctx.user.id },
					select: { child: { select: { schoolId: true, yearGroup: true } } },
				});
				if (!parentChild) {
					return [];
				}
				schoolId = parentChild.child.schoolId;
			}

			// Check gallery enabled
			const school = await ctx.prisma.school.findUnique({
				where: { id: schoolId },
				select: { galleryEnabled: true },
			});
			if (!school?.galleryEnabled) {
				return [];
			}

			// Check if user is staff
			const staffMember = await ctx.prisma.staffMember.findFirst({
				where: { userId: ctx.user.id, schoolId },
			});
			const isStaff = !!staffMember;

			// Parents: only published albums, filtered by child year group
			if (!isStaff) {
				const parentLinks = await ctx.prisma.parentChild.findMany({
					where: { userId: ctx.user.id },
					select: { child: { select: { yearGroup: true } } },
				});
				const yearGroups = [
					...new Set(parentLinks.map((p) => p.child.yearGroup).filter(Boolean)),
				] as string[];

				const albums = await ctx.prisma.galleryAlbum.findMany({
					where: {
						schoolId,
						isPublished: true,
						OR: [{ yearGroup: null }, { yearGroup: { in: yearGroups } }],
					},
					include: {
						_count: { select: { photos: true } },
						photos: {
							take: 1,
							orderBy: { sortOrder: "asc" },
							include: { media: { select: { key: true } } },
						},
					},
					orderBy: { createdAt: "desc" },
				});

				return albums.map((a) => ({
					...a,
					photoCount: a._count.photos,
					thumbnailUrl: a.photos[0] ? getMediaUrl(a.photos[0].media.key) : null,
				}));
			}

			// Staff: all albums
			const albums = await ctx.prisma.galleryAlbum.findMany({
				where: { schoolId },
				include: {
					_count: { select: { photos: true } },
					photos: {
						take: 1,
						orderBy: { sortOrder: "asc" },
						include: { media: { select: { key: true } } },
					},
				},
				orderBy: { createdAt: "desc" },
			});

			return albums.map((a) => ({
				...a,
				photoCount: a._count.photos,
				thumbnailUrl: a.photos[0] ? getMediaUrl(a.photos[0].media.key) : null,
			}));
		}),

	getAlbum: protectedProcedure
		.input(z.object({ albumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const album = await ctx.prisma.galleryAlbum.findUnique({
				where: { id: input.albumId },
				include: {
					photos: {
						orderBy: { sortOrder: "asc" },
						include: {
							media: {
								select: { key: true, filename: true, mimeType: true },
							},
						},
					},
				},
			});

			if (!album) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Album not found" });
			}

			// Verify school membership
			const isStaff = await ctx.prisma.staffMember.findFirst({
				where: { userId: ctx.user.id, schoolId: album.schoolId },
			});
			const isParent = await ctx.prisma.parentChild.findFirst({
				where: {
					userId: ctx.user.id,
					child: { schoolId: album.schoolId },
				},
			});

			if (!isStaff && !isParent) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this school" });
			}

			// Parents can only see published albums
			if (!isStaff && !album.isPublished) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Album not published" });
			}

			return {
				...album,
				photos: album.photos.map((p) => ({
					...p,
					url: getMediaUrl(p.media.key),
				})),
			};
		}),

	publishAlbum: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				albumId: z.string(),
				isPublished: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const album = await ctx.prisma.galleryAlbum.findFirst({
				where: { id: input.albumId, schoolId: ctx.schoolId },
			});
			if (!album) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Album not found" });
			}

			const updated = await ctx.prisma.galleryAlbum.update({
				where: { id: input.albumId },
				data: { isPublished: input.isPublished },
			});

			return updated;
		}),

	deleteAlbum: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				albumId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const album = await ctx.prisma.galleryAlbum.findFirst({
				where: { id: input.albumId, schoolId: ctx.schoolId },
			});
			if (!album) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Album not found" });
			}

			await ctx.prisma.galleryAlbum.delete({ where: { id: input.albumId } });

			return { success: true };
		}),

	deletePhoto: schoolStaffProcedure
		.input(
			z.object({
				schoolId: z.string(),
				photoId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const photo = await ctx.prisma.galleryPhoto.findUnique({
				where: { id: input.photoId },
				include: { album: { select: { schoolId: true } } },
			});
			if (!photo || photo.album.schoolId !== ctx.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
			}

			await ctx.prisma.galleryPhoto.delete({ where: { id: input.photoId } });

			return { success: true };
		}),
});
