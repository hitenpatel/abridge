import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface AchievementBadgeProps {
	icon: keyof typeof MaterialIcons.glyphMap;
	label: string;
	bgColor: string;
	iconColor?: string;
}

export function AchievementBadge({
	icon,
	label,
	bgColor,
	iconColor = "white",
}: AchievementBadgeProps) {
	return (
		<View className="items-center gap-2">
			<View
				className="w-20 h-20 rounded-[24px] items-center justify-center"
				style={{ backgroundColor: bgColor }}
			>
				<MaterialIcons name={icon} size={32} color={iconColor} />
			</View>
			<Text className="text-xs font-sans-semibold text-foreground dark:text-white text-center">
				{label}
			</Text>
		</View>
	);
}
