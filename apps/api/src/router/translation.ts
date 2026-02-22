import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { translateTexts } from "../services/translation";

export const translationRouter = router({
	translate: protectedProcedure
		.input(
			z.object({
				texts: z.array(z.string()).min(1).max(50),
				targetLang: z.string().min(2).max(5),
				sourceLang: z.string().min(2).max(5).default("en"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const translations = await translateTexts(
				ctx.prisma,
				input.texts,
				input.targetLang,
				input.sourceLang,
			);
			return { translations };
		}),
});
