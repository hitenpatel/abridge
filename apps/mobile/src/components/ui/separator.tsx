import { View, type ViewProps } from "react-native";

interface SeparatorProps extends ViewProps {
	orientation?: "horizontal" | "vertical";
	className?: string;
}

export function Separator({
	orientation = "horizontal",
	className = "",
	...props
}: SeparatorProps) {
	return (
		<View
			className={`bg-border ${
				orientation === "horizontal" ? "h-px w-full" : "w-px h-full"
			} ${className}`}
			{...props}
		/>
	);
}
