"use client";

import { ActionItemCard } from "./action-item-card";

interface ActionItem {
	type: "payment" | "form" | "urgentMessage";
	title?: string;
	subject?: string;
	amountDuePence?: number;
	dueDate?: string | null;
	category?: string;
	paymentItemId?: string;
	templateId?: string;
	messageId?: string;
}

interface ActionItemsRowProps {
	items: ActionItem[];
	onPayment?: (paymentItemId: string) => void;
	onForm?: (templateId: string) => void;
	onMessage?: (messageId: string) => void;
}

function getActionLabel(type: ActionItem["type"]): string {
	switch (type) {
		case "payment":
			return "Pay now";
		case "form":
			return "Complete form";
		case "urgentMessage":
			return "Read message";
	}
}

function getTitle(item: ActionItem): string {
	if (item.type === "urgentMessage") return item.subject ?? "Urgent Message";
	return item.title ?? "";
}

function getDescription(item: ActionItem): string | undefined {
	if (item.type === "payment" && item.amountDuePence != null) {
		return `\u00a3${(item.amountDuePence / 100).toFixed(2)} due`;
	}
	return undefined;
}

export function ActionItemsRow({ items, onPayment, onForm, onMessage }: ActionItemsRowProps) {
	if (items.length === 0) return null;

	const handleAction = (item: ActionItem) => {
		switch (item.type) {
			case "payment":
				onPayment?.(item.paymentItemId ?? "");
				break;
			case "form":
				onForm?.(item.templateId ?? "");
				break;
			case "urgentMessage":
				onMessage?.(item.messageId ?? "");
				break;
		}
	};

	return (
		<div className="overflow-x-auto scrollbar-hide">
			<div className="flex gap-3 snap-x snap-mandatory pb-2">
				{items.map((item, i) => (
					<ActionItemCard
						key={`${item.type}-${item.paymentItemId ?? item.templateId ?? item.messageId ?? i}`}
						type={item.type}
						title={getTitle(item)}
						description={getDescription(item)}
						actionLabel={getActionLabel(item.type)}
						onAction={() => handleAction(item)}
					/>
				))}
			</div>
		</div>
	);
}
