import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ALLOWED_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, getPresignedUploadUrl } from "../lib/media";
import { router, schoolFeatureProcedure } from "../trpc";

export const mediaRouter = router({
	getUploadUrl: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				filename: z.string().min(1).max(255),
				mimeType: z.string().min(1).max(127),
				sizeBytes: z.number().int().positive(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ALLOWED_TYPES.includes(input.mimeType)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "File type not allowed",
				});
			}

			const maxSize = input.mimeType.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
			if (input.sizeBytes > maxSize) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "File too large",
				});
			}

			const result = await getPresignedUploadUrl(
				input.schoolId,
				input.filename,
				input.mimeType,
				input.sizeBytes,
			);

			return result;
		}),

	confirmUpload: schoolFeatureProcedure
		.input(
			z.object({
				schoolId: z.string(),
				key: z.string().min(1).max(512),
				filename: z.string().min(1).max(255),
				mimeType: z.string().min(1).max(127),
				sizeBytes: z.number().int().positive(),
				width: z.number().int().positive().optional(),
				height: z.number().int().positive().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify the key belongs to this school
			if (!input.key.startsWith(`schools/${input.schoolId}/`)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Upload key does not match school",
				});
			}

			const media = await ctx.prisma.mediaUpload.create({
				data: {
					schoolId: input.schoolId,
					uploadedBy: ctx.user.id,
					key: input.key,
					filename: input.filename,
					mimeType: input.mimeType,
					sizeBytes: input.sizeBytes,
					width: input.width,
					height: input.height,
				},
			});

			return media;
		}),
});
