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

jest.mock("@expo/vector-icons", () => ({
	MaterialIcons: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
	SafeAreaProvider: (props: any) => props.children,
	SafeAreaView: (props: any) => props.children,
}));

jest.mock("@react-navigation/native", () => ({
	useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
	useRoute: () => ({ params: {} }),
	useFocusEffect: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
	impactAsync: jest.fn(),
	ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

jest.mock("expo-clipboard", () => ({
	setStringAsync: jest.fn(),
}));
