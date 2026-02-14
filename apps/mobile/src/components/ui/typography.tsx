import { Text, type TextProps } from "react-native";

type TypographyProps = TextProps & { className?: string };

export function H1({ className = "", ...props }: TypographyProps) {
	return (
		<Text
			className={`text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight ${className}`}
			{...props}
		/>
	);
}

export function H2({ className = "", ...props }: TypographyProps) {
	return (
		<Text
			className={`text-lg font-sans-bold text-foreground dark:text-white ${className}`}
			{...props}
		/>
	);
}

export function Body({ className = "", ...props }: TypographyProps) {
	return (
		<Text
			className={`text-sm font-sans text-text-main dark:text-gray-200 ${className}`}
			{...props}
		/>
	);
}

export function Muted({ className = "", ...props }: TypographyProps) {
	return (
		<Text
			className={`text-sm font-sans text-text-muted dark:text-gray-400 ${className}`}
			{...props}
		/>
	);
}

export function Small({ className = "", ...props }: TypographyProps) {
	return (
		<Text
			className={`text-xs font-sans text-text-muted dark:text-gray-500 ${className}`}
			{...props}
		/>
	);
}
