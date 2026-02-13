import { ChevronRight } from "lucide-react-native";
import type React from "react";
import { Pressable, type PressableProps, View } from "react-native";
import { Body, Muted } from "./typography";

interface ListItemProps extends PressableProps {
	icon?: React.ReactNode;
	title: string;
	subtitle?: string;
	showChevron?: boolean;
	className?: string;
}

export function ListItem({
	icon,
	title,
	subtitle,
	showChevron = true,
	className = "",
	...props
}: ListItemProps) {
	return (
		<Pressable
			className={`flex-row items-center py-3 px-4 active:opacity-70 ${className}`}
			{...props}
		>
			{icon && <View className="mr-3">{icon}</View>}
			<View className="flex-1">
				<Body className="font-medium">{title}</Body>
				{subtitle && <Muted className="mt-0.5">{subtitle}</Muted>}
			</View>
			{showChevron && <ChevronRight size={20} color="#9CA3AF" />}
		</Pressable>
	);
}
