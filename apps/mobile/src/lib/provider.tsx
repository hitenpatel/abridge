import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import Constants from "expo-constants";
import { useState } from "react";
import superjson from "superjson";
import { authClient } from "./auth-client";
import { trpc } from "./trpc";

const getApiUrl = () => {
	const baseUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000";
	return `${baseUrl}/trpc`;
};

export const TRPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [queryClient] = useState(() => new QueryClient());
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: getApiUrl(),
					transformer: superjson,
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
