import { MaterialIcons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { trpc } from "../lib/trpc";

export function PaymentHistoryScreen() {
	const { data: payments, isLoading } = trpc.payments.listOutstandingPayments.useQuery();

	if (isLoading) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<FlatList
				data={payments ?? []}
				keyExtractor={(item) => `${item.id}-${item.childId}`}
				contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1 }}
				renderItem={({ item }) => (
					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row items-center gap-3">
						<View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
							<MaterialIcons name="receipt" size={20} color="#f56e3d" />
						</View>
						<View className="flex-1">
							<Text className="text-sm font-sans-bold text-foreground dark:text-white">
								{item.title}
							</Text>
							<Text className="text-xs font-sans text-text-muted">{item.childName}</Text>
						</View>
						<Text className="text-base font-sans-bold text-foreground dark:text-white">
							£{(item.amount / 100).toFixed(2)}
						</Text>
					</View>
				)}
				ListEmptyComponent={
					<View className="flex-1 items-center justify-center py-20">
						<MaterialIcons name="receipt-long" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No payment history
						</Text>
					</View>
				}
			/>
		</View>
	);
}
