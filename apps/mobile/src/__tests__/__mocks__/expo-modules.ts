jest.mock("expo-secure-store", () => ({
	getItemAsync: jest.fn(),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
	setNotificationHandler: jest.fn(),
	requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
	getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "test-token" })),
}));

jest.mock("expo-constants", () => ({
	expoConfig: { extra: { apiUrl: "http://localhost:4000" } },
}));
