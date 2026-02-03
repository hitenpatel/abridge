import { router } from "../trpc";
import { authRouter } from "./auth";
import { healthRouter } from "./health";
import { messagingRouter } from "./messaging";
import { userRouter } from "./user";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter,
	messaging: messagingRouter,
	user: userRouter,
});

export type AppRouter = typeof appRouter;
