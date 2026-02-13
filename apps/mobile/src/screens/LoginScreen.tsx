import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Card, H1, Input, Muted } from "../components/ui";
import { authClient } from "../lib/auth-client";

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess?: () => void }) => {
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
			console.log("Attempting login to:", authClient.$fetch.baseURL ?? "unknown");
			const { data, error } = await authClient.signIn.email({
				email,
				password,
			});

			if (error) {
				console.error("Login error:", error);
				Alert.alert("Login Failed", error.message || "Invalid credentials");
			} else {
				onLoginSuccess?.();
			}
		} catch (err) {
			console.error("Login exception:", err);
			Alert.alert("Error", "An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			<View className="flex-1 justify-center px-6">
				{/* Brand Header */}
				<View className="items-center mb-12">
					<View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
						<H1 className="text-primary-foreground">A</H1>
					</View>
					<H1 className="text-3xl text-center mb-2">Welcome to Abridge</H1>
					<Muted className="text-center">Sign in to continue</Muted>
				</View>

				{/* Login Card */}
				<Card className="w-full">
					<View className="gap-4">
						<Input
							placeholder="Email"
							value={email}
							onChangeText={setEmail}
							autoCapitalize="none"
							keyboardType="email-address"
							editable={!loading}
						/>
						<Input
							placeholder="Password"
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							editable={!loading}
						/>
						<Button onPress={handleLogin} disabled={loading} className="mt-2">
							{loading ? "Signing in..." : "Sign In"}
						</Button>
					</View>
				</Card>
			</View>
		</KeyboardAvoidingView>
	);
};
