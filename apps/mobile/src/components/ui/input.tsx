import React from "react";
import { TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
	className?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
	({ className = "", ...props }, ref) => {
		return (
			<TextInput
				ref={ref}
				className={`rounded-2xl h-12 px-4 bg-neutral-surface dark:bg-surface-dark text-foreground dark:text-white font-sans text-base ${className}`}
				placeholderTextColor="#96867f"
				{...props}
			/>
		);
	},
);

Input.displayName = "Input";
