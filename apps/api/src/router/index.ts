import { router } from "../trpc";
import { analyticsRouter } from "./analytics";
import { attendanceRouter } from "./attendance";
import { authRouter } from "./auth";
import { calendarRouter } from "./calendar";
import { classPostRouter } from "./class-post";
import { communityRouter } from "./community";
import { dashboardRouter } from "./dashboard";
import { dbInitRouter } from "./db-init";
import { emergencyRouter } from "./emergency";
import { formsRouter } from "./forms";
import { healthRouter } from "./health";
import { invitationRouter } from "./invitation";
import { mealBookingRouter } from "./meal-booking";
import { messagingRouter } from "./messaging";
import { parentsEveningRouter } from "./parents-evening";
import { paymentsRouter } from "./payments";
import { reportCardRouter } from "./report-card";
import { settingsRouter } from "./settings";
import { setupRouter } from "./setup";
import { staffRouter } from "./staff";
import { stripeRouter } from "./stripe";
import { translationRouter } from "./translation";
import { userRouter } from "./user";
import { wellbeingRouter } from "./wellbeing";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter,
	analytics: analyticsRouter,
	calendar: calendarRouter,
	classPost: classPostRouter,
	dashboard: dashboardRouter,
	emergency: emergencyRouter,
	messaging: messagingRouter,
	payments: paymentsRouter,
	stripe: stripeRouter,
	settings: settingsRouter,
	user: userRouter,
	attendance: attendanceRouter,
	forms: formsRouter,
	invitation: invitationRouter,
	setup: setupRouter,
	staff: staffRouter,
	translation: translationRouter,
	parentsEvening: parentsEveningRouter,
	wellbeing: wellbeingRouter,
	dbInit: dbInitRouter,
	mealBooking: mealBookingRouter,
	community: communityRouter,
	reportCard: reportCardRouter,
});

export type AppRouter = typeof appRouter;
