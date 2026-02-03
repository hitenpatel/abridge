import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "outline" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, type = "button", variant = "primary", ...props }, ref) => {
		const variants = {
			primary: "bg-primary-600 text-white hover:bg-primary-700",
			outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
			ghost: "text-gray-600 hover:bg-gray-100",
		};

		return (
			<button
				ref={ref}
				type={type}
				className={`${variants[variant]} px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors ${className}`}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";
