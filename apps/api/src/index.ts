import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { toNodeHandler } from "better-auth/node";
import Fastify from "fastify";
import { createContext } from "./context";
import { auth } from "./lib/auth";
import { appRouter } from "./router";

const server = Fastify({ logger: true });

async function main() {
	await server.register(cors, {
		origin:
			process.env.WEB_URL ||
			(process.env.NODE_ENV === "development" ? "http://localhost:3000" : false),
		credentials: true,
	});

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
	console.log(`API server running on port ${port}`);
}

main().catch((err) => {
	server.log.error(err);
	process.exit(1);
});
