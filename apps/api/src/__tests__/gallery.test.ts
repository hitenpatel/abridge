import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/media", () => ({
	ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
	MAX_IMAGE_SIZE: 10 * 1024 * 1024,
	MAX_VIDEO_SIZE: 50 * 1024 * 1024,
	getPresignedUploadUrl: vi.fn().mockResolvedValue({
		uploadUrl: "https://r2.example.com/presigned",
		key: "schools/school-1/media/abc.jpg",
	}),
	getMediaUrl: vi
		.fn()
		.mockImplementation((key: string) => `https://media.example.com/${key}`),
}));

const allFeatures = {
	messagingEnabled: true,
	paymentsEnabled: true,
	attendanceEnabled: true,
	calendarEnabled: true,
	formsEnabled: true,
	translationEnabled: false,
	parentsEveningEnabled: false,
	wellbeingEnabled: false,
	emergencyCommsEnabled: false,
	analyticsEnabled: false,
	mealBookingEnabled: false,
	clubBookingEnabled: false,
	reportCardsEnabled: false,
	communityHubEnabled: false,
	paymentDinnerMoneyEnabled: true,
	paymentTripsEnabled: true,
	paymentClubsEnabled: true,
	paymentUniformEnabled: true,
	paymentOtherEnabled: true,
	homeworkEnabled: false,
	readingDiaryEnabled: false,
	visitorManagementEnabled: false,
	misIntegrationEnabled: false,
	achievementsEnabled: false,
	galleryEnabled: true,
};

function createStaffContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue(allFeatures),
			},
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({
					userId: "user-1",
					schoolId: "school-1",
					role: "ADMIN",
				}),
			},
			galleryAlbum: {
				create: vi.fn().mockResolvedValue({
					id: "album-1",
					schoolId: "school-1",
					createdBy: "user-1",
					title: "Sports Day 2026",
					description: "Annual sports day photos",
					yearGroup: "Year 2",
					isPublished: false,
				}),
				findFirst: vi.fn().mockResolvedValue({
					id: "album-1",
					schoolId: "school-1",
				}),
				findMany: vi.fn().mockResolvedValue([]),
				findUnique: vi.fn().mockResolvedValue(null),
				update: vi.fn().mockResolvedValue({ id: "album-1", isPublished: true }),
				delete: vi.fn().mockResolvedValue({ id: "album-1" }),
			},
			galleryPhoto: {
				create: vi.fn().mockResolvedValue({
					id: "photo-1",
					albumId: "album-1",
					mediaId: "media-1",
					sortOrder: 0,
				}),
				findFirst: vi.fn().mockResolvedValue(null),
				findUnique: vi.fn().mockResolvedValue({
					id: "photo-1",
					album: { schoolId: "school-1" },
				}),
				delete: vi.fn().mockResolvedValue({ id: "photo-1" }),
			},
			...overrides,
		},
		user: { id: "user-1" },
		session: { id: "session-1" },
	};
}

function createParentContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			school: {
				findUnique: vi.fn().mockResolvedValue(allFeatures),
			},
			staffMember: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
			parentChild: {
				findFirst: vi.fn().mockResolvedValue({
					child: { schoolId: "school-1", yearGroup: "Year 2" },
				}),
				findMany: vi.fn().mockResolvedValue([
					{ child: { yearGroup: "Year 2" } },
				]),
			},
			galleryAlbum: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "album-1",
						title: "Sports Day",
						isPublished: true,
						yearGroup: "Year 2",
						_count: { photos: 5 },
						photos: [
							{
								media: { key: "schools/school-1/media/thumb.jpg" },
							},
						],
					},
				]),
				findUnique: vi.fn().mockResolvedValue({
					id: "album-1",
					schoolId: "school-1",
					isPublished: true,
					photos: [
						{
							id: "photo-1",
							media: { key: "schools/school-1/media/photo1.jpg", filename: "photo1.jpg", mimeType: "image/jpeg" },
							caption: "Great shot",
							sortOrder: 0,
						},
					],
				}),
			},
			...overrides,
		},
		user: { id: "parent-1" },
		session: { id: "session-2" },
	};
}

const caller = (ctx: any) => appRouter.createCaller(ctx);

describe("gallery router", () => {
	it("should create an album (staff)", async () => {
		const ctx = createStaffContext();
		const result = await caller(ctx).gallery.createAlbum({
			schoolId: "school-1",
			title: "Sports Day 2026",
			description: "Annual sports day photos",
			yearGroup: "Year 2",
		});
		expect(result.id).toBe("album-1");
		expect(result.title).toBe("Sports Day 2026");
	});

	it("should add photos to an album", async () => {
		const ctx = createStaffContext();
		const result = await caller(ctx).gallery.addPhotos({
			schoolId: "school-1",
			albumId: "album-1",
			photos: [{ mediaId: "media-1", caption: "Great shot" }],
		});
		expect(result).toHaveLength(1);
		expect(ctx.prisma.galleryPhoto.create).toHaveBeenCalled();
	});

	it("should list published albums for parents filtered by year group", async () => {
		const ctx = createParentContext();
		const result = await caller(ctx).gallery.listAlbums({});
		expect(ctx.prisma.galleryAlbum.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					isPublished: true,
				}),
			}),
		);
	});

	it("should get album details with photo URLs", async () => {
		const ctx = createParentContext();
		const result = await caller(ctx).gallery.getAlbum({ albumId: "album-1" });
		expect(result.id).toBe("album-1");
		expect(result.photos[0].url).toContain("schools/school-1/media/photo1.jpg");
	});

	it("should reject cross-school album access", async () => {
		const ctx = createParentContext({
			parentChild: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			staffMember: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
			galleryAlbum: {
				findUnique: vi.fn().mockResolvedValue({
					id: "album-1",
					schoolId: "school-2",
					isPublished: true,
					photos: [],
				}),
			},
		});
		await expect(
			caller(ctx).gallery.getAlbum({ albumId: "album-1" }),
		).rejects.toThrow("Not a member of this school");
	});
});
