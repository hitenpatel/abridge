import "./global.css";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import {
	type NativeStackNavigationProp,
	createNativeStackNavigator,
} from "@react-navigation/native-stack";
import {
	Poppins_400Regular,
	Poppins_500Medium,
	Poppins_600SemiBold,
	Poppins_700Bold,
	useFonts,
} from "@expo-google-fonts/poppins";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import {
	Calendar,
	ClipboardCheck,
	CreditCard as CreditCardIcon,
	Home,
	MessageSquare,
	Search,
} from "lucide-react-native";
import React from "react";
import {
	ActivityIndicator,
	SafeAreaView,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { authClient } from "./src/lib/auth-client";
import { hapticLight } from "./src/lib/haptics";
import { TRPCProvider } from "./src/lib/provider";
import { ThemeProvider } from "./src/lib/theme-provider";
import { useTheme } from "./src/lib/use-theme";
import { trpc } from "./src/lib/trpc";
import { AttendanceScreen } from "./src/screens/AttendanceScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MessageDetailScreen } from "./src/screens/MessageDetailScreen";
import { MessagesScreen } from "./src/screens/MessagesScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { SearchScreen } from "./src/screens/SearchScreen";

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
	Main: undefined;
	MessageDetail: { message: MessageItem };
	Search: undefined;
};

export type TabParamList = {
	Dashboard: undefined;
	Messages: undefined;
	Calendar: undefined;
	Payments: undefined;
	Attendance: undefined;
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
const Tab = createBottomTabNavigator<TabParamList>();

function HeaderRight() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const { isDark } = useTheme();
	const color = isDark ? "#E5E7EB" : "#2D3748";

	return (
		<View className="flex-row items-center mr-4">
			<TouchableOpacity
				onPress={() => {
					navigation.navigate("Search");
				}}
				className="mr-4"
			>
				<Search size={20} color={color} />
			</TouchableOpacity>
			<TouchableOpacity
				onPress={async () => {
					await authClient.signOut();
				}}
			>
				<Text className="text-foreground text-sm font-medium">Logout</Text>
			</TouchableOpacity>
		</View>
	);
}

function TabNavigator() {
	const { isDark } = useTheme();
	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" },
				headerTintColor: isDark ? "#E5E7EB" : "#2D3748",
				headerTitleStyle: { fontWeight: "600" },
				tabBarStyle: { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" },
				tabBarActiveTintColor: "#FF7D45",
				tabBarInactiveTintColor: "#6B7280",
				tabBarButton: (props) => (
					<TouchableOpacity
						{...props}
						onPress={(e) => {
							hapticLight();
							props.onPress?.(e);
						}}
					/>
				),
			}}
		>
			<Tab.Screen
				name="Dashboard"
				component={DashboardScreen}
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
					headerRight: () => <HeaderRight />,
				}}
			/>
			<Tab.Screen
				name="Messages"
				component={MessagesScreen}
				options={{
					title: "Inbox",
					tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
					headerRight: () => <HeaderRight />,
				}}
			/>
			<Tab.Screen
				name="Calendar"
				component={CalendarScreen}
				options={{
					title: "Calendar",
					tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
					headerRight: () => <HeaderRight />,
				}}
			/>
			<Tab.Screen
				name="Attendance"
				component={AttendanceScreen}
				options={{
					title: "Attendance",
					tabBarIcon: ({ color, size }) => <ClipboardCheck size={size} color={color} />,
					headerRight: () => <HeaderRight />,
				}}
			/>
			<Tab.Screen
				name="Payments"
				component={PaymentsScreen}
				options={{
					title: "Payments",
					tabBarIcon: ({ color, size }) => <CreditCardIcon size={size} color={color} />,
					headerRight: () => <HeaderRight />,
				}}
			/>
		</Tab.Navigator>
	);
}

function AuthenticatedApp() {
	const updatePushToken = trpc.user.updatePushToken.useMutation();
	const { isDark } = useTheme();

	React.useEffect(() => {
		const registerForPushNotifications = async () => {
			try {
				// Request permissions
				const { status } = await Notifications.requestPermissionsAsync();
				if (status !== "granted") {
					console.log("Push notification permissions denied");
					return;
				}

				// Get push token
				const tokenData = await Notifications.getExpoPushTokenAsync();
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
					headerStyle: { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" },
					headerTintColor: isDark ? "#E5E7EB" : "#2D3748",
					headerTitleStyle: { fontWeight: "600" },
				}}
			>
				<Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
				<Stack.Screen
					name="MessageDetail"
					component={MessageDetailScreen}
					options={({ route }) => ({
						title:
							route.params.message.subject.length > 25
								? `${route.params.message.subject.substring(0, 25)}...`
								: route.params.message.subject,
						headerTitleStyle: {
							fontWeight: "600",
							fontSize: 16,
						},
					})}
				/>
				<Stack.Screen
					name="Search"
					component={SearchScreen}
					options={{
						title: "Search",
					}}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
}

function AppContent() {
	const { data: session, isPending } = authClient.useSession();
	const { isDark, colorScheme } = useTheme();

	if (isPending) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#FF7D45" />
				<Text className="mt-3 text-base text-muted-foreground font-sans">Loading...</Text>
			</View>
		);
	}

	if (!session) {
		return (
			<SafeAreaView className={`flex-1 ${colorScheme}`}>
				<LoginScreen />
				<StatusBar style="auto" />
			</SafeAreaView>
		);
	}

	return (
		<View className={`flex-1 ${colorScheme}`}>
			<AuthenticatedApp />
			<StatusBar style={isDark ? "light" : "dark"} />
		</View>
	);
}

export default function App() {
	const [fontsLoaded] = useFonts({
		Poppins_400Regular,
		Poppins_500Medium,
		Poppins_600SemiBold,
		Poppins_700Bold,
	});

	if (!fontsLoaded) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#FF7D45" />
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

