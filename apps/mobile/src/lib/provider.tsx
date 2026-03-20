import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import Constants from "expo-constants";
import { useState } from "react";
import { AppState } from "react-native";
import superjson from "superjson";
import { authClient } from "./auth-client";
import { trpc } from "./trpc";

const getApiUrl = () => {
	const baseUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000";
	return `${baseUrl}/trpc`;
};

// Deduplicate concurrent getSession() calls and cache the result briefly.
// Without this, every tRPC request fires a separate HTTP call to /api/auth/get-session,
// overwhelming the API server when multiple queries fire at once after login.
let _sessionPromise: Promise<string> | null = null;
let _cachedToken: string | null = null;
let _cacheExpiry = 0;

async function getAuthToken(): Promise<string> {
	// Return cached token if still valid
	if (_cachedToken && Date.now() < _cacheExpiry) {
		return _cachedToken;
	}
	// Deduplicate: reuse in-flight promise if one exists
	if (_sessionPromise) return _sessionPromise;

	_sessionPromise = (async () => {
		try {
			const session = await authClient.getSession();
			const token = session?.data?.session?.token ?? "";
			if (token) {
				_cachedToken = token;
				_cacheExpiry = Date.now() + 30_000; // cache for 30s
			}
			return token;
		} catch (e) {
			console.error("[tRPC] getSession error:", e);
			return "";
		} finally {
			_sessionPromise = null;
		}
	})();

	return _sessionPromise;
}

// Allow clearing the token cache on logout
export function clearAuthTokenCache() {
	_cachedToken = null;
	_cacheExpiry = 0;
	_sessionPromise = null;
}

export const TRPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						networkMode: "offlineFirst",
						retry: 2,
					},
					mutations: {
						networkMode: "offlineFirst",
					},
				},
			}),
	);
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: getApiUrl(),
					transformer: superjson,
					async headers() {
						const token = await getAuthToken();
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
