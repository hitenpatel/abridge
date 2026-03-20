import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
	const key = process.env.MIS_ENCRYPTION_KEY;
	if (!key) {
		throw new Error("MIS_ENCRYPTION_KEY environment variable is not set");
	}
	const buf = Buffer.from(key, "hex");
	if (buf.length !== 32) {
		throw new Error("MIS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
	}
	return buf;
}

export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();
	// Format: iv:authTag:ciphertext (all hex)
	return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encryptedString: string): string {
	const key = getEncryptionKey();
	const parts = encryptedString.split(":");
	if (parts.length !== 3) {
		throw new Error("Invalid encrypted format");
	}
	const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];
	const iv = Buffer.from(ivHex, "hex");
	const authTag = Buffer.from(authTagHex, "hex");
	const encrypted = Buffer.from(encryptedHex, "hex");
	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(authTag);
	return decipher.update(encrypted) + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
	const parts = value.split(":");
	return parts.length === 3 && (parts[0]?.length ?? 0) === IV_LENGTH * 2;
}
