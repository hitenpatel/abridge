import { MaterialIcons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

interface GradientAvatarProps {
	uri?: string | null;
	name: string;
	size?: number;
	selected?: boolean;
	onPress?: () => void;
}

export function GradientAvatar({
	uri,
	name,
	size = 64,
	selected = false,
	onPress,
}: GradientAvatarProps) {
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<Pressable onPress={onPress} className="items-center gap-2">
			<View
				style={{
					width: size + 8,
					height: size + 8,
					borderRadius: (size + 8) / 2,
					borderWidth: selected ? 3 : 2,
					borderColor: selected ? "#f56e3d" : "#E5E7EB",
					alignItems: "center",
					justifyContent: "center",
					opacity: selected ? 1 : 0.6,
				}}
			>
				{uri ? (
					<Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
				) : (
					<View
						style={{ width: size, height: size, borderRadius: size / 2 }}
						className="bg-primary/10 items-center justify-center"
					>
						<Text className="text-primary font-sans-bold text-lg">{initials}</Text>
					</View>
				)}
				{selected && (
					<View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary items-center justify-center border-2 border-white">
						<MaterialIcons name="check" size={14} color="white" />
					</View>
				)}
			</View>
			<Text
				className={`text-xs font-sans-semibold ${selected ? "text-foreground dark:text-white" : "text-text-muted"}`}
			>
				{name.split(" ")[0]}
			</Text>
		</Pressable>
	);
}
