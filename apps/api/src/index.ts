import cors from "@fastify/cors";
import { prisma } from "@schoolconnect/db";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import { createContext } from "./context";
import { checkUndeliveredNotifications } from "./jobs/notification-fallback";
import { auth } from "./lib/auth";
import { appRouter } from "./router";
import { webhookRoutes } from "./routes/webhooks";

const server = Fastify({ logger: true });

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
				process.env.NODE_ENV === "development" ? "http://localhost:3000" : null,
				process.env.NODE_ENV === "development" ? "http://localhost:8081" : null,
			]
				.filter(Boolean)
				.flatMap((u) => (u?.includes(",") ? u.split(",") : [u]))
				.map((u) => u?.trim()) as string[];

			if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
				cb(null, true);
				return;
			}

			cb(new Error("Not allowed by CORS"), false);
		},
		credentials: true,
	};
}

async function main() {
	await server.register(rawBody, {
		field: "rawBody",
		global: false,
		encoding: false, // get it as Buffer
		runFirst: true,
		routes: ["/api/webhooks/stripe"],
	});

	await server.register(cors, getCorsOptions());

	await server.register(webhookRoutes);

	await server.register(fastifyTRPCPlugin, {
		prefix: "/trpc",
		trpcOptions: { router: appRouter, createContext },
	});

	// Register better-auth routes
	server.all("/api/auth/*", async (req, res) => {
		return toNodeHandler(auth)(req.raw, res.raw);
	});

	const rawPort = process.env.PORT || "4000";
	const port = Number.parseInt(rawPort, 10);

	if (Number.isNaN(port)) {
		server.log.error(`Invalid PORT: ${rawPort}`);
		process.exit(1);
	}

	await server.listen({ port, host: "0.0.0.0" });
	server.log.info(`API server running on port ${port}`);

	// Run every 5 minutes
	setInterval(
		() => {
			checkUndeliveredNotifications(prisma).catch(console.error);
		},
		5 * 60 * 1000,
	);
}

main().catch((err) => {
	server.log.error(err);
	process.exit(1);
});
