import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { logger } from "./logger";

const s3 = new S3Client({
	region: "auto",
	endpoint: process.env.R2_ACCOUNT_ID
		? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
		: process.env.S3_ENDPOINT,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID ?? "",
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY ?? "",
	},
	forcePathStyle: true,
});

const bucket = process.env.R2_BUCKET_NAME ?? process.env.S3_BUCKET ?? "schoolconnect-media";

const THUMBNAIL_WIDTH = 300;
const MEDIUM_WIDTH = 800;

interface ProcessedImage {
	thumbnailKey: string;
	mediumKey?: string;
}

/**
 * Download an image from S3, generate thumbnail + medium sizes, upload back.
 * Non-blocking — failures are logged but don't throw.
 */
export async function processUploadedImage(
	originalKey: string,
	mimeType: string,
): Promise<ProcessedImage | null> {
	if (!mimeType.startsWith("image/")) return null;

	try {
		// Download original
		const getCmd = new GetObjectCommand({ Bucket: bucket, Key: originalKey });
		const response = await s3.send(getCmd);
		const body = await response.Body?.transformToByteArray();
		if (!body) return null;

		const buffer = Buffer.from(body);
		const basePath = originalKey.replace(/\.[^.]+$/, "");

		// Generate thumbnail (300px wide, WebP)
		const thumbnailBuffer = await sharp(buffer)
			.resize(THUMBNAIL_WIDTH, undefined, { withoutEnlargement: true })
			.webp({ quality: 75 })
			.toBuffer();

		const thumbnailKey = `${basePath}_thumb.webp`;
		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: thumbnailKey,
				Body: thumbnailBuffer,
				ContentType: "image/webp",
			}),
		);

		// Generate medium (800px wide, WebP)
		const mediumBuffer = await sharp(buffer)
			.resize(MEDIUM_WIDTH, undefined, { withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();

		const mediumKey = `${basePath}_medium.webp`;
		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: mediumKey,
				Body: mediumBuffer,
				ContentType: "image/webp",
			}),
		);

		logger.info({ originalKey, thumbnailKey, mediumKey }, "Image variants generated");

		return { thumbnailKey, mediumKey };
	} catch (err) {
		logger.error({ err, originalKey }, "Failed to process image");
		return null;
	}
}
