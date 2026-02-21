import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { trpc } from "../lib/trpc";

type Category = "STANDARD" | "URGENT" | "FYI";

export function ComposeMessageScreen() {
	const navigation = useNavigation();

	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;

	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [category, setCategory] = useState<Category>("STANDARD");

	const sendMessage = trpc.messaging.send.useMutation({
		onSuccess: (data) => {
			Alert.alert("Sent!", `Message sent to ${data.recipientCount} recipients`, [
				{ text: "OK", onPress: () => navigation.goBack() },
			]);
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const handleSend = () => {
		if (!schoolId) {
			Alert.alert("Error", "No school selected");
			return;
		}
		if (!subject.trim()) {
			Alert.alert("Missing Subject", "Please enter a subject for your message");
			return;
		}
		if (!body.trim()) {
			Alert.alert("Missing Message", "Please enter a message body");
			return;
		}

		sendMessage.mutate({
			schoolId,
			subject: subject.trim(),
			body: body.trim(),
			category,
			allChildren: true,
		});
	};

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 120 }}
				keyboardShouldPersistTaps="handled"
			>
				{/* Recipient Card */}
				<View className="mx-6 mt-4 mb-4">
					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3">
						<View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
							<MaterialIcons name="groups" size={20} color="#f56e3d" />
						</View>
						<View className="flex-1">
							<Text className="text-base font-sans-bold text-foreground dark:text-white">
								All Parents
							</Text>
							<Text className="text-xs font-sans text-text-muted">Entire school</Text>
						</View>
						<MaterialIcons name="expand-more" size={24} color="#96867f" />
					</View>
				</View>

				{/* Priority Toggle */}
				<View className="mx-6 mb-4">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-3">
						Priority
					</Text>
					<View className="flex-row gap-3">
						<Pressable
							onPress={() => setCategory("STANDARD")}
							accessibilityLabel="Standard"
							className={`flex-1 rounded-2xl p-4 flex-row items-center gap-2 ${
								category === "STANDARD" ? "border-2 border-green-500" : ""
							}`}
							style={{
								backgroundColor: category === "STANDARD" ? "#DCFCE7" : "#f3f4f6",
							}}
						>
							<MaterialIcons
								name="check-circle"
								size={20}
								color={category === "STANDARD" ? "#16A34A" : "#9CA3AF"}
							/>
							<Text
								className={`text-sm font-sans-bold ${
									category === "STANDARD" ? "text-green-700" : "text-gray-500"
								}`}
							>
								Normal
							</Text>
						</Pressable>
						<Pressable
							onPress={() => setCategory("URGENT")}
							accessibilityLabel="Urgent"
							className={`flex-1 rounded-2xl p-4 flex-row items-center gap-2 ${
								category === "URGENT" ? "border-2 border-red-500" : ""
							}`}
							style={{
								backgroundColor: category === "URGENT" ? "#FEE2E2" : "#f3f4f6",
							}}
						>
							<MaterialIcons
								name="priority-high"
								size={20}
								color={category === "URGENT" ? "#DC2626" : "#9CA3AF"}
							/>
							<Text
								className={`text-sm font-sans-bold ${
									category === "URGENT" ? "text-red-700" : "text-gray-500"
								}`}
							>
								Urgent
							</Text>
						</Pressable>
					</View>
				</View>

				{/* Test Fill (dev only) */}
				{__DEV__ && (
					<View className="mx-6 mb-4">
						<Pressable
							onPress={() => {
								setSubject("Test Message");
								setBody("This is a test message");
							}}
							className="bg-neutral-surface dark:bg-surface-dark rounded-full h-10 items-center justify-center"
						>
							<Text className="text-text-muted font-sans-semibold text-sm">Test Fill</Text>
						</Pressable>
					</View>
				)}

				{/* Input Card */}
				<View className="mx-6 mb-4">
					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4">
						<TextInput
							value={subject}
							onChangeText={setSubject}
							placeholder="Subject"
							placeholderTextColor="#96867f"
							className="text-lg font-sans-semibold text-foreground dark:text-white pb-3 border-b border-gray-200"
						/>
						<TextInput
							value={body}
							onChangeText={setBody}
							placeholder="Write your message..."
							placeholderTextColor="#96867f"
							multiline
							textAlignVertical="top"
							className="text-base font-sans text-foreground dark:text-white pt-3 min-h-[200px]"
						/>
					</View>
				</View>

				{/* Attachments */}
				<View className="mx-6 mb-4">
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						<View className="flex-row gap-3">
							<Pressable className="border-2 border-dashed border-gray-300 rounded-2xl px-5 py-3 flex-row items-center gap-2">
								<MaterialIcons name="add-a-photo" size={20} color="#96867f" />
								<Text className="text-sm font-sans-medium text-text-muted">Photo</Text>
							</Pressable>
							<Pressable className="border-2 border-dashed border-gray-300 rounded-2xl px-5 py-3 flex-row items-center gap-2">
								<MaterialIcons name="note-add" size={20} color="#96867f" />
								<Text className="text-sm font-sans-medium text-text-muted">Document</Text>
							</Pressable>
							<Pressable className="border-2 border-dashed border-gray-300 rounded-2xl px-5 py-3 flex-row items-center gap-2">
								<MaterialIcons name="event" size={20} color="#96867f" />
								<Text className="text-sm font-sans-medium text-text-muted">Event</Text>
							</Pressable>
						</View>
					</ScrollView>
				</View>

				{/* Info Banner */}
				<View className="mx-6 mb-4">
					<View className="bg-primary/5 rounded-xl p-4 flex-row gap-3">
						<MaterialIcons name="info" size={20} color="#f56e3d" />
						<Text className="text-xs font-sans text-text-muted flex-1 leading-4">
							Parents will receive a push notification for this message. Urgent messages will be
							highlighted in their inbox.
						</Text>
					</View>
				</View>
			</ScrollView>

			{/* Sticky Bottom CTA */}
			<View className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-gray-100">
				<Pressable
					onPress={handleSend}
					disabled={sendMessage.isPending}
					accessibilityLabel="Sent"
					className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
					style={{ opacity: sendMessage.isPending ? 0.7 : 1 }}
				>
					{sendMessage.isPending ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<>
							<MaterialIcons name="send" size={18} color="white" />
							<Text className="text-white font-sans-bold text-base">Post to Class</Text>
						</>
					)}
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}
