import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { bucket, s3 } from "./s3";

const DISPLAY_WIDTH = 1200;
const THUMBNAIL_WIDTH = 400;

function variantKey(originalKey: string, suffix: string): string {
	const lastDot = originalKey.lastIndexOf(".");
	if (lastDot === -1) return `${originalKey}_${suffix}`;
	return `${originalKey.slice(0, lastDot)}_${suffix}${originalKey.slice(lastDot)}`;
}

export async function resizeAndStore(
	imageBuffer: Buffer,
	originalKey: string,
	contentType: string,
): Promise<{ displayUrl: string; thumbnailUrl: string }> {
	const image = sharp(imageBuffer);
	const metadata = await image.metadata();
	const width = metadata.width ?? 0;

	const format = contentType === "image/png" ? "png" : "jpeg";

	// Generate display version (max 1200px wide, don't upscale)
	const displayBuffer =
		width > DISPLAY_WIDTH
			? await sharp(imageBuffer).resize(DISPLAY_WIDTH).toFormat(format).toBuffer()
			: imageBuffer;

	// Generate thumbnail (400px wide, don't upscale)
	const thumbnailBuffer =
		width > THUMBNAIL_WIDTH
			? await sharp(imageBuffer).resize(THUMBNAIL_WIDTH).toFormat(format).toBuffer()
			: imageBuffer;

	const displayKey = variantKey(originalKey, "1200");
	const thumbnailKey = variantKey(originalKey, "400");

	await Promise.all([
		s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: displayKey,
				Body: displayBuffer,
				ContentType: contentType,
			}),
		),
		s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: thumbnailKey,
				Body: thumbnailBuffer,
				ContentType: contentType,
			}),
		),
	]);

	const endpoint = process.env.S3_ENDPOINT ?? `https://s3.${process.env.S3_REGION}.amazonaws.com`;
	return {
		displayUrl: `${endpoint}/${bucket}/${displayKey}`,
		thumbnailUrl: `${endpoint}/${bucket}/${thumbnailKey}`,
	};
}
