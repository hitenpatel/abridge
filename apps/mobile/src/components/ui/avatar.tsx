import React from "react";
import { Image, Text, View, type ImageProps, type ViewProps } from "react-native";

interface AvatarProps extends ViewProps {
	className?: string;
}

export function Avatar({ className = "", ...props }: AvatarProps) {
	return (
		<View
			className={`rounded-full h-10 w-10 bg-muted items-center justify-center overflow-hidden ${className}`}
			{...props}
		/>
	);
}

interface AvatarImageProps extends ImageProps {
	className?: string;
}

export function AvatarImage({ className = "", ...props }: AvatarImageProps) {
	return <Image className={`h-full w-full ${className}`} {...props} />;
}

interface AvatarFallbackProps {
	className?: string;
	children: string;
}

export function AvatarFallback({ className = "", children }: AvatarFallbackProps) {
	return (
		<Text className={`text-sm font-semibold text-muted-foreground font-sans ${className}`}>
			{children}
		</Text>
	);
}
