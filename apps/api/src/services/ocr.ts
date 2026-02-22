import { logger } from "../lib/logger";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export async function extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
	if (fileBuffer.length > MAX_FILE_SIZE) {
		logger.warn({ size: fileBuffer.length }, "OCR skipped: file size exceeds limit");
		return "";
	}

	try {
		if (mimeType === "application/pdf") {
			// Lazy import to avoid blocking startup
			const { PDFParse } = await import("pdf-parse");
			const parser = new PDFParse({ data: fileBuffer });
			const result = await parser.getText();
			const text = result.text || "";
			await parser.destroy();
			return text;
		}

		if (mimeType.startsWith("image/")) {
			// Lazy import to avoid blocking startup
			const { createWorker } = await import("tesseract.js");
			const worker = await createWorker("eng");
			const {
				data: { text },
			} = await worker.recognize(fileBuffer);
			await worker.terminate();
			return text || "";
		}
	} catch (error) {
		logger.error({ err: error, mimeType }, "OCR failed");
	}

	return "";
}
