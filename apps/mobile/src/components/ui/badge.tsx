import { type VariantProps, cva } from "class-variance-authority";
import { Text, View, type ViewProps } from "react-native";

const badgeVariants = cva("rounded-full px-3 py-1 flex-row items-center self-start", {
	variants: {
		variant: {
			default: "bg-primary/10",
			success: "bg-green-100",
			warning: "bg-yellow-100",
			destructive: "bg-red-100",
			info: "bg-blue-100",
			secondary: "bg-neutral-surface dark:bg-surface-dark",
		},
	},
	defaultVariants: { variant: "default" },
});

const textVariants = cva("text-xs font-sans-bold", {
	variants: {
		variant: {
			default: "text-primary",
			success: "text-green-700",
			warning: "text-yellow-800",
			destructive: "text-red-700",
			info: "text-blue-700",
			secondary: "text-text-muted",
		},
	},
	defaultVariants: { variant: "default" },
});

interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
	className?: string;
	children: string;
}

export function Badge({ variant, className = "", children, ...props }: BadgeProps) {
	return (
		<View className={`${badgeVariants({ variant })} ${className}`} {...props}>
			<Text className={textVariants({ variant })}>{children}</Text>
		</View>
	);
}
