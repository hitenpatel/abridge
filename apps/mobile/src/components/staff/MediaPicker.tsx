import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

interface MediaPickerProps {
	assets: ImagePicker.ImagePickerAsset[];
	onChange: (assets: ImagePicker.ImagePickerAsset[]) => void;
	maxAssets?: number;
}

export function MediaPicker({ assets, onChange, maxAssets = 10 }: MediaPickerProps) {
	const handleAdd = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			allowsMultipleSelection: true,
			mediaTypes: ["images", "videos"],
			quality: 0.8,
			selectionLimit: maxAssets - assets.length,
		});

		if (!result.canceled && result.assets) {
			const combined = [...assets, ...result.assets].slice(0, maxAssets);
			onChange(combined);
		}
	};

	const handleRemove = (index: number) => {
		onChange(assets.filter((_, i) => i !== index));
	};

	return (
		<View className="gap-3">
			<View className="flex-row items-center justify-between">
				<Pressable
					onPress={handleAdd}
					disabled={assets.length >= maxAssets}
					className="flex-row items-center gap-2"
				>
					<MaterialIcons name="add-photo-alternate" size={20} color="#f56e3d" />
					<Text className="text-sm font-sans-semibold text-primary">Add Photos / Videos</Text>
				</Pressable>
				<Text className="text-xs font-sans text-text-muted">
					{assets.length}/{maxAssets}
				</Text>
			</View>

			{assets.length > 0 && (
				<View className="flex-row flex-wrap gap-2">
					{assets.map((asset, i) => (
						<View
							key={asset.uri}
							className="rounded-xl overflow-hidden bg-gray-200"
							style={{ width: 80, height: 80 }}
						>
							{asset.type === "video" ? (
								<View className="flex-1 items-center justify-center">
									<MaterialIcons name="videocam" size={24} color="#96867f" />
								</View>
							) : (
								<Image source={{ uri: asset.uri }} className="w-full h-full" resizeMode="cover" />
							)}
							<Pressable
								onPress={() => handleRemove(i)}
								className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 items-center justify-center"
							>
								<MaterialIcons name="close" size={12} color="white" />
							</Pressable>
						</View>
					))}
				</View>
			)}
		</View>
	);
}
