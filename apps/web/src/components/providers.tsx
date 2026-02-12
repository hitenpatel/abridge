"use client";
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type React from "react";
import { useState } from "react";
import { Toaster } from "sonner";
import superjson from "superjson";

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/trpc`,
					async headers() {
						return {};
					},
					fetch(url, options) {
						return fetch(url, {
							...options,
							credentials: "include",
						});
					},
					transformer: superjson,
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				{children}
				<Toaster richColors position="top-right" />
			</QueryClientProvider>
		</trpc.Provider>
	);
}
