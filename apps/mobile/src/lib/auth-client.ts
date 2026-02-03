import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000";

export const authClient = createAuthClient({
	baseURL: API_URL,
	disableDefaultStore: true,
	storage: {
		getItem: async (key: string) => SecureStore.getItemAsync(key),
		setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
		removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
	},
});
