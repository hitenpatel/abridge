import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const ALLOWED_CONTENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const PRESIGN_EXPIRES_SECONDS = 900; // 15 minutes

const s3 = new S3Client({
	endpoint: process.env.S3_ENDPOINT,
	region: process.env.S3_REGION ?? "eu-west-2",
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
	},
	forcePathStyle: true, // needed for MinIO / R2 compatibility
});

const bucket = process.env.S3_BUCKET ?? "schoolconnect-media";

export function isAllowedContentType(contentType: string): boolean {
	return ALLOWED_CONTENT_TYPES.includes(contentType);
}

export function isImageContentType(contentType: string): boolean {
	return ALLOWED_IMAGE_TYPES.includes(contentType);
}

function getMaxSize(contentType: string): number {
	return isImageContentType(contentType) ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
}

export async function getPresignedUploadUrl(opts: {
	schoolId: string;
	filename: string;
	contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
	const yearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-02"
	// Sanitize filename: strip path components and non-safe characters
	const basename = path.basename(opts.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
	const key = `${opts.schoolId}/${yearMonth}/${crypto.randomUUID()}/${basename}`;
	const maxSize = getMaxSize(opts.contentType);

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: opts.contentType,
		ContentLength: maxSize, // S3 will reject uploads exceeding this
	});

	const uploadUrl = await getSignedUrl(s3, command, {
		expiresIn: PRESIGN_EXPIRES_SECONDS,
	});

	const endpoint = process.env.S3_ENDPOINT ?? `https://s3.${process.env.S3_REGION}.amazonaws.com`;
	const publicUrl = `${endpoint}/${bucket}/${key}`;

	return { uploadUrl, publicUrl, key };
}

export { s3, bucket };
