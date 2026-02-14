import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
	ActivityIndicator,
	FlatList,
	Linking,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { WalletCard } from "../components/WalletCard";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface PaymentItem {
	id: string;
	title: string;
	amount: number;
	category: string;
	dueDate: Date | null;
	childId: string;
	childName: string;
}

export function PaymentsScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const insets = useSafeAreaInsets();

	const {
		data: payments,
		isLoading,
		isError,
		refetch,
	} = trpc.payments.listOutstandingPayments.useQuery();

	const createSession = trpc.payments.createCheckoutSession.useMutation({
		onSuccess: (data) => {
			if (data.url) {
				Linking.openURL(data.url);
			}
		},
	});

	const [refreshing, setRefreshing] = React.useState(false);

	const onRefresh = async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	};

	const totalOutstanding = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
	const urgentPayments = payments?.filter(
		(p) => p.dueDate && new Date(p.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	);
	const otherPayments = payments?.filter(
		(p) => !p.dueDate || new Date(p.dueDate) >= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	);

	if (isLoading) {
		return (
			<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
				<View className="px-6 pt-6 gap-4">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-48 rounded-[32px]" />
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-6">
				<MaterialIcons name="error-outline" size={48} color="#F87171" />
				<Text className="text-foreground font-sans-bold text-lg mt-4 mb-2">
					Error loading payments
				</Text>
				<Pressable onPress={() => refetch()} className="bg-primary px-6 py-3 rounded-full">
					<Text className="text-white font-sans-bold">Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
			>
				{/* Header */}
				<View
					className="px-6 pb-4 flex-row items-center justify-between"
					style={{ paddingTop: insets.top + 8 }}
				>
					<View>
						<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Wallet</Text>
						<Text className="text-sm font-sans text-text-muted mt-0.5">Manage your payments</Text>
					</View>
					<Pressable
						onPress={() => navigation.navigate("PaymentHistory")}
						className="w-10 h-10 rounded-full bg-neutral-surface dark:bg-surface-dark items-center justify-center"
					>
						<MaterialIcons name="history" size={20} color="#96867f" />
					</Pressable>
				</View>

				{/* Wallet Card */}
				<View className="px-6 mb-6">
					<WalletCard balance={totalOutstanding} />
				</View>

				{/* Due Now / Urgent */}
				{urgentPayments && urgentPayments.length > 0 && (
					<View className="px-6 mb-6">
						<View className="flex-row items-center gap-2 mb-4">
							<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted">
								Due Now
							</Text>
							<View className="bg-red-100 rounded-full px-2 py-0.5">
								<Text className="text-xs font-sans-bold text-red-600">
									{urgentPayments.length} Urgent
								</Text>
							</View>
						</View>
						{urgentPayments.map((item) => (
							<View
								key={`${item.id}-${item.childId}`}
								className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row items-center gap-3"
								style={{ borderLeftWidth: 4, borderLeftColor: "#EF4444" }}
							>
								<View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center">
									<MaterialIcons name="priority-high" size={24} color="#EF4444" />
								</View>
								<View className="flex-1">
									<Text className="text-base font-sans-bold text-foreground dark:text-white">
										{item.title}
									</Text>
									<Text className="text-xs font-sans text-text-muted">{item.childName}</Text>
								</View>
								<View className="items-end gap-1">
									<Text className="text-lg font-sans-bold text-foreground dark:text-white">
										£{(item.amount / 100).toFixed(2)}
									</Text>
									<Pressable
										onPress={() =>
											createSession.mutate({
												paymentItemId: item.id,
												childId: item.childId,
											})
										}
										className="bg-primary rounded-full px-4 py-1.5"
									>
										<Text className="text-white font-sans-bold text-xs">Pay Now</Text>
									</Pressable>
								</View>
							</View>
						))}
					</View>
				)}

				{/* Upcoming */}
				{otherPayments && otherPayments.length > 0 && (
					<View className="px-6 mb-6">
						<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
							Upcoming
						</Text>
						{otherPayments.map((item) => (
							<View
								key={`${item.id}-${item.childId}`}
								className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row items-center gap-3"
							>
								<View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
									<MaterialIcons name="receipt-long" size={24} color="#f56e3d" />
								</View>
								<View className="flex-1">
									<Text className="text-base font-sans-bold text-foreground dark:text-white">
										{item.title}
									</Text>
									<Text className="text-xs font-sans text-text-muted">
										{item.childName}
										{item.dueDate &&
											` · Due ${new Date(item.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
									</Text>
								</View>
								<Pressable
									onPress={() =>
										createSession.mutate({
											paymentItemId: item.id,
											childId: item.childId,
										})
									}
									className="bg-primary/10 rounded-full px-4 py-1.5"
								>
									<Text className="text-primary font-sans-bold text-sm">Pay</Text>
								</Pressable>
							</View>
						))}
					</View>
				)}

				{/* Empty state */}
				{(!payments || payments.length === 0) && (
					<View className="items-center py-20">
						<MaterialIcons name="account-balance-wallet" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No outstanding payments
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1">You're all caught up!</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}
