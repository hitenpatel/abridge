import { prisma } from "@schoolconnect/db";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";
import { Sentry } from "./lib/sentry";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	if (session?.user) {
		Sentry.setUser({ id: session.user.id, email: session.user.email });
	} else {
		Sentry.setUser(null);
	}

	return {
		prisma,
		req,
		res,
		requestId: req.id,
		user: session?.user ?? null,
		session: session?.session ?? null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
