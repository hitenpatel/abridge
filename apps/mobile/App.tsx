import "./global.css";
import {
	PlusJakartaSans_400Regular,
	PlusJakartaSans_500Medium,
	PlusJakartaSans_600SemiBold,
	PlusJakartaSans_700Bold,
	PlusJakartaSans_800ExtraBold,
	useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import {
	type NativeStackNavigationProp,
	createNativeStackNavigator,
} from "@react-navigation/native-stack";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from "react-native";
import { FloatingTabBar } from "./src/components/FloatingTabBar";
import { authClient } from "./src/lib/auth-client";
import { hapticLight } from "./src/lib/haptics";
import { TRPCProvider } from "./src/lib/provider";
import { ThemeProvider } from "./src/lib/theme-provider";
import { trpc } from "./src/lib/trpc";
import { useTheme } from "./src/lib/use-theme";
import { AttendanceScreen } from "./src/screens/AttendanceScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { ComposeMessageScreen } from "./src/screens/ComposeMessageScreen";
import { FormDetailScreen } from "./src/screens/FormDetailScreen";
import { FormsScreen } from "./src/screens/FormsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MessageDetailScreen } from "./src/screens/MessageDetailScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { ParentHomeScreen } from "./src/screens/ParentHomeScreen";
import { PaymentHistoryScreen } from "./src/screens/PaymentHistoryScreen";
import { PaymentSuccessScreen } from "./src/screens/PaymentSuccessScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { StaffAttendanceScreen } from "./src/screens/StaffAttendanceScreen";
import { StaffHomeScreen } from "./src/screens/StaffHomeScreen";
import { StaffManagementScreen } from "./src/screens/StaffManagementScreen";
import { StaffPaymentsScreen } from "./src/screens/StaffPaymentsScreen";
import { StudentProfileScreen } from "./src/screens/StudentProfileScreen";

// Message item type matching the API response
export interface MessageItem {
	id: string;
	subject: string;
	body: string;
	category: string;
	createdAt: Date;
	schoolName: string;
	schoolLogo: string | null;
	isRead: boolean;
	readAt?: Date;
}

export type RootStackParamList = {
	Login: undefined;
	Main: undefined;
	MessageDetail: { message: MessageItem };
	ComposeMessage: undefined;
	PaymentSuccess: { amount: number; transactionId: string; itemName: string };
	PaymentHistory: undefined;
	Calendar: undefined;
	Forms: undefined;
	FormDetail: { formId: string; childId: string };
	StudentProfile: { childId: string };
	Search: undefined;
	StaffManagement: undefined;
};

export type ParentTabParamList = {
	ParentHome: undefined;
	Messages: undefined;
	Attendance: undefined;
	Payments: undefined;
};

export type StaffTabParamList = {
	StaffHome: undefined;
	StaffMessages: undefined;
	StaffAttendance: undefined;
	StaffPayments: undefined;
};

// Configure notification handler
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

const Stack = createNativeStackNavigator<RootStackParamList>();
const ParentTab = createBottomTabNavigator<ParentTabParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();

function HeaderRight() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const logout = useLogout();

	return (
		<View className="flex-row items-center mr-4 gap-3">
			<Pressable
				onPress={() => {
					hapticLight();
					navigation.navigate("Search");
				}}
				className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
			>
				<MaterialIcons name="search" size={20} color="#96867f" />
			</Pressable>
			<Pressable
				onPress={logout}
				className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
			>
				<MaterialIcons name="logout" size={18} color="#96867f" />
			</Pressable>
		</View>
	);
}

function ParentTabNavigator() {
	return (
		<ParentTab.Navigator
			tabBar={(props) => <FloatingTabBar {...props} />}
			screenOptions={{ headerShown: false }}
		>
			<ParentTab.Screen
				name="ParentHome"
				component={ParentHomeScreen}
				options={{ tabBarLabel: { icon: "home", label: "Home" } as never }}
			/>
			<ParentTab.Screen
				name="Messages"
				component={MessagesScreen}
				options={{ tabBarLabel: { icon: "chat-bubble-outline", label: "Messages" } as never }}
			/>
			<ParentTab.Screen
				name="Attendance"
				component={AttendanceScreen}
				options={{ tabBarLabel: { icon: "check-circle-outline", label: "Attendance" } as never }}
			/>
			<ParentTab.Screen
				name="Payments"
				component={PaymentsScreen}
				options={{ tabBarLabel: { icon: "account-balance-wallet", label: "Payments" } as never }}
			/>
		</ParentTab.Navigator>
	);
}

function StaffTabNavigator() {
	return (
		<StaffTab.Navigator
			tabBar={(props) => <FloatingTabBar {...props} />}
			screenOptions={{ headerShown: false }}
		>
			<StaffTab.Screen
				name="StaffHome"
				component={StaffHomeScreen}
				options={{ tabBarLabel: { icon: "dashboard", label: "Home" } as never }}
			/>
			<StaffTab.Screen
				name="StaffMessages"
				component={MessagesScreen}
				options={{ tabBarLabel: { icon: "chat-bubble-outline", label: "Messages" } as never }}
			/>
			<StaffTab.Screen
				name="StaffAttendance"
				component={StaffAttendanceScreen}
				options={{ tabBarLabel: { icon: "check-circle-outline", label: "Attendance" } as never }}
			/>
			<StaffTab.Screen
				name="StaffPayments"
				component={StaffPaymentsScreen}
				options={{ tabBarLabel: { icon: "account-balance-wallet", label: "Payments" } as never }}
			/>
		</StaffTab.Navigator>
	);
}

function MainNavigator() {
	const { data: sessionData } = trpc.auth.getSession.useQuery();
	const isStaff = !!sessionData?.staffRole;

	if (isStaff) {
		return <StaffTabNavigator />;
	}
	return <ParentTabNavigator />;
}

function AuthenticatedApp() {
	const updatePushToken = trpc.user.updatePushToken.useMutation();
	const { isDark } = useTheme();

	React.useEffect(() => {
		const registerForPushNotifications = async () => {
			try {
				const { status } = await Notifications.requestPermissionsAsync();
				if (status !== "granted") {
					console.log("Push notification permissions denied");
					return;
				}

				const projectId = Constants.expoConfig?.extra?.eas?.projectId;
				if (!projectId) {
					console.log("Skipping push token registration (no EAS projectId)");
					return;
				}
				const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
				if (tokenData.data) {
					await updatePushToken.mutateAsync({ pushToken: tokenData.data });
					console.log("Push token registered successfully");
				}
			} catch (error) {
				console.error("Failed to register push token:", error);
			}
		};

		registerForPushNotifications();
	}, [updatePushToken]);

	return (
		<NavigationContainer>
			<Stack.Navigator
				screenOptions={{
					headerStyle: { backgroundColor: isDark ? "#33221b" : "#f8f6f5" },
					headerTintColor: isDark ? "#E5E7EB" : "#5c4d47",
					headerTitleStyle: { fontWeight: "600" },
					headerShadowVisible: false,
				}}
			>
				<Stack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
				<Stack.Screen
					name="MessageDetail"
					component={MessageDetailScreen}
					options={({ route }) => ({
						title:
							route.params.message.subject.length > 25
								? `${route.params.message.subject.substring(0, 25)}...`
								: route.params.message.subject,
						headerTitleStyle: { fontWeight: "600", fontSize: 16 },
					})}
				/>
				<Stack.Screen
					name="ComposeMessage"
					component={ComposeMessageScreen}
					options={{ title: "New Update", presentation: "modal" }}
				/>
				<Stack.Screen
					name="PaymentSuccess"
					component={PaymentSuccessScreen}
					options={{ headerShown: false, presentation: "transparentModal" }}
				/>
				<Stack.Screen
					name="PaymentHistory"
					component={PaymentHistoryScreen}
					options={{ title: "Payment History" }}
				/>
				<Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: "Calendar" }} />
				<Stack.Screen name="Forms" component={FormsScreen} options={{ title: "Forms & Consent" }} />
				<Stack.Screen
					name="FormDetail"
					component={FormDetailScreen}
					options={{ title: "Complete Form" }}
				/>
				<Stack.Screen
					name="StudentProfile"
					component={StudentProfileScreen}
					options={{ title: "Student Profile" }}
				/>
				<Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search" }} />
				<Stack.Screen
					name="StaffManagement"
					component={StaffManagementScreen}
					options={{ title: "Staff Management" }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
}

const LogoutContext = React.createContext<() => void>(() => {});
export const useLogout = () => React.useContext(LogoutContext);

function AppContent() {
	const { data: session, isPending } = authClient.useSession();
	const [authState, setAuthState] = React.useState<"auto" | "logged-out">("auto");
	const { isDark, colorScheme } = useTheme();

	const handleLogout = React.useCallback(async () => {
		try {
			await authClient.signOut();
		} catch (e) {
			// Clear local state even if API call fails
		}
		setAuthState("logged-out");
	}, []);

	const handleLoginSuccess = React.useCallback(() => {
		setAuthState("auto");
	}, []);

	if (isPending && authState === "auto") {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
				<Text className="mt-3 text-base text-text-muted font-sans">Loading...</Text>
			</View>
		);
	}

	if (!session || authState === "logged-out") {
		return (
			<SafeAreaView className={`flex-1 ${colorScheme}`}>
				<LoginScreen onLoginSuccess={handleLoginSuccess} />
				<StatusBar style="auto" />
			</SafeAreaView>
		);
	}

	return (
		<LogoutContext.Provider value={handleLogout}>
			<View className={`flex-1 ${colorScheme}`}>
				<AuthenticatedApp />
				<StatusBar style={isDark ? "light" : "dark"} />
			</View>
		</LogoutContext.Provider>
	);
}

export default function App() {
	const [fontsLoaded] = useFonts({
		PlusJakartaSans_400Regular,
		PlusJakartaSans_500Medium,
		PlusJakartaSans_600SemiBold,
		PlusJakartaSans_700Bold,
		PlusJakartaSans_800ExtraBold,
		...MaterialIcons.font,
	});

	if (!fontsLoaded) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<TRPCProvider>
			<ThemeProvider>
				<AppContent />
			</ThemeProvider>
		</TRPCProvider>
	);
}
