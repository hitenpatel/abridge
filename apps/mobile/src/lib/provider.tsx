import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { authClient } from "./auth-client";
import { trpc } from "./trpc";

const getApiUrl = () => {
	// For development, use the local API
	if (__DEV__) {
		return "http://localhost:3000/trpc";
	}
	// For production, replace with your actual API URL
	return "https://your-api-domain.com/trpc";
};

export const TRPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			transformer: superjson,
			links: [
				httpBatchLink({
					url: getApiUrl(),
					async headers() {
						const session = await authClient.getSession();
						return {
							authorization: session?.data?.user ? `Bearer ${session.data.session.token}` : "",
						};
					},
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
};
