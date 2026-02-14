import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface ProgressBarProps {
	label: string;
	value: number;
	icon: keyof typeof MaterialIcons.glyphMap;
	color: string;
}

export function ProgressBar({ label, value, icon, color }: ProgressBarProps) {
	const clamped = Math.min(100, Math.max(0, value));

	return (
		<View className="gap-2">
			<View className="flex-row items-center justify-between">
				<View className="flex-row items-center gap-2">
					<MaterialIcons name={icon} size={16} color={color} />
					<Text className="text-sm font-sans-semibold text-foreground dark:text-white">
						{label}
					</Text>
				</View>
				<Text className="text-sm font-sans-bold" style={{ color }}>
					{clamped}%
				</Text>
			</View>
			<View className="w-full h-4 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
				<View
					className="h-full rounded-full"
					style={{
						width: `${clamped}%`,
						backgroundColor: color,
					}}
				/>
			</View>
		</View>
	);
}
