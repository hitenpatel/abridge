import { Calendar, ChevronRight, CreditCard, User } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, FlatList, Linking, RefreshControl, View } from "react-native";
import { Badge, Body, Button, Card, EmptyState, H1, Muted, Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

export function PaymentsScreen() {
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

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-4 gap-4">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</View>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background justify-center items-center">
				<Body className="text-destructive">Error loading payments.</Body>
			</View>
		);
	}

	const renderItem = ({
		item,
	}: {
		item: {
			id: string;
			title: string;
			amount: number;
			category: string;
			dueDate: Date | null;
			childId: string;
			childName: string;
		};
	}) => (
		<Card className="mb-4">
			<View className="flex-row justify-between items-center mb-2">
				<Badge className="bg-primary/10">
					<Body className="text-xs font-bold text-primary uppercase">{item.category}</Body>
				</Badge>
				<H1 className="text-lg">£{(item.amount / 100).toFixed(2)}</H1>
			</View>

			<Body className="font-semibold mb-3">{item.title}</Body>

			<View className="mb-4">
				<View className="flex-row items-center mb-1">
					<User size={14} color="#9CA3AF" />
					<Muted className="ml-1.5">{item.childName}</Muted>
				</View>
				{item.dueDate && (
					<View className="flex-row items-center">
						<Calendar size={14} color="#9CA3AF" />
						<Muted className="ml-1.5">Due: {new Date(item.dueDate).toLocaleDateString()}</Muted>
					</View>
				)}
			</View>

			<View className="flex-row items-center justify-center bg-primary rounded-xl py-3 active:opacity-90">
				<Button
					onPress={() => createSession.mutate({ paymentItemId: item.id, childId: item.childId })}
					disabled={createSession.isPending}
					className="flex-1"
				>
					{createSession.isPending ? "Connecting..." : "Pay Now"}
				</Button>
				<ChevronRight size={18} color="#FFFFFF" className="ml-1" />
			</View>
		</Card>
	);

	return (
		<View className="flex-1 bg-background">
			<FlatList
				data={payments}
				renderItem={renderItem}
				keyExtractor={(item) => `${item.id}-${item.childId}`}
				contentContainerStyle={{ padding: 16 }}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF7D45" />
				}
				ListEmptyComponent={
					<EmptyState
						icon={<CreditCard size={48} color="#9CA3AF" />}
						title="No outstanding payments"
						description="You're all caught up!"
					/>
				}
			/>
		</View>
	);
}
