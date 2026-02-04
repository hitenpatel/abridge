import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { theme } from "../lib/theme";
import { LoginScreen } from "../screens/LoginScreen";
import { MessageDetailScreen } from "../screens/MessageDetailScreen";
import { MessagesScreen } from "../screens/MessagesScreen";

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
	Messages: undefined;
	MessageDetail: { message: MessageItem };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
	isAuthenticated: boolean;
}

export const AppNavigator = ({ isAuthenticated }: AppNavigatorProps) => {
	return (
		<NavigationContainer>
			<Stack.Navigator
				screenOptions={{
					headerStyle: {
						backgroundColor: theme.colors.headerBackground,
					},
					headerTintColor: theme.colors.headerText,
					headerTitleStyle: {
						fontWeight: "600",
					},
					headerBackTitleVisible: false,
				}}
			>
				{!isAuthenticated ? (
					<Stack.Screen
						name="Login"
						component={LoginScreen}
						options={{
							headerShown: false,
						}}
					/>
				) : (
					<>
						<Stack.Screen
							name="Messages"
							component={MessagesScreen}
							options={{
								title: "Inbox",
							}}
						/>
						<Stack.Screen
							name="MessageDetail"
							component={MessageDetailScreen}
							options={({ route }) => ({
								title: route.params.message.subject,
								headerTitleStyle: {
									fontWeight: "600",
									fontSize: 16,
								},
							})}
						/>
					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
};
