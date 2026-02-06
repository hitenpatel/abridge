import { router } from "../trpc";
import { attendanceRouter } from "./attendance";
import { authRouter } from "./auth";
import { calendarRouter } from "./calendar";
import { dashboardRouter } from "./dashboard";
import { dbInitRouter } from "./db-init";
import { formsRouter } from "./forms";
import { healthRouter } from "./health";
import { invitationRouter } from "./invitation";
import { messagingRouter } from "./messaging";
import { paymentsRouter } from "./payments";
import { setupRouter } from "./setup";
import { staffRouter } from "./staff";
import { stripeRouter } from "./stripe";
import { userRouter } from "./user";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter,
	calendar: calendarRouter,
	dashboard: dashboardRouter,
	messaging: messagingRouter,
	payments: paymentsRouter,
	stripe: stripeRouter,
	user: userRouter,
	attendance: attendanceRouter,
	forms: formsRouter,
	invitation: invitationRouter,
	setup: setupRouter,
	staff: staffRouter,
	dbInit: dbInitRouter,
});

export type AppRouter = typeof appRouter;
