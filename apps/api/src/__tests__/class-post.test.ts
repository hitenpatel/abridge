// Tests for classPost router
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../router";

// Mock NotificationService
vi.mock("../services/notification", () => ({
	notificationService: {
		getInstance: vi.fn().mockReturnValue({
			sendPush: vi.fn().mockResolvedValue({ success: true, count: 1 }),
		}),
	},
}));

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
	invalidateStaffCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/s3", () => ({
	isAllowedContentType: vi.fn((type: string) => ["image/jpeg", "image/png"].includes(type)),
	getPresignedUploadUrl: vi.fn().mockResolvedValue({
		uploadUrl: "https://s3.example.com/upload",
		publicUrl: "https://s3.example.com/public/photo.jpg",
	}),
}));

const allFeaturesEnabled = {
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
};

function createTestContext(overrides?: Record<string, any>): any {
	return {
		prisma: {
			staffMember: {
				findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
			},
			school: {
				findUnique: vi.fn().mockResolvedValue(allFeaturesEnabled),
			},
			classPost: {
				create: vi
					.fn()
					.mockImplementation(({ data }) =>
						Promise.resolve({ id: "post-1", ...data, createdAt: new Date() }),
					),
				findUnique: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
				delete: vi.fn().mockResolvedValue({}),
			},
			classPostReaction: {
				upsert: vi.fn().mockResolvedValue({}),
				delete: vi.fn().mockResolvedValue({}),
			},
			parentChild: {
				findUnique: vi.fn().mockResolvedValue(null),
				findFirst: vi.fn().mockResolvedValue(null),
			},
		},
		req: {},
		res: {},
		user: { id: "staff-1", name: "Staff" },
		session: {},
		...overrides,
	};
}

describe("classPost router", () => {
	describe("getUploadUrl", () => {
		it("returns presigned URL for allowed content type", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.getUploadUrl({
				schoolId: "school-1",
				filename: "photo.jpg",
				contentType: "image/jpeg",
			});

			expect(result.uploadUrl).toBe("https://s3.example.com/upload");
			expect(result.publicUrl).toBe("https://s3.example.com/public/photo.jpg");
		});

		it("rejects disallowed content type", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.classPost.getUploadUrl({
					schoolId: "school-1",
					filename: "file.exe",
					contentType: "application/octet-stream",
				}),
			).rejects.toThrow("Unsupported content type");
		});
	});

	describe("create", () => {
		it("creates a text-only post", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.create({
				schoolId: "school-1",
				yearGroup: "Year 3",
				className: "3A",
				body: "Hello class!",
			});

			expect(result.id).toBe("post-1");
			expect(ctx.prisma.classPost.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						schoolId: "school-1",
						authorId: "staff-1",
						body: "Hello class!",
						yearGroup: "Year 3",
						className: "3A",
						mediaUrls: [],
					}),
				}),
			);
		});

		it("creates a media-only post", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.create({
				schoolId: "school-1",
				yearGroup: "Year 3",
				className: "3A",
				mediaUrls: ["https://s3.example.com/public/photo.jpg"],
			});

			expect(result.id).toBe("post-1");
			expect(ctx.prisma.classPost.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						body: null,
						mediaUrls: ["https://s3.example.com/public/photo.jpg"],
					}),
				}),
			);
		});

		it("creates a post with both body and media", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.create({
				schoolId: "school-1",
				yearGroup: "Year 3",
				className: "3A",
				body: "Art class today!",
				mediaUrls: [
					"https://s3.example.com/public/photo1.jpg",
					"https://s3.example.com/public/photo2.jpg",
				],
			});

			expect(result.id).toBe("post-1");
			expect(ctx.prisma.classPost.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						body: "Art class today!",
						mediaUrls: [
							"https://s3.example.com/public/photo1.jpg",
							"https://s3.example.com/public/photo2.jpg",
						],
					}),
				}),
			);
		});

		it("rejects post with empty body and no media", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.classPost.create({
					schoolId: "school-1",
					yearGroup: "Year 3",
					className: "3A",
				}),
			).rejects.toThrow("At least one of body or mediaUrls is required");
		});

		it("rejects post with more than 10 media URLs", async () => {
			const ctx = createTestContext();
			const caller = appRouter.createCaller(ctx);

			const urls = Array.from({ length: 11 }, (_, i) => `https://s3.example.com/photo${i}.jpg`);

			await expect(
				caller.classPost.create({
					schoolId: "school-1",
					yearGroup: "Year 3",
					className: "3A",
					mediaUrls: urls,
				}),
			).rejects.toThrow();
		});

		it("rejects when messaging feature is disabled", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
					school: {
						findUnique: vi.fn().mockResolvedValue({
							...allFeaturesEnabled,
							messagingEnabled: false,
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.classPost.create({
					schoolId: "school-1",
					yearGroup: "Year 3",
					className: "3A",
					body: "Hello class!",
				}),
			).rejects.toThrow("Messaging is disabled for this school");
		});
	});

	describe("delete", () => {
		it("deletes own post successfully", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
					classPost: {
						...createTestContext().prisma.classPost,
						findUnique: vi.fn().mockResolvedValue({
							id: "post-1",
							schoolId: "school-1",
							authorId: "staff-1",
						}),
						update: vi.fn().mockResolvedValue({ id: "post-1", deletedAt: new Date() }),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.delete({
				schoolId: "school-1",
				postId: "post-1",
			});

			expect(result.success).toBe(true);
			expect(ctx.prisma.classPost.update).toHaveBeenCalledWith({
				where: { id: "post-1" },
				data: { deletedAt: expect.any(Date) },
			});
		});

		it("rejects deleting another staff member's post with FORBIDDEN", async () => {
			const ctx = createTestContext({
				prisma: {
					...createTestContext().prisma,
					staffMember: {
						findUnique: vi.fn().mockResolvedValue({ schoolId: "school-1", role: "TEACHER" }),
					},
					classPost: {
						...createTestContext().prisma.classPost,
						findUnique: vi.fn().mockResolvedValue({
							id: "post-2",
							schoolId: "school-1",
							authorId: "other-staff",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.classPost.delete({
					schoolId: "school-1",
					postId: "post-2",
				}),
			).rejects.toThrow("You can only delete your own posts");
		});
	});

	describe("feed", () => {
		it("returns posts for child's class", async () => {
			const mockPosts = [
				{
					id: "post-1",
					authorId: "teacher-1",
					body: "Great day in class!",
					yearGroup: "Year 3",
					className: "3A",
					mediaUrls: [],
					createdAt: new Date(),
					reactions: [
						{ emoji: "HEART", userId: "other-parent" },
						{ emoji: "HEART", userId: "another-parent" },
						{ emoji: "THUMBS_UP", userId: "third-parent" },
					],
				},
			];

			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { yearGroup: "Year 3", className: "3A", schoolId: "school-1" },
						}),
						findFirst: vi.fn().mockResolvedValue(null),
					},
					classPost: {
						...createTestContext().prisma.classPost,
						findMany: vi.fn().mockResolvedValue(mockPosts),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.feed({ childId: "child-1" });

			expect(result.items).toHaveLength(1);
			expect(result.items[0]!.body).toBe("Great day in class!");
			expect(result.items[0]!.reactionCounts).toEqual({ HEART: 2, THUMBS_UP: 1 });
			expect(result.items[0]!.totalReactions).toBe(3);
			expect(result.items[0]!.myReaction).toBeNull();
		});

		it("rejects unauthorized child with FORBIDDEN", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(caller.classPost.feed({ childId: "not-my-child" })).rejects.toThrow(
				"Not authorized for this child",
			);
		});

		it("includes own reaction in feed", async () => {
			const mockPosts = [
				{
					id: "post-1",
					authorId: "teacher-1",
					body: "Class photo day!",
					yearGroup: "Year 3",
					className: "3A",
					mediaUrls: ["https://s3.example.com/photo.jpg"],
					createdAt: new Date(),
					reactions: [
						{ emoji: "HEART", userId: "parent-1" },
						{ emoji: "THUMBS_UP", userId: "other-parent" },
					],
				},
			];

			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					parentChild: {
						findUnique: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
							child: { yearGroup: "Year 3", className: "3A", schoolId: "school-1" },
						}),
						findFirst: vi.fn().mockResolvedValue(null),
					},
					classPost: {
						...createTestContext().prisma.classPost,
						findMany: vi.fn().mockResolvedValue(mockPosts),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.feed({ childId: "child-1" });

			expect(result.items[0]!.myReaction).toBe("HEART");
		});
	});

	describe("react", () => {
		it("adds a reaction to a post", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					classPost: {
						...createTestContext().prisma.classPost,
						findUnique: vi.fn().mockResolvedValue({
							schoolId: "school-1",
							yearGroup: "Year 3",
							className: "3A",
						}),
					},
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findFirst: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.react({
				postId: "post-1",
				emoji: "HEART",
			});

			expect(result.success).toBe(true);
			expect(ctx.prisma.classPostReaction.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { postId_userId: { postId: "post-1", userId: "parent-1" } },
					update: { emoji: "HEART" },
					create: { postId: "post-1", userId: "parent-1", emoji: "HEART" },
				}),
			);
		});

		it("changes reaction via upsert", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					classPost: {
						...createTestContext().prisma.classPost,
						findUnique: vi.fn().mockResolvedValue({
							schoolId: "school-1",
							yearGroup: "Year 3",
							className: "3A",
						}),
					},
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findFirst: vi.fn().mockResolvedValue({
							userId: "parent-1",
							childId: "child-1",
						}),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.react({
				postId: "post-1",
				emoji: "THUMBS_UP",
			});

			expect(result.success).toBe(true);
			expect(ctx.prisma.classPostReaction.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					update: { emoji: "THUMBS_UP" },
				}),
			);
		});

		it("rejects reaction for unauthorized class", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					classPost: {
						...createTestContext().prisma.classPost,
						findUnique: vi.fn().mockResolvedValue({
							schoolId: "school-1",
							yearGroup: "Year 3",
							className: "3A",
						}),
					},
					parentChild: {
						findUnique: vi.fn().mockResolvedValue(null),
						findFirst: vi.fn().mockResolvedValue(null),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			await expect(
				caller.classPost.react({
					postId: "post-1",
					emoji: "HEART",
				}),
			).rejects.toThrow("Not authorized for this class");
		});
	});

	describe("removeReaction", () => {
		it("removes an existing reaction", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.removeReaction({ postId: "post-1" });

			expect(result.success).toBe(true);
			expect(ctx.prisma.classPostReaction.delete).toHaveBeenCalledWith({
				where: { postId_userId: { postId: "post-1", userId: "parent-1" } },
			});
		});

		it("handles idempotent remove when no reaction exists", async () => {
			const ctx = createTestContext({
				user: { id: "parent-1", name: "Parent" },
				prisma: {
					...createTestContext().prisma,
					classPostReaction: {
						...createTestContext().prisma.classPostReaction,
						delete: vi.fn().mockRejectedValue(new Error("Record not found")),
					},
				},
			});
			const caller = appRouter.createCaller(ctx);

			const result = await caller.classPost.removeReaction({ postId: "post-1" });

			expect(result.success).toBe(true);
		});
	});
});
