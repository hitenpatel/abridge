import { prisma } from "@schoolconnect/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

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
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
	},
	trustedOrigins: [
		process.env.WEB_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : ""),
		process.env.MOBILE_APP_SCHEME ?? "schoolconnect://",
	].filter(Boolean),
});
