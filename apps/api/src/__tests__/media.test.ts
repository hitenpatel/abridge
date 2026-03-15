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
		uploadUrl: "https://r2.example.com/presigned-url",
		key: "schools/school-1/media/test123.jpg",
	}),
	getMediaUrl: vi
		.fn()
		.mockReturnValue("https://media.example.com/schools/school-1/media/test123.jpg"),
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

function createTestContext(overrides?: Record<string, any>): any {
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
			mediaUpload: {
				create: vi.fn().mockResolvedValue({
					id: "media-1",
					schoolId: "school-1",
					uploadedBy: "user-1",
					key: "schools/school-1/media/test123.jpg",
					filename: "photo.jpg",
					mimeType: "image/jpeg",
					sizeBytes: 1024000,
				}),
			},
			...overrides,
		},
		user: { id: "user-1" },
		session: { id: "session-1" },
	};
}

const caller = (ctx: any) => appRouter.createCaller(ctx);

describe("media router", () => {
	it("should return a presigned upload URL for allowed types", async () => {
		const ctx = createTestContext();
		const result = await caller(ctx).media.getUploadUrl({
			schoolId: "school-1",
			filename: "photo.jpg",
			mimeType: "image/jpeg",
			sizeBytes: 1024000,
		});
		expect(result.uploadUrl).toBe("https://r2.example.com/presigned-url");
		expect(result.key).toContain("schools/school-1/media/");
	});

	it("should reject disallowed MIME types", async () => {
		const ctx = createTestContext();
		await expect(
			caller(ctx).media.getUploadUrl({
				schoolId: "school-1",
				filename: "virus.exe",
				mimeType: "application/x-executable",
				sizeBytes: 1024,
			}),
		).rejects.toThrow("File type not allowed");
	});

	it("should reject oversized images", async () => {
		const ctx = createTestContext();
		await expect(
			caller(ctx).media.getUploadUrl({
				schoolId: "school-1",
				filename: "huge.jpg",
				mimeType: "image/jpeg",
				sizeBytes: 20 * 1024 * 1024, // 20MB, over 10MB limit
			}),
		).rejects.toThrow("File too large");
	});

	it("should confirm upload and create MediaUpload record", async () => {
		const ctx = createTestContext();
		const result = await caller(ctx).media.confirmUpload({
			schoolId: "school-1",
			key: "schools/school-1/media/test123.jpg",
			filename: "photo.jpg",
			mimeType: "image/jpeg",
			sizeBytes: 1024000,
		});
		expect(result.id).toBe("media-1");
		expect(ctx.prisma.mediaUpload.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					schoolId: "school-1",
					key: "schools/school-1/media/test123.jpg",
				}),
			}),
		);
	});

	it("should reject confirmUpload with mismatched school key", async () => {
		const ctx = createTestContext();
		await expect(
			caller(ctx).media.confirmUpload({
				schoolId: "school-1",
				key: "schools/school-2/media/test123.jpg",
				filename: "photo.jpg",
				mimeType: "image/jpeg",
				sizeBytes: 1024000,
			}),
		).rejects.toThrow("Upload key does not match school");
	});
});
