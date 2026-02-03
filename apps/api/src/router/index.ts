import { router } from "../trpc";
import { authRouter } from "./auth";
import { healthRouter } from "./health";
import { messagingRouter } from "./messaging";
import { paymentsRouter } from "./payments";
import { stripeRouter } from "./stripe";
import { userRouter } from "./user";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter,
	messaging: messagingRouter,
	payments: paymentsRouter,
	stripe: stripeRouter,
	user: userRouter,
});

export type AppRouter = typeof appRouter;
