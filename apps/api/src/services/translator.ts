import { translate } from "google-translate-api-x";
import { logger } from "../lib/logger";

export async function translateText(text: string, targetLang: string): Promise<string> {
	if (!targetLang || targetLang === "en") return text;
	try {
		const res = await translate(text, { to: targetLang });
		return res.text;
	} catch (e) {
		logger.error({ err: e }, "Translation failed");
		return text;
	}
}
