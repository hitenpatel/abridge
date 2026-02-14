import type React from "react";
import { View, type ViewProps } from "react-native";
import { Body, H2, Muted } from "./typography";

export function Card({ className = "", ...props }: ViewProps & { className?: string }) {
	return (
		<View
			className={`rounded-2xl bg-neutral-surface dark:bg-surface-dark border border-gray-100 p-4 ${className}`}
			{...props}
		/>
	);
}

export function CardHeader({ className = "", ...props }: ViewProps & { className?: string }) {
	return <View className={`mb-3 ${className}`} {...props} />;
}

export function CardTitle({ className = "", children, ...props }: React.ComponentProps<typeof H2>) {
	return (
		<H2 className={`mb-1 ${className}`} {...props}>
			{children}
		</H2>
	);
}

export function CardDescription({
	className = "",
	children,
	...props
}: React.ComponentProps<typeof Muted>) {
	return (
		<Muted className={className} {...props}>
			{children}
		</Muted>
	);
}

export function CardContent({ className = "", ...props }: ViewProps & { className?: string }) {
	return <View className={className} {...props} />;
}

export function CardFooter({ className = "", ...props }: ViewProps & { className?: string }) {
	return <View className={`mt-4 ${className}`} {...props} />;
}
