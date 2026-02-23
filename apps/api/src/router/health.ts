import { getRedisClient } from "../lib/redis";
import { publicProcedure, router } from "../trpc";

const startTime = Date.now();

async function checkDatabase(prisma: { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> }) {
	const start = Date.now();
	try {
		await prisma.$queryRaw`SELECT 1`;
		return { status: "up" as const, latencyMs: Date.now() - start };
	} catch (err) {
		return { status: "down" as const, latencyMs: Date.now() - start, error: (err as Error).message };
	}
}

async function checkRedis() {
	const start = Date.now();
	try {
		const client = getRedisClient();
		if (!client) {
			return { status: "down" as const, latencyMs: 0, error: "Not configured" };
		}
		await client.ping();
		return { status: "up" as const, latencyMs: Date.now() - start };
	} catch (err) {
		return { status: "down" as const, latencyMs: Date.now() - start, error: (err as Error).message };
	}
}

export const healthRouter = router({
	check: publicProcedure.query(async ({ ctx }) => {
		const [database, redis] = await Promise.all([
			checkDatabase(ctx.prisma),
			checkRedis(),
		]);

		const dependencies = { database, redis };

		let status: "healthy" | "degraded" | "unhealthy";
		if (database.status === "down") {
			status = "unhealthy";
		} else if (redis.status === "down") {
			status = "degraded";
		} else {
			status = "healthy";
		}

		return {
			status,
			uptime: Math.floor((Date.now() - startTime) / 1000),
			dependencies,
		};
	}),
});
