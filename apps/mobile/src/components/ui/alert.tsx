import { type VariantProps, cva } from "class-variance-authority";
import { View, type ViewProps } from "react-native";
import { Body } from "./typography";

const alertVariants = cva("rounded-xl p-4 border", {
	variants: {
		variant: {
			success: "bg-success/10 border-success",
			warning: "bg-warning/10 border-warning",
			destructive: "bg-destructive/10 border-destructive",
			info: "bg-info/10 border-info",
		},
	},
	defaultVariants: { variant: "info" },
});

const textVariants = cva("font-sans text-sm", {
	variants: {
		variant: {
			success: "text-success-foreground",
			warning: "text-warning-foreground",
			destructive: "text-destructive-foreground",
			info: "text-info-foreground",
		},
	},
	defaultVariants: { variant: "info" },
});

interface AlertProps extends ViewProps, VariantProps<typeof alertVariants> {
	className?: string;
	children: string;
}

export function Alert({ variant, className = "", children, ...props }: AlertProps) {
	return (
		<View className={`${alertVariants({ variant })} ${className}`} {...props}>
			<Body className={textVariants({ variant })}>{children}</Body>
		</View>
	);
}
