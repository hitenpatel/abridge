import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface TimelineCardProps {
	borderColor: string;
	iconBg: string;
	iconColor: string;
	icon: keyof typeof MaterialIcons.glyphMap;
	title: string;
	subtitle: string;
	badge?: { text: string; bg: string; textColor: string };
	time?: string;
	actionButton?: { label: string; onPress: () => void };
}

export function TimelineCard({
	borderColor,
	iconBg,
	iconColor,
	icon,
	title,
	subtitle,
	badge,
	time,
	actionButton,
}: TimelineCardProps) {
	return (
		<View
			className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-5"
			style={{
				borderLeftWidth: 4,
				borderLeftColor: borderColor,
				shadowColor: "#f56e3d",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.08,
				shadowRadius: 24,
				elevation: 4,
			}}
		>
			<View className="flex-row items-start gap-4">
				<View
					className="w-12 h-12 rounded-full items-center justify-center"
					style={{ backgroundColor: iconBg }}
				>
					<MaterialIcons name={icon} size={22} color={iconColor} />
				</View>

				<View className="flex-1">
					<View className="flex-row items-center justify-between mb-1">
						<Text className="text-base font-sans-bold text-foreground dark:text-white flex-1">
							{title}
						</Text>
						{badge && (
							<View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: badge.bg }}>
								<Text className="text-xs font-sans-semibold" style={{ color: badge.textColor }}>
									{badge.text}
								</Text>
							</View>
						)}
					</View>
					<Text className="text-sm font-sans text-text-muted dark:text-gray-400 leading-relaxed">
						{subtitle}
					</Text>
					{time && (
						<Text className="text-xs font-sans text-text-muted dark:text-gray-500 mt-1">
							{time}
						</Text>
					)}
					{actionButton && (
						<Pressable
							onPress={actionButton.onPress}
							className="mt-3 self-start bg-primary/10 px-4 py-2 rounded-full"
						>
							<Text className="text-sm font-sans-bold text-primary">
								{actionButton.label}
							</Text>
						</Pressable>
					)}
				</View>
			</View>
		</View>
	);
}
