import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface PaymentCardProps {
	title: string;
	amountDuePence: number;
	dueDate?: Date | string | null;
	category: string;
	onPay?: () => void;
}

function formatCurrency(pence: number): string {
	return `\u00a3${(pence / 100).toFixed(2)}`;
}

export function PaymentCard({ title, amountDuePence, dueDate, onPay }: PaymentCardProps) {
	const due = dueDate ? (typeof dueDate === "string" ? new Date(dueDate) : dueDate) : null;

	return (
		<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4">
			<View className="flex-row items-start gap-3">
				<View className="w-9 h-9 rounded-lg bg-amber-50 items-center justify-center">
					<MaterialIcons name="credit-card" size={18} color="#D97706" />
				</View>
				<View className="flex-1">
					<Text
						className="text-sm font-sans-semibold text-foreground dark:text-white"
						numberOfLines={1}
					>
						{title}
					</Text>
					<Text className="text-lg font-sans-bold text-foreground dark:text-white mt-0.5">
						{formatCurrency(amountDuePence)}
					</Text>
					<View className="flex-row items-center justify-between mt-2">
						{due && (
							<Text className="text-xs font-sans text-text-muted">
								Due{" "}
								{due.toLocaleDateString("en-GB", {
									day: "numeric",
									month: "short",
									year: "numeric",
								})}
							</Text>
						)}
						<Pressable onPress={onPay}>
							<Text className="text-xs font-sans-bold text-primary">Pay</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</View>
	);
}
