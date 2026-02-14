import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

export function StaffPaymentsScreen() {
	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;

	const {
		data: paymentItems,
		isLoading,
		refetch,
		isRefetching,
	} = trpc.payments.listPaymentItems.useQuery(
		{ schoolId: schoolId! },
		{ enabled: !!schoolId },
	);

	const onRefresh = React.useCallback(() => {
		refetch();
	}, [refetch]);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6 gap-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</View>
			</View>
		);
	}

	const items = paymentItems?.data ?? [];

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
			>
				{/* Header */}
				<View className="px-6 pt-4 pb-2">
					<Text className="text-2xl font-sans-bold text-foreground dark:text-white">
						Payments
					</Text>
					<Text className="text-sm font-sans text-text-muted mt-0.5">
						Manage payment items
					</Text>
				</View>

				{/* Summary */}
				<View className="px-6 mt-4">
					<View className="flex-row gap-3">
						<View className="flex-1 bg-primary/10 rounded-2xl p-4 items-center">
							<Text className="text-2xl font-sans-bold text-primary">{items.length}</Text>
							<Text className="text-xs font-sans-medium text-primary mt-1">Total Items</Text>
						</View>
						<View className="flex-1 bg-green-50 rounded-2xl p-4 items-center">
							<Text className="text-2xl font-sans-bold text-green-700">
								{items.reduce((sum, i) => sum + (i.paymentCount ?? 0), 0)}
							</Text>
							<Text className="text-xs font-sans-medium text-green-600 mt-1">Payments</Text>
						</View>
					</View>
				</View>

				{/* Payment Items List */}
				<View className="px-6 mt-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Payment Items
					</Text>

					{items.length === 0 ? (
						<View className="items-center py-16">
							<MaterialIcons name="payments" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No payment items
							</Text>
							<Text className="text-text-muted font-sans text-sm mt-1">
								Create your first payment item
							</Text>
						</View>
					) : (
						<View className="gap-3">
							{items.map((item) => {
								const categoryColors: Record<string, { bg: string; text: string }> = {
									DINNER_MONEY: { bg: "#FEF3C7", text: "#92400E" },
									TRIP: { bg: "#DBEAFE", text: "#2563EB" },
									CLUB: { bg: "#EDE9FE", text: "#6D28D9" },
									UNIFORM: { bg: "#DCFCE7", text: "#16A34A" },
									OTHER: { bg: "#F3F4F6", text: "#6B7280" },
								};
								const colors = categoryColors[item.category] ?? categoryColors.OTHER;

								return (
									<View
										key={item.id}
										className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
									>
										<View className="flex-row items-start gap-3">
											<View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
												<MaterialIcons name="receipt_long" size={24} color="#f56e3d" />
											</View>
											<View className="flex-1">
												<Text className="text-base font-sans-bold text-foreground dark:text-white">
													{item.title}
												</Text>
												<View className="flex-row items-center gap-2 mt-1">
													<View
														className="rounded-full px-2 py-0.5"
														style={{ backgroundColor: colors.bg }}
													>
														<Text
															className="text-xs font-sans-semibold"
															style={{ color: colors.text }}
														>
															{item.category.replace("_", " ")}
														</Text>
													</View>
													<Text className="text-xs font-sans text-text-muted">
														{item.recipientCount} recipients
													</Text>
												</View>
											</View>
											<Text className="text-lg font-sans-bold text-foreground dark:text-white">
												£{(item.amount / 100).toFixed(2)}
											</Text>
										</View>
										<View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
											<Text className="text-xs font-sans text-text-muted">
												{item.paymentCount}/{item.recipientCount} paid
											</Text>
											<View className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
												<View
													className="h-full bg-green-500 rounded-full"
													style={{
														width: `${item.recipientCount > 0 ? (item.paymentCount / item.recipientCount) * 100 : 0}%`,
													}}
												/>
											</View>
											<Text className="text-xs font-sans-bold text-green-600">
												{item.recipientCount > 0
													? Math.round((item.paymentCount / item.recipientCount) * 100)
													: 0}%
											</Text>
										</View>
									</View>
								);
							})}
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
