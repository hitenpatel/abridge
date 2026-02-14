import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, View, Text } from "react-native";
import { hapticLight } from "../lib/haptics";

interface TabConfig {
	icon: keyof typeof MaterialIcons.glyphMap;
	label: string;
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
	return (
		<View
			className="absolute bottom-6 left-6 right-6 h-16 bg-white dark:bg-neutral-surface-dark/90 rounded-full flex-row items-center justify-between px-2 z-30 border border-white/20 dark:border-white/5"
			style={{
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.12,
				shadowRadius: 30,
				elevation: 20,
			}}
		>
			{state.routes.map((route, index) => {
				const { options } = descriptors[route.key];
				const isFocused = state.index === index;
				const tabConfig = options.tabBarLabel as unknown as TabConfig;
				const icon = tabConfig?.icon ?? "home";
				const label = tabConfig?.label ?? route.name;

				const onPress = () => {
					hapticLight();
					const event = navigation.emit({
						type: "tabPress",
						target: route.key,
						canPreventDefault: true,
					});
					if (!isFocused && !event.defaultPrevented) {
						navigation.navigate(route.name);
					}
				};

				if (isFocused) {
					return (
						<Pressable
							key={route.key}
							onPress={onPress}
							className="flex-row items-center gap-2 bg-primary/10 px-4 py-2 rounded-full"
						>
							<MaterialIcons name={icon} size={24} color="#f56e3d" />
							<Text className="text-sm font-sans-bold text-primary">{label}</Text>
						</Pressable>
					);
				}

				return (
					<Pressable
						key={route.key}
						onPress={onPress}
						className="items-center justify-center w-12 h-12 rounded-full"
					>
						<MaterialIcons name={icon} size={24} color="#9CA3AF" />
					</Pressable>
				);
			})}
		</View>
	);
}
