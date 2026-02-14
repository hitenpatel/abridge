import type React from "react";
import { View, type ViewProps } from "react-native";
import { Button } from "./button";
import { Body, H2, Muted } from "./typography";

interface EmptyStateProps extends ViewProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	className?: string;
}

export function EmptyState({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	className = "",
	...props
}: EmptyStateProps) {
	return (
		<View className={`flex-1 items-center justify-center px-8 py-20 ${className}`} {...props}>
			{icon && <View className="mb-6">{icon}</View>}
			<H2 className="text-center mb-2 text-foreground dark:text-white">{title}</H2>
			{description && <Muted className="text-center mb-8 text-text-muted">{description}</Muted>}
			{actionLabel && onAction && <Button onPress={onAction}>{actionLabel}</Button>}
		</View>
	);
}
