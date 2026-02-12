import React, { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { authClient } from "../lib/auth-client";
import { theme } from "../lib/theme";

export const LoginScreen = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		if (!email || !password) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		setLoading(true);
		try {
			const { data, error } = await authClient.signIn.email({
				email,
				password,
			});

			if (error) {
				Alert.alert("Login Failed", error.message || "Invalid credentials");
			} else {
				Alert.alert("Success", "Logged in successfully");
			}
		} catch (err) {
			Alert.alert("Error", "An unexpected error occurred");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>SchoolConnect</Text>
			<View style={styles.form}>
				<TextInput
					style={styles.input}
					placeholder="Email"
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
				/>
				<TextInput
					style={styles.input}
					placeholder="Password"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
				/>
				<TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
					{loading ? (
						<ActivityIndicator color={theme.colors.card} />
					) : (
						<Text style={styles.buttonText}>Login</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
		backgroundColor: theme.colors.card,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 40,
		color: theme.colors.primary,
	},
	form: {
		gap: 15,
	},
	input: {
		borderWidth: 1,
		borderColor: theme.colors.border,
		padding: 15,
		borderRadius: 8,
		fontSize: 16,
	},
	button: {
		backgroundColor: theme.colors.primary,
		padding: 15,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 10,
	},
	buttonText: {
		color: theme.colors.headerText,
		fontSize: 18,
		fontWeight: "600",
	},
});
