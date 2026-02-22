import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
	const dsn = process.env.SENTRY_DSN;
	if (!dsn) {
		return;
	}

	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || "development",
		integrations: [nodeProfilingIntegration()],
		tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
		profilesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
		beforeSend(event) {
			if (event.exception?.values?.[0]?.type === "TRPCError") {
				const message = event.exception.values[0].value || "";
				if (
					message.includes("UNAUTHORIZED") ||
					message.includes("NOT_FOUND") ||
					message.includes("BAD_REQUEST") ||
					message.includes("FORBIDDEN")
				) {
					return null;
				}
			}
			return event;
		},
	});
}

export { Sentry };
