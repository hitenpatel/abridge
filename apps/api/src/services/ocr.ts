import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export async function extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
	if (fileBuffer.length > MAX_FILE_SIZE) {
		console.warn(`OCR skipped: file size (${fileBuffer.length}) exceeds limit`);
		return "";
	}

	try {
		if (mimeType === "application/pdf") {
			const parser = new PDFParse({ data: fileBuffer });
			const result = await parser.getText();
			const text = result.text || "";
			await parser.destroy();
			return text;
		}

		if (mimeType.startsWith("image/")) {
			const worker = await createWorker("eng");
			const {
				data: { text },
			} = await worker.recognize(fileBuffer);
			await worker.terminate();
			return text || "";
		}
	} catch (error) {
		console.error(`OCR failed for ${mimeType}:`, error);
	}

	return "";
}
