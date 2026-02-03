import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
	baseURL: "http://localhost:4000",
	disableDefaultStore: true,
	storage: {
		getItem: async (key: string) => SecureStore.getItemAsync(key),
		setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
		removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
	},
});
