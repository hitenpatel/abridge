import { router } from "../trpc";
import { healthRouter } from "./health";
import { authRouter } from "./auth"; // Import

export const appRouter = router({
  health: healthRouter,
  auth: authRouter, // Add
});

export type AppRouter = typeof appRouter;
