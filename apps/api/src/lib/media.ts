import { randomBytes } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function createMediaId(): string {
	return randomBytes(16).toString("hex");
}

export const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"video/mp4",
	"video/quicktime",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20 MB

export const DOCUMENT_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

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
	let maxSize: number;
	if (mimeType.startsWith("video/")) {
		maxSize = MAX_VIDEO_SIZE;
	} else if (DOCUMENT_TYPES.includes(mimeType)) {
		maxSize = MAX_DOCUMENT_SIZE;
	} else {
		maxSize = MAX_IMAGE_SIZE;
	}
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
