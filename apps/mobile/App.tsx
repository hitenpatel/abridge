import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import {
	type NativeStackNavigationProp,
	createNativeStackNavigator,
} from "@react-navigation/native-stack";
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
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { authClient } from "./src/lib/auth-client";
import { TRPCProvider } from "./src/lib/provider";
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

	return (
		<View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
			<TouchableOpacity
				onPress={() => {
					navigation.navigate("Search");
				}}
				style={{ marginRight: 16 }}
			>
				<Search size={20} color="#fff" />
			</TouchableOpacity>
			<TouchableOpacity
				onPress={async () => {
					await authClient.signOut();
				}}
			>
				<Text style={styles.logoutLink}>Logout</Text>
			</TouchableOpacity>
		</View>
	);
}

function TabNavigator() {
	return (
		<Tab.Navigator
			screenOptions={{
				headerStyle: { backgroundColor: "#1d4ed8" },
				headerTintColor: "#fff",
				headerTitleStyle: { fontWeight: "600" },
				tabBarActiveTintColor: "#1d4ed8",
				tabBarInactiveTintColor: "#6b7280",
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
					headerStyle: { backgroundColor: "#1d4ed8" },
					headerTintColor: "#fff",
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

export default function App() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#1d4ed8" />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	if (!session) {
		return (
			<TRPCProvider>
				<SafeAreaView style={{ flex: 1 }}>
					<LoginScreen />
					<StatusBar style="auto" />
				</SafeAreaView>
			</TRPCProvider>
		);
	}

	return (
		<TRPCProvider>
			<AuthenticatedApp />
			<StatusBar style="light" />
		</TRPCProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9fafb",
		alignItems: "center",
		justifyContent: "center",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: "#6b7280",
	},
	logoutLink: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "500",
	},
});
