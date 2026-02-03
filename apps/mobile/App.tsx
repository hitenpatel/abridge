import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { authClient } from "./src/lib/auth-client";
import { LoginScreen } from "./src/screens/LoginScreen";

export default function App() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<View style={styles.container}>
				<Text>Loading...</Text>
			</View>
		);
	}

	if (!session) {
		return (
			<SafeAreaView style={{ flex: 1 }}>
				<LoginScreen />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.title}>SchoolConnect</Text>
			<Text style={styles.subtitle}>Welcome back, {session.user.name || session.user.email}</Text>

			<TouchableOpacity
				style={styles.logoutButton}
				onPress={async () => {
					await authClient.signOut();
				}}
			>
				<Text style={styles.logoutText}>Logout</Text>
			</TouchableOpacity>

			<StatusBar style="auto" />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f9fafb",
		alignItems: "center",
		justifyContent: "center",
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#1d4ed8",
	},
	subtitle: {
		fontSize: 16,
		color: "#6b7280",
		marginTop: 8,
	},
	logoutButton: {
		marginTop: 40,
		padding: 10,
		backgroundColor: "#ef4444",
		borderRadius: 8,
	},
	logoutText: {
		color: "#fff",
		fontWeight: "bold",
	},
});
