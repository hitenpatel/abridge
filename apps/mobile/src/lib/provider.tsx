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
						const token = session?.data?.session?.token;
						console.log("[tRPC] getSession result:", JSON.stringify({
							hasUser: !!session?.data?.user,
							hasToken: !!token,
							userId: session?.data?.user?.id?.slice(0, 8),
						}));
						return {
							authorization: token ? `Bearer ${token}` : "",
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
