import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const maxWidthMap = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-xl",
	"2xl": "max-w-2xl",
	"4xl": "max-w-4xl",
	"5xl": "max-w-5xl",
	"6xl": "max-w-6xl",
	"7xl": "max-w-7xl",
	full: "max-w-full",
} as const;

interface PageShellProps {
	maxWidth?: keyof typeof maxWidthMap;
	animate?: boolean;
	"data-testid"?: string;
	children: ReactNode;
}

export function PageShell({
	maxWidth = "6xl",
	animate = true,
	"data-testid": testId,
	children,
}: PageShellProps) {
	return (
		<div
			className={cn(maxWidthMap[maxWidth], "mx-auto", animate && "page-enter")}
			data-testid={testId}
		>
			{children}
		</div>
	);
}
