import { router } from "../trpc";
import { authRouter } from "./auth"; // Import
import { healthRouter } from "./health";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter, // Add
});

export type AppRouter = typeof appRouter;
