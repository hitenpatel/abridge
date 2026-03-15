import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";

function createMediaId(): string {
	return randomBytes(16).toString("hex");
}

export const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"video/mp4",
	"video/quicktime",
];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

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

export async function getPresignedUploadUrl(
	schoolId: string,
	filename: string,
	mimeType: string,
	sizeBytes: number,
): Promise<{ uploadUrl: string; key: string }> {
	if (!ALLOWED_TYPES.includes(mimeType)) {
		throw new Error("File type not allowed");
	}
	const maxSize = mimeType.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
	if (sizeBytes > maxSize) {
		throw new Error("File too large");
	}

	const ext = filename.split(".").pop() || "bin";
	const key = `schools/${schoolId}/media/${createMediaId()}.${ext}`;

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: mimeType,
		ContentLength: sizeBytes,
	});

	const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

	return { uploadUrl, key };
}

export function getMediaUrl(key: string): string {
	const publicUrl =
		process.env.R2_PUBLIC_URL ??
		process.env.S3_ENDPOINT ??
		"https://media.schoolconnect.example.com";
	return `${publicUrl}/${key}`;
}
