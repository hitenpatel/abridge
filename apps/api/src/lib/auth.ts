import { prisma } from "@schoolconnect/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// Validate required environment variables at startup
if (!process.env.BETTER_AUTH_SECRET) {
	throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
	},
	trustedOrigins: [
		process.env.WEB_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : ""),
		process.env.MOBILE_APP_SCHEME ?? "schoolconnect://",
	].filter(Boolean),
});
