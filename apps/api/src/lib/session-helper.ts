import type { FastifyRequest } from "fastify";
import { auth } from "./auth";
import { logger } from "./logger";

/**
 * Get session from Fastify request
 * Extracts the session token from cookies and validates it
 */
export async function getSessionFromRequest(request: FastifyRequest) {
	try {
		// Get better-auth session token from cookies
		const sessionToken =
			request.cookies?.["better-auth.session_token"] ||
			request.headers.authorization?.replace("Bearer ", "");

		if (!sessionToken) {
			return null;
		}

		// Validate session using better-auth
		const session = await auth.api.getSession({
			headers: {
				cookie: `better-auth.session_token=${sessionToken}`,
			},
		});

		return session;
	} catch (error) {
		logger.error({ err: error }, "Session validation error");
		return null;
	}
}
