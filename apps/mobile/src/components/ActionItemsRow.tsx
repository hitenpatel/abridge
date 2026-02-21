import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";

interface ActionItem {
	type: "payment" | "form" | "urgentMessage";
	title?: string;
	subject?: string;
	amountDuePence?: number;
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

const CONFIG: Record<
	ActionItem["type"],
	{
		borderColor: string;
		bgColor: string;
		icon: keyof typeof MaterialIcons.glyphMap;
		actionLabel: string;
	}
> = {
	urgentMessage: {
		borderColor: "#EF4444",
		bgColor: "#FEE2E2",
		icon: "warning",
		actionLabel: "Read message",
	},
	payment: {
		borderColor: "#F59E0B",
		bgColor: "#FEF3C7",
		icon: "credit-card",
		actionLabel: "Pay now",
	},
	form: {
		borderColor: "#3B82F6",
		bgColor: "#DBEAFE",
		icon: "description",
		actionLabel: "Complete form",
	},
};

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
		<FlatList
			horizontal
			showsHorizontalScrollIndicator={false}
			data={items}
			keyExtractor={(item, i) =>
				`${item.type}-${item.paymentItemId ?? item.templateId ?? item.messageId ?? i}`
			}
			contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
			renderItem={({ item }) => {
				const config = CONFIG[item.type];
				const description = getDescription(item);

				const labelMap: Record<ActionItem["type"], string> = {
					payment: "Payments Due",
					form: "Forms Pending",
					urgentMessage: "Unread Messages",
				};

				return (
					<Pressable
						onPress={() => handleAction(item)}
						accessibilityLabel={labelMap[item.type]}
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
						style={{
							width: 260,
							borderLeftWidth: 4,
							borderLeftColor: config.borderColor,
						}}
					>
						<View className="flex-row items-start gap-3">
							<View
								className="w-9 h-9 rounded-lg items-center justify-center"
								style={{ backgroundColor: config.bgColor }}
							>
								<MaterialIcons name={config.icon} size={18} color={config.borderColor} />
							</View>
							<View className="flex-1">
								<Text
									className="text-sm font-sans-semibold text-foreground dark:text-white"
									numberOfLines={1}
								>
									{getTitle(item)}
								</Text>
								{description && (
									<Text className="text-xs font-sans text-text-muted mt-0.5">{description}</Text>
								)}
								<Text className="text-xs font-sans-bold text-primary mt-2">
									{config.actionLabel}
								</Text>
							</View>
						</View>
					</Pressable>
				);
			}}
		/>
	);
}
