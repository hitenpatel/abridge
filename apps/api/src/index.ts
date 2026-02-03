import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import { createContext } from "./context";
import { auth } from "./lib/auth";
import { appRouter } from "./router";
import { webhookRoutes } from "./routes/webhooks";

const server = Fastify({ logger: true });

function getAllowedOrigins(): string[] {
	if (process.env.NODE_ENV === "development") {
		return ["http://localhost:3000", "http://localhost:8081"];
	}

	const webUrl = process.env.WEB_URL;
	if (!webUrl) {
		throw new Error("WEB_URL environment variable is required in production");
	}

	// Support comma-separated origins for multiple frontend domains
	return webUrl.split(",").map((u) => u.trim());
}

async function main() {
	await server.register(rawBody, {
		field: "rawBody",
		global: false,
		encoding: false, // get it as Buffer
		runFirst: true,
		routes: ["/api/webhooks/stripe"],
	});

	await server.register(cors, {
		origin: getAllowedOrigins(),
		credentials: true,
	});

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
}

main().catch((err) => {
	server.log.error(err);
	process.exit(1);
});
