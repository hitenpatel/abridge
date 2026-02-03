import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { prisma } from "@schoolconnect/db";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  // TODO: Extract user from session/token in auth task
  return {
    prisma,
    req,
    res,
    user: null as null | { id: string; email: string },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
