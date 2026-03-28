import { router } from "../trpc";
import { achievementRouter } from "./achievement";
import { analyticsRouter } from "./analytics";
import { attendanceRouter } from "./attendance";
import { authRouter } from "./auth";
import { calendarRouter } from "./calendar";
import { chatRouter } from "./chat";
import { classPostRouter } from "./class-post";
import { clubBookingRouter } from "./club-booking";
import { communityRouter } from "./community";
import { dashboardRouter } from "./dashboard";
import { dbInitRouter } from "./db-init";
import { emergencyRouter } from "./emergency";
import { formsRouter } from "./forms";
import { galleryRouter } from "./gallery";
import { healthRouter } from "./health";
import { homeworkRouter } from "./homework";
import { invitationRouter } from "./invitation";
import { mealBookingRouter } from "./meal-booking";
import { mediaRouter } from "./media";
import { messagingRouter } from "./messaging";
import { misRouter } from "./mis";
import { notificationRouter } from "./notification";
import { parentsEveningRouter } from "./parents-evening";
import { paymentsRouter } from "./payments";
import { progressSummaryRouter } from "./progress-summary";
import { queueRouter } from "./queue";
import { readingDiaryRouter } from "./reading-diary";
import { reportCardRouter } from "./report-card";
import { searchRouter } from "./search";
import { settingsRouter } from "./settings";
import { setupRouter } from "./setup";
import { staffRouter } from "./staff";
import { stripeRouter } from "./stripe";
import { studentRouter } from "./student";
import { timetableRouter } from "./timetable";
import { translationRouter } from "./translation";
import { userRouter } from "./user";
import { visitorRouter } from "./visitor";
import { wellbeingRouter } from "./wellbeing";

export const appRouter = router({
	health: healthRouter,
	auth: authRouter,
	achievement: achievementRouter,
	analytics: analyticsRouter,
	calendar: calendarRouter,
	chat: chatRouter,
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
	gallery: galleryRouter,
	invitation: invitationRouter,
	setup: setupRouter,
	staff: staffRouter,
	student: studentRouter,
	translation: translationRouter,
	parentsEvening: parentsEveningRouter,
	wellbeing: wellbeingRouter,
	dbInit: dbInitRouter,
	mealBooking: mealBookingRouter,
	clubBooking: clubBookingRouter,
	community: communityRouter,
	homework: homeworkRouter,
	media: mediaRouter,
	readingDiary: readingDiaryRouter,
	timetable: timetableRouter,
	visitor: visitorRouter,
	mis: misRouter,
	reportCard: reportCardRouter,
	progressSummary: progressSummaryRouter,
	search: searchRouter,
	notification: notificationRouter,
	queue: queueRouter,
});

export type AppRouter = typeof appRouter;
