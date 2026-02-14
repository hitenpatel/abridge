import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface StatCardProps {
	icon: keyof typeof MaterialIcons.glyphMap;
	iconBg: string;
	iconColor: string;
	value: string | number;
	label: string;
}

export function StatCard({ icon, iconBg, iconColor, value, label }: StatCardProps) {
	return (
		<View
			className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-white/5 min-w-[140px]"
			style={{
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.02,
				shadowRadius: 6,
				elevation: 2,
			}}
		>
			<View
				className="w-10 h-10 rounded-full items-center justify-center mb-3"
				style={{ backgroundColor: iconBg }}
			>
				<MaterialIcons name={icon} size={20} color={iconColor} />
			</View>
			<Text className="text-lg font-sans-bold text-foreground dark:text-white">{value}</Text>
			<Text className="text-xs font-sans text-text-muted dark:text-gray-400">{label}</Text>
		</View>
	);
}
