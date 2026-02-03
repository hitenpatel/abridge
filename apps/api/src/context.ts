import { prisma } from "@schoolconnect/db";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	return {
		prisma,
		req,
		res,
		user: session?.user ?? null,
		session: session?.session ?? null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
