"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, CreditCard, FileText } from "lucide-react";

type ActionItemType = "payment" | "form" | "urgentMessage";

interface ActionItemCardProps {
	type: ActionItemType;
	title: string;
	description?: string;
	actionLabel: string;
	onAction: () => void;
}

const CONFIG: Record<
	ActionItemType,
	{ borderColor: string; bgColor: string; icon: typeof AlertTriangle }
> = {
	urgentMessage: {
		borderColor: "border-l-red-500",
		bgColor: "bg-red-50",
		icon: AlertTriangle,
	},
	payment: {
		borderColor: "border-l-amber-500",
		bgColor: "bg-amber-50",
		icon: CreditCard,
	},
	form: {
		borderColor: "border-l-blue-500",
		bgColor: "bg-blue-50",
		icon: FileText,
	},
};

export function ActionItemCard({
	type,
	title,
	description,
	actionLabel,
	onAction,
}: ActionItemCardProps) {
	const { borderColor, bgColor, icon: Icon } = CONFIG[type];

	return (
		<Card className={cn("border-l-4 min-w-[260px] shrink-0 snap-start", borderColor)}>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div
						className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bgColor)}
					>
						<Icon className="h-4 w-4" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-foreground truncate">{title}</p>
						{description && (
							<p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
						)}
						<button
							type="button"
							onClick={onAction}
							className="text-xs font-semibold text-primary mt-2 hover:underline"
						>
							{actionLabel}
						</button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
