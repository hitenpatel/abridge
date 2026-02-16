import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { ClassSelector } from "../components/staff/ClassSelector";
import { MediaPicker } from "../components/staff/MediaPicker";
import { trpc } from "../lib/trpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ComposePostScreen() {
	const navigation = useNavigation<NavigationProp>();
	const insets = useSafeAreaInsets();
	const utils = trpc.useUtils();

	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId ?? "";

	const [selectedClass, setSelectedClass] = useState<{
		yearGroup: string;
		className: string;
	} | null>(null);
	const [body, setBody] = useState("");
	const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
	const [isPosting, setIsPosting] = useState(false);

	const getUploadUrl = trpc.classPost.getUploadUrl.useMutation();
	const createPost = trpc.classPost.create.useMutation();

	const canPost = selectedClass && (body.trim().length > 0 || assets.length > 0);

	const handlePost = async () => {
		if (!canPost || !selectedClass || !schoolId) return;

		setIsPosting(true);
		try {
			const mediaUrls: string[] = [];
			let uploadFailed = false;

			for (const asset of assets) {
				try {
					const filename = asset.fileName ?? `upload-${Date.now()}`;
					const contentType =
						asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg");

					const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({
						schoolId,
						filename,
						contentType,
					});

					const response = await fetch(asset.uri);
					const blob = await response.blob();
					await fetch(uploadUrl, {
						method: "PUT",
						headers: { "Content-Type": contentType },
						body: blob,
					});

					mediaUrls.push(publicUrl);
				} catch {
					uploadFailed = true;
				}
			}

			if (uploadFailed && mediaUrls.length === 0 && !body.trim()) {
				Alert.alert("Upload Failed", "Could not upload media. Please try again.");
				setIsPosting(false);
				return;
			}

			await createPost.mutateAsync({
				schoolId,
				yearGroup: selectedClass.yearGroup,
				className: selectedClass.className,
				body: body.trim() || undefined,
				mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
			});

			// Invalidate relevant caches so feed/lists refresh
			await Promise.all([
				utils.classPost.listByClass.invalidate(),
				utils.classPost.listRecent.invalidate(),
				utils.dashboard.getFeed.invalidate(),
				utils.dashboard.getSummary.invalidate(),
			]);

			navigation.goBack();
		} catch (err) {
			Alert.alert("Error", err instanceof Error ? err.message : "Failed to create post");
		} finally {
			setIsPosting(false);
		}
	};

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			{/* Header */}
			<View
				className="flex-row items-center justify-between px-6 pb-4 border-b border-gray-100"
				style={{ paddingTop: insets.top + 8 }}
			>
				<Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-1">
					<MaterialIcons name="arrow-back" size={24} color="#1a1a1a" />
				</Pressable>
				<Text className="text-lg font-sans-bold text-foreground dark:text-white">
					Post to Class
				</Text>
				<Pressable
					onPress={handlePost}
					disabled={!canPost || isPosting}
					className={`rounded-full px-4 py-2 ${
						canPost && !isPosting ? "bg-primary" : "bg-gray-200"
					}`}
				>
					{isPosting ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<Text
							className={`text-sm font-sans-bold ${canPost ? "text-white" : "text-text-muted"}`}
						>
							Post
						</Text>
					)}
				</Pressable>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ padding: 24, gap: 20 }}
				keyboardShouldPersistTaps="handled"
			>
				<ClassSelector value={selectedClass} onChange={setSelectedClass} />

				{__DEV__ && (
					<Pressable
						onPress={() => {
							setBody("Today we painted pictures in art class!");
							if (!selectedClass) setSelectedClass({ yearGroup: "1", className: "1A" });
						}}
						className="bg-neutral-surface dark:bg-surface-dark rounded-full h-10 items-center justify-center"
					>
						<Text className="text-text-muted font-sans-semibold text-sm">Test Fill</Text>
					</Pressable>
				)}

				<TextInput
					value={body}
					onChangeText={setBody}
					placeholder="Write something about today's class..."
					placeholderTextColor="#96867f"
					multiline
					className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 text-base font-sans text-foreground dark:text-white"
					style={{ minHeight: 120, textAlignVertical: "top" }}
				/>

				<MediaPicker assets={assets} onChange={setAssets} />
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
