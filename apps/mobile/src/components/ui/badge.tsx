import { type VariantProps, cva } from "class-variance-authority";
import { Text, View, type ViewProps } from "react-native";

const badgeVariants = cva("rounded-full px-2.5 py-0.5 flex-row items-center self-start", {
	variants: {
		variant: {
			default: "bg-primary",
			success: "bg-success",
			warning: "bg-warning",
			destructive: "bg-destructive",
			info: "bg-info",
			secondary: "bg-secondary",
		},
	},
	defaultVariants: { variant: "default" },
});

const textVariants = cva("text-xs font-semibold font-sans", {
	variants: {
		variant: {
			default: "text-primary-foreground",
			success: "text-success-foreground",
			warning: "text-warning-foreground",
			destructive: "text-destructive-foreground",
			info: "text-info-foreground",
			secondary: "text-secondary-foreground",
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
