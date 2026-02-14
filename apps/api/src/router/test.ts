import { z } from "zod";
import { publicProcedure, router } from "../trpc.js";
import {
	seedFixture,
	type FixtureName,
} from "../../../../packages/e2e/fixtures/factories.js";

if (process.env.NODE_ENV !== "test") {
	throw new Error(
		"Test router should not be imported outside of test environment",
	);
}

const fixtureNameSchema = z.enum([
	"parent-with-school",
	"staff-with-school",
	"staff-with-messages",
	"parent-with-payments",
]);

export const testRouter = router({
	seed: publicProcedure
		.input(
			z.object({
				fixture: fixtureNameSchema,
			}),
		)
		.mutation(async ({ input }) => {
			await seedFixture(input.fixture as FixtureName);
			return { ok: true };
		}),
});
