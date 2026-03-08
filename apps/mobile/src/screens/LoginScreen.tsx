import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { authClient } from "../lib/auth-client";

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess?: () => void }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
		const loginEmail = overrideEmail || email;
		const loginPassword = overridePassword || password;

		if (!loginEmail || !loginPassword) {
			Alert.alert("Error", "Please fill in all fields");
			return;
		}

		setLoading(true);
		try {
			console.log("[Login] Attempting sign in for:", loginEmail);
			const { data, error } = await authClient.signIn.email({
				email: loginEmail,
				password: loginPassword,
			});
			console.log("[Login] Result:", JSON.stringify({ data: !!data, error }));

			if (error) {
				Alert.alert("Login Failed", error.message || "Invalid credentials");
			} else {
				console.log("[Login] Success, calling onLoginSuccess");
				onLoginSuccess?.();
			}
		} catch (err) {
			console.log("[Login] Exception:", err);
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
			<View className="flex-1 justify-center px-8">
				{/* Brand Header */}
				<View className="items-center mb-12">
					<View
						className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-6"
						style={{
							shadowColor: "#f56e3d",
							shadowOffset: { width: 0, height: 8 },
							shadowOpacity: 0.3,
							shadowRadius: 24,
							elevation: 8,
						}}
					>
						<Text className="text-4xl font-sans-extrabold text-white">A</Text>
					</View>
					<Text className="text-3xl font-sans-extrabold text-primary mb-2">Abridge</Text>
					<Text className="text-base font-sans text-text-muted">Sign in to continue</Text>
				</View>

				{/* Login Form */}
				<View className="gap-4">
					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 h-14 flex-row items-center gap-3">
						<MaterialIcons name="email" size={20} color="#96867f" />
						<TextInput
							testID="email-input"
							placeholder="Email"
							placeholderTextColor="#96867f"
							value={email}
							onChangeText={setEmail}
							autoCapitalize="none"
							keyboardType="email-address"
							editable={!loading}
							className="flex-1 text-foreground dark:text-white font-sans text-base"
						/>
					</View>

					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 h-14 flex-row items-center gap-3">
						<MaterialIcons name="lock" size={20} color="#96867f" />
						<TextInput
							testID="password-input"
							placeholder="Password"
							placeholderTextColor="#96867f"
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							editable={!loading}
							className="flex-1 text-foreground dark:text-white font-sans text-base"
						/>
					</View>

					<Pressable
						onPress={() => handleLogin()}
						disabled={loading}
						className="bg-primary rounded-full h-14 items-center justify-center mt-2"
						style={{
							opacity: loading ? 0.7 : 1,
							shadowColor: "#f56e3d",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: 0.3,
							shadowRadius: 12,
							elevation: 6,
						}}
					>
						{loading ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							<Text className="text-white font-sans-bold text-base">Sign In</Text>
						)}
					</Pressable>

					{__DEV__ && (
						<View className="flex-row gap-3 mt-2">
							<Pressable
								onPress={() => handleLogin("sarah@example.com", "password123")}
								disabled={loading}
								className="flex-1 bg-neutral-surface dark:bg-surface-dark rounded-full h-12 items-center justify-center"
							>
								<Text className="text-text-muted font-sans-semibold text-sm">Test Parent</Text>
							</Pressable>
							<Pressable
								onPress={() => handleLogin("claire@oakwood.sch.uk", "password123")}
								disabled={loading}
								className="flex-1 bg-neutral-surface dark:bg-surface-dark rounded-full h-12 items-center justify-center"
							>
								<Text className="text-text-muted font-sans-semibold text-sm">Test Staff</Text>
							</Pressable>
						</View>
					)}
				</View>
			</View>
		</KeyboardAvoidingView>
	);
};
