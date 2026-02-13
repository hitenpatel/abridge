import { Text, type TextProps } from "react-native";

export function H1({ className = "", ...props }: TextProps & { className?: string }) {
	return (
		<Text className={`text-2xl font-bold text-foreground font-sans ${className}`} {...props} />
	);
}

export function H2({ className = "", ...props }: TextProps & { className?: string }) {
	return (
		<Text className={`text-lg font-semibold text-foreground font-sans ${className}`} {...props} />
	);
}

export function Body({ className = "", ...props }: TextProps & { className?: string }) {
	return <Text className={`text-sm text-foreground font-sans ${className}`} {...props} />;
}

export function Muted({ className = "", ...props }: TextProps & { className?: string }) {
	return <Text className={`text-sm text-muted-foreground font-sans ${className}`} {...props} />;
}

export function Small({ className = "", ...props }: TextProps & { className?: string }) {
	return <Text className={`text-xs text-muted-foreground font-sans ${className}`} {...props} />;
}
