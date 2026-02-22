import { logger } from "../lib/logger";
import { publicProcedure, router } from "../trpc";

export const dbInitRouter = router({
	initTables: publicProcedure.mutation(async ({ ctx }) => {
		try {
			logger.info("Creating invitations table");
			await ctx.prisma.$executeRawUnsafe(`
				CREATE TABLE IF NOT EXISTS invitations (
					id TEXT PRIMARY KEY,
					email TEXT NOT NULL,
					"schoolId" TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
					role TEXT NOT NULL DEFAULT 'TEACHER',
					token TEXT UNIQUE NOT NULL,
					"expiresAt" TIMESTAMP(3) NOT NULL,
					"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
					"acceptedAt" TIMESTAMP(3),
					CONSTRAINT "invitations_email_schoolId_key" UNIQUE (email, "schoolId")
				);
			`);
			return { success: true };
		} catch (e) {
			logger.error({ err: e }, "Failed to create table");
			throw e;
		}
	}),
});
