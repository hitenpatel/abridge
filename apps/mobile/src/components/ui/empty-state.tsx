import React from "react";
import { View, type ViewProps } from "react-native";
import { Body, H2, Muted } from "./typography";
import { Button } from "./button";

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
		<View className={`flex-1 items-center justify-center px-6 ${className}`} {...props}>
			{icon && <View className="mb-4">{icon}</View>}
			<H2 className="text-center mb-2">{title}</H2>
			{description && <Muted className="text-center mb-6">{description}</Muted>}
			{actionLabel && onAction && (
				<Button onPress={onAction}>{actionLabel}</Button>
			)}
		</View>
	);
}
