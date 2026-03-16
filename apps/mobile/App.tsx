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
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import { FloatingTabBar } from "./src/components/FloatingTabBar";
import { authClient } from "./src/lib/auth-client";
import { TRPCProvider, clearAuthTokenCache } from "./src/lib/provider";
import { ThemeProvider } from "./src/lib/theme-provider";
import { trpc } from "./src/lib/trpc";
import { useTheme } from "./src/lib/use-theme";
import { AttendanceScreen } from "./src/screens/AttendanceScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { ComposeMessageScreen } from "./src/screens/ComposeMessageScreen";
import { ComposePostScreen } from "./src/screens/ComposePostScreen";
import { FormDetailScreen } from "./src/screens/FormDetailScreen";
import { FormsScreen } from "./src/screens/FormsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MessageDetailScreen } from "./src/screens/MessageDetailScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { ParentHomeScreen } from "./src/screens/ParentHomeScreen";
import { PaymentHistoryScreen } from "./src/screens/PaymentHistoryScreen";
import { PaymentSuccessScreen } from "./src/screens/PaymentSuccessScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { PostDetailScreen } from "./src/screens/PostDetailScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { StaffAttendanceScreen } from "./src/screens/StaffAttendanceScreen";
import { StaffHomeScreen } from "./src/screens/StaffHomeScreen";
import { StaffManagementScreen } from "./src/screens/StaffManagementScreen";
import { StaffPaymentsScreen } from "./src/screens/StaffPaymentsScreen";
import { StudentProfileScreen } from "./src/screens/StudentProfileScreen";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { WellbeingScreen } from "./src/screens/WellbeingScreen";
import { ProgressScreen } from "./src/screens/ProgressScreen";
import { ChatScreen } from "./src/screens/ChatScreen";

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
	Settings: undefined;
	StaffManagement: undefined;
	ComposePost: undefined;
	PostDetail: { postId: string };
	Wellbeing: { childId: string };
	Achievements: undefined;
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

const defaultToggles = {
	messagingEnabled: true,
	paymentsEnabled: true,
	attendanceEnabled: true,
	calendarEnabled: true,
	formsEnabled: true,
};

function useStaffFeatureToggles(schoolId: string | null | undefined) {
	const { data } = trpc.settings.getFeatureToggles.useQuery(
		{ schoolId: schoolId as string },
		{ enabled: !!schoolId },
	);
	return { ...defaultToggles, ...data };
}

function useParentFeatureToggles() {
	const { data } = trpc.settings.getFeatureTogglesForParent.useQuery();
	return { ...defaultToggles, ...data };
}

function ParentTabNavigator() {
	const features = useParentFeatureToggles();
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
			{features.messagingEnabled && (
				<ParentTab.Screen
					name="Messages"
					component={MessagesScreen}
					options={{ tabBarLabel: { icon: "chat-bubble-outline", label: "Messages" } as never }}
				/>
			)}
			{features.attendanceEnabled && (
				<ParentTab.Screen
					name="Attendance"
					component={AttendanceScreen}
					options={{ tabBarLabel: { icon: "check-circle-outline", label: "Attendance" } as never }}
				/>
			)}
			{features.paymentsEnabled && (
				<ParentTab.Screen
					name="Payments"
					component={PaymentsScreen}
					options={{ tabBarLabel: { icon: "account-balance-wallet", label: "Payments" } as never }}
				/>
			)}
		</ParentTab.Navigator>
	);
}

function StaffTabNavigator({ schoolId }: { schoolId: string | null | undefined }) {
	const features = useStaffFeatureToggles(schoolId);
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
			{features.messagingEnabled && (
				<StaffTab.Screen
					name="StaffMessages"
					component={MessagesScreen}
					options={{ tabBarLabel: { icon: "chat-bubble-outline", label: "Messages" } as never }}
				/>
			)}
			{features.attendanceEnabled && (
				<StaffTab.Screen
					name="StaffAttendance"
					component={StaffAttendanceScreen}
					options={{ tabBarLabel: { icon: "check-circle-outline", label: "Attendance" } as never }}
				/>
			)}
			{features.paymentsEnabled && (
				<StaffTab.Screen
					name="StaffPayments"
					component={StaffPaymentsScreen}
					options={{ tabBarLabel: { icon: "account-balance-wallet", label: "Payments" } as never }}
				/>
			)}
		</StaffTab.Navigator>
	);
}

function MainNavigator() {
	const { data: sessionData } = trpc.auth.getSession.useQuery();
	const isStaff = !!sessionData?.staffRole;
	const schoolId = sessionData?.schoolId;

	if (isStaff) {
		return <StaffTabNavigator schoolId={schoolId} />;
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
				<Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
				<Stack.Screen
					name="StaffManagement"
					component={StaffManagementScreen}
					options={{ title: "Staff Management" }}
				/>
				<Stack.Screen
					name="ComposePost"
					component={ComposePostScreen}
					options={{ title: "Post to Class", presentation: "modal" }}
				/>
				<Stack.Screen
					name="PostDetail"
					component={PostDetailScreen}
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					name="Wellbeing"
					component={WellbeingScreen}
					options={{ title: "Wellbeing" }}
				/>
				<Stack.Screen
					name="Achievements"
					component={AchievementsScreen}
					options={{ title: "Achievements" }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
}

const LogoutContext = React.createContext<() => void>(() => {});
export const useLogout = () => React.useContext(LogoutContext);

function AppContent() {
	const { data: session, isPending } = authClient.useSession();
	const [authState, setAuthState] = React.useState<
		"checking" | "authenticated" | "unauthenticated"
	>("checking");
	const { isDark, colorScheme } = useTheme();
	const utils = trpc.useUtils();

	// Sync useSession state into local authState
	React.useEffect(() => {
		if (isPending) return;
		if (session) {
			setAuthState("authenticated");
		} else if (authState === "checking") {
			setAuthState("unauthenticated");
		}
	}, [session, isPending, authState]);

	const handleLogout = React.useCallback(async () => {
		clearAuthTokenCache();
		try {
			await authClient.signOut();
		} catch (e) {
			// Clear local state even if API call fails
		}
		await utils.invalidate();
		setAuthState("unauthenticated");
	}, [utils]);

	const handleLoginSuccess = React.useCallback(async () => {
		// Invalidate any stale tRPC cache from before login
		await utils.invalidate();
		// Directly transition to authenticated — don't wait for useSession
		// (better-auth's useSession has known reactivity issues)
		setAuthState("authenticated");
	}, [utils]);

	if (authState === "checking") {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
				<Text className="mt-3 text-base text-text-muted font-sans">Loading...</Text>
			</View>
		);
	}

	if (authState === "unauthenticated") {
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
