"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, CreditCard, FileText } from "lucide-react";

type ActionItemType = "payment" | "form" | "urgentMessage";

const TEST_ID_MAP: Record<ActionItemType, string> = {
	payment: "action-item-payments",
	form: "action-item-forms",
	urgentMessage: "action-item-messages",
};

interface ActionItemCardProps {
	type: ActionItemType;
	title: string;
	description?: string;
	actionLabel: string;
	onAction: () => void;
}

const CONFIG: Record<
	ActionItemType,
	{ borderColor: string; bgColor: string; cardBg: string; icon: typeof AlertTriangle }
> = {
	urgentMessage: {
		borderColor: "border-l-red-400",
		bgColor: "bg-red-50",
		cardBg: "bg-orange-50/50",
		icon: AlertTriangle,
	},
	payment: {
		borderColor: "border-l-amber-400",
		bgColor: "bg-amber-50",
		cardBg: "bg-amber-50/50",
		icon: CreditCard,
	},
	form: {
		borderColor: "border-l-teal-400",
		bgColor: "bg-teal-50",
		cardBg: "bg-teal-50/40",
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
	const { borderColor, bgColor, cardBg, icon: Icon } = CONFIG[type];

	return (
		<Card
			data-testid={TEST_ID_MAP[type]}
			className={cn("border-l-4 min-w-[260px] shrink-0 snap-start", borderColor, cardBg)}
		>
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
