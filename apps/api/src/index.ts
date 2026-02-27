import { Sentry, initSentry } from "./lib/sentry";
initSentry();

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "@schoolconnect/db";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
// toNodeHandler doesn't work properly with Fastify, removed
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import { createContext } from "./context";
import { processWellbeingAlerts } from "./crons/wellbeing-alerts";
import { checkUndeliveredNotifications } from "./jobs/notification-fallback";
import { auth } from "./lib/auth";
import { logger } from "./lib/logger";
import { appRouter } from "./router";
import { pdfRoutes } from "./routes/pdf";
import { testSeedRoutes } from "./routes/test-seed";
import { webhookRoutes } from "./routes/webhooks";

const server = Fastify({
	logger: {
		level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
		...(process.env.NODE_ENV !== "production" && {
			transport: {
				target: "pino-pretty",
				options: { colorize: true },
			},
		}),
	},
});

// Add prisma to Fastify instance for use in routes
declare module "fastify" {
	interface FastifyInstance {
		prisma: typeof prisma;
	}
}
server.decorate("prisma", prisma);

function getCorsOptions() {
	return {
		origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
			// Allow requests with no origin (like mobile apps, curl)
			if (!origin) {
				cb(null, true);
				return;
			}

			const allowedOrigins = [
				process.env.WEB_URL,
				process.env.MOBILE_APP_SCHEME,
				process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null,
				process.env.NODE_ENV !== "production" ? "http://localhost:8081" : null,
			]
				.filter(Boolean)
				.flatMap((u) => (u?.includes(",") ? u.split(",") : [u]))
				.map((u) => u?.trim()) as string[];

			if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
				cb(null, true);
				return;
			}

			cb(new Error("Not allowed by CORS"), false);
		},
		credentials: true,
	};
}

async function main() {
	await server.register(cookie);

	await server.register(rawBody, {
		field: "rawBody",
		global: false,
		encoding: false, // get it as Buffer
		runFirst: true,
		routes: ["/api/webhooks/stripe"],
	});

	// Global rate limit: 100 req/min per IP
	await server.register(rateLimit, {
		max: 100,
		timeWindow: "1 minute",
	});

	await server.register(helmet, {
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
	});

	await server.register(cors, getCorsOptions());

	await server.register(webhookRoutes);

	await server.register(pdfRoutes);

	// Test-only seed endpoint - never expose in production
	if (process.env.NODE_ENV !== "production") {
		await server.register(testSeedRoutes);
	}

	await server.register(fastifyTRPCPlugin, {
		prefix: "/trpc",
		trpcOptions: { router: appRouter, createContext },
	});

	// Register better-auth routes with Fastify-compatible handler
	server.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		config: {
			rateLimit: {
				max: 5,
				timeWindow: "15 minutes",
			},
		},
		async handler(request, reply) {
			try {
				// Construct request URL
				const url = new URL(request.url, `http://${request.headers.host}`);

				// Convert Fastify headers to standard Headers object
				const headers = new Headers();
				for (const [key, value] of Object.entries(request.headers)) {
					if (value) {
						headers.append(key, Array.isArray(value) ? value.join(", ") : value);
					}
				}

				// Create Fetch API-compatible request
				const req = new Request(url.toString(), {
					method: request.method,
					headers,
					...(request.body ? { body: JSON.stringify(request.body) } : {}),
				});

				// Process authentication request
				const response = await auth.handler(req);

				// Forward response to client
				reply.status(response.status);
				response.headers.forEach((value, key) => reply.header(key, value));

				// Read the response body
				const responseText = await response.text();
				return reply.send(responseText || "");
			} catch (error) {
				server.log.error({ err: error }, "Authentication error");
				return reply.status(500).send({
					error: "Internal authentication error",
					code: "AUTH_FAILURE",
				});
			}
		},
	});

	const rawPort = process.env.PORT || "4000";
	const port = Number.parseInt(rawPort, 10);

	if (Number.isNaN(port)) {
		server.log.error(`Invalid PORT: ${rawPort}`);
		process.exit(1);
	}

	await server.listen({ port, host: "::" });
	server.log.info(`API server running on port ${port}`);

	// Run every 5 minutes
	setInterval(
		() => {
			checkUndeliveredNotifications(prisma).catch((err) => {
				Sentry.captureException(err);
				logger.error({ err }, "Notification fallback job failed");
			});
		},
		5 * 60 * 1000,
	);

	// Run wellbeing alert processing every 15 minutes
	setInterval(
		() => {
			processWellbeingAlerts(prisma).catch((err) => {
				Sentry.captureException(err);
				logger.error({ err }, "Wellbeing alert cron failed");
			});
		},
		15 * 60 * 1000,
	);
}

main().catch((err) => {
	Sentry.captureException(err);
	server.log.error(err);
	process.exit(1);
});
