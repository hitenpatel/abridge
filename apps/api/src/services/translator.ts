import { translate } from "google-translate-api-x";

export async function translateText(text: string, targetLang: string): Promise<string> {
	if (!targetLang || targetLang === "en") return text;
	try {
		const res = await translate(text, { to: targetLang });
		return res.text;
	} catch (e) {
		console.error("Translation failed", e);
		return text;
	}
}
