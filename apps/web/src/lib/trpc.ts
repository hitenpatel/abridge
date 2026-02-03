import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@schoolconnect/api/router";

export const trpc = createTRPCReact<AppRouter>();
