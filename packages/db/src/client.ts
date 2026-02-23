import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
const poolSize = process.env.DATABASE_POOL_SIZE;

// Append connection_limit to the URL if specified
const datasourceUrl =
	poolSize && databaseUrl && !databaseUrl.includes("connection_limit")
		? `${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}connection_limit=${poolSize}`
		: undefined;

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
		...(datasourceUrl ? { datasourceUrl } : {}),
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
