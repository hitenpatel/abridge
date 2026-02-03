import { prisma } from "@schoolconnect/db";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	const user = session?.user ?? null;
	const staffMembers = user
		? await prisma.staffMember.findMany({
				where: { userId: user.id },
				select: { schoolId: true, role: true },
			})
		: [];

	return {
		prisma,
		req,
		res,
		user,
		session: session?.session ?? null,
		staffMembers,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
