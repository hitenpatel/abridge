import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, Text, type PressableProps } from "react-native";

const buttonVariants = cva(
	"flex-row items-center justify-center rounded-xl",
	{
		variants: {
			variant: {
				default: "bg-primary active:opacity-90",
				destructive: "bg-destructive active:opacity-90",
				outline: "border border-border bg-transparent active:bg-accent",
				secondary: "bg-secondary active:opacity-80",
				ghost: "active:bg-accent",
			},
			size: {
				default: "h-10 px-4",
				sm: "h-9 px-3",
				lg: "h-11 px-8",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	}
);

const textVariants = cva("font-sans font-semibold", {
	variants: {
		variant: {
			default: "text-primary-foreground",
			destructive: "text-destructive-foreground",
			outline: "text-foreground",
			secondary: "text-secondary-foreground",
			ghost: "text-foreground",
		},
		size: {
			default: "text-sm",
			sm: "text-xs",
			lg: "text-base",
		},
	},
	defaultVariants: { variant: "default", size: "default" },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
	className?: string;
	children: string;
}

export function Button({ variant, size, className = "", children, ...props }: ButtonProps) {
	return (
		<Pressable className={`${buttonVariants({ variant, size })} ${className}`} {...props}>
			<Text className={textVariants({ variant, size })}>{children}</Text>
		</Pressable>
	);
}
