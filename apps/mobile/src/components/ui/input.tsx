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
				className={`rounded-xl h-10 px-3 border border-input bg-background text-foreground font-sans text-sm ${className}`}
				placeholderTextColor="#9CA3AF"
				{...props}
			/>
		);
	}
);

Input.displayName = "Input";
