import { type StaffRole, prisma } from "@schoolconnect/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { sendPasswordResetEmail } from "../services/email";
import { logger } from "./logger";
import { invalidateStaffCache } from "./redis";

// Validate required environment variables at startup
if (!process.env.BETTER_AUTH_SECRET) {
	throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

if (process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_SECRET.length < 32) {
	throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long in production");
}

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	user: {
		modelName: "User",
	},
	session: {
		modelName: "Session",
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
	},
	account: {
		modelName: "Account",
	},
	verification: {
		modelName: "Verification",
	},
	plugins: [bearer()],
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		sendResetPassword: async ({ user, url }) => {
			void sendPasswordResetEmail({
				recipientEmail: user.email,
				recipientName: user.name,
				resetUrl: url,
			});
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					try {
						logger.info({ email: user.email }, "Creating user, checking invites");
						// Check for pending invitations for this email
						const invitations: { id: string; schoolId: string; role: StaffRole }[] =
							await prisma.$queryRaw`
								SELECT id, "schoolId", role FROM invitations
								WHERE email = ${user.email} AND "acceptedAt" IS NULL AND "expiresAt" > NOW()
							`;
						logger.info({ count: invitations.length }, "Found invitations");

						for (const invite of invitations) {
							await prisma.staffMember.create({
								data: {
									userId: user.id,
									schoolId: invite.schoolId,
									role: invite.role,
								},
							});
							logger.info({ userId: user.id, schoolId: invite.schoolId }, "Created staff member");

							// Invalidate staff cache for the new member
							await invalidateStaffCache(user.id, invite.schoolId);

							await prisma.$executeRaw`
								UPDATE invitations SET "acceptedAt" = NOW() WHERE id = ${invite.id}
							`;
						}
					} catch (error) {
						logger.error(
							{
								email: user.email,
								userId: user.id,
								error: error instanceof Error ? error.message : String(error),
							},
							"Failed to process invitations during signup",
						);
						// Don't re-throw - allow user creation to succeed even if
						// invitation processing fails. The invitation can be accepted
						// later via the accept endpoint.
					}
				},
			},
		},
	},
	trustedOrigins: [
		process.env.WEB_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : ""),
		process.env.MOBILE_APP_SCHEME ?? "schoolconnect://",
		...(process.env.EXPO_DEV_URL ? [process.env.EXPO_DEV_URL] : []),
	].filter(Boolean),
	advanced: {
		crossSubDomainCookies: { enabled: false },
		disableCSRFCheck: process.env.NODE_ENV !== "production",
		cookiePrefix: "schoolconnect",
		useSecureCookies: process.env.NODE_ENV === "production",
	},
});
