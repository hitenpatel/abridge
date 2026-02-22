import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

const LANGUAGE_NAMES: Record<string, string> = {
	en: "English",
	pl: "Polski",
	ur: "اردو",
	pa: "ਪੰਜਾਬੀ",
	bn: "বাংলা",
	ro: "Română",
	ar: "العربية",
	so: "Soomaali",
	pt: "Português",
	ta: "தமிழ்",
	gu: "ગુજરાતી",
	lt: "Lietuvių",
	tr: "Türkçe",
	zh: "中文",
	es: "Español",
};

export const SUPPORTED_LANGUAGES = Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
	code,
	name,
}));

export function useTranslation() {
	const { data: profile } = trpc.settings.getProfile.useQuery();
	const translateMutation = trpc.translation.translate.useMutation();
	const userLang = profile?.language ?? "en";

	const translate = useCallback(
		async (texts: string[]): Promise<string[]> => {
			if (userLang === "en" || texts.length === 0) return texts;
			const result = await translateMutation.mutateAsync({
				texts,
				targetLang: userLang,
			});
			return result.translations;
		},
		[userLang, translateMutation],
	);

	return { userLang, translate, isTranslating: translateMutation.isPending };
}
