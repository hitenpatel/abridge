import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "outline" | "ghost";
	size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, type = "button", variant = "primary", size = "md", ...props }, ref) => {
		const variants = {
			primary: "bg-primary-600 text-white hover:bg-primary-700",
			outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
			ghost: "text-gray-600 hover:bg-gray-100",
		};

		const sizes = {
			sm: "px-3 py-1.5 text-sm",
			md: "px-4 py-2",
			lg: "px-6 py-3 text-lg",
		};

		return (
			<button
				ref={ref}
				type={type}
				className={`${variants[variant]} ${sizes[size]} rounded font-medium disabled:opacity-50 transition-colors ${className}`}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";
