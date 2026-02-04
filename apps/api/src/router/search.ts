import { z } from "zod";
import { searchAll } from "../lib/search-indexer";
import { protectedProcedure, router } from "../trpc";

export const searchRouter = router({
	query: protectedProcedure
		.input(
			z.object({
				query: z.string(),
				limit: z.number().default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Fetch parent's schools via children
			const children = await ctx.prisma.child.findMany({
				where: {
					parentLinks: {
						some: {
							userId: ctx.user.id,
						},
					},
				},
				select: {
					schoolId: true,
				},
			});

			// Deduplicate school ids
			const schoolIds = Array.from(new Set(children.map((c) => c.schoolId)));

			if (schoolIds.length === 0) {
				return [];
			}

			// Search all schools in parallel
			const results = await Promise.all(schoolIds.map((id) => searchAll(input.query, id)));

			// Flatten and sort by score descending
			const flatResults = results.flat().sort((a, b) => b.score - a.score);

			return flatResults.slice(0, input.limit);
		}),
});
