import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { RootStackParamList } from "../../App";
import { ChildSelector } from "../components/ChildSelector";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function FormsScreen() {
	const navigation = useNavigation<NavigationProp>();

	const { data: summary, isLoading: summaryLoading } = trpc.dashboard.getSummary.useQuery();
	const children = (summary?.children ?? []) as Array<{
		id: string;
		firstName: string;
		lastName: string;
	}>;
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	const activeChildId = selectedChildId ?? children[0]?.id;

	const {
		data: pendingForms,
		isLoading: pendingLoading,
		refetch: refetchPending,
	} = trpc.forms.getPendingForms.useQuery(
		{ childId: activeChildId as string },
		{ enabled: !!activeChildId },
	);

	const {
		data: completedForms,
		isLoading: completedLoading,
		refetch: refetchCompleted,
	} = trpc.forms.getCompletedForms.useQuery(
		{ childId: activeChildId as string },
		{ enabled: !!activeChildId },
	);

	const [refreshing, setRefreshing] = useState(false);
	const onRefresh = async () => {
		setRefreshing(true);
		await Promise.all([refetchPending(), refetchCompleted()]);
		setRefreshing(false);
	};

	if (summaryLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6 gap-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-12 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
					<Skeleton className="h-24 rounded-2xl" />
				</View>
			</View>
		);
	}

	const isLoading = pendingLoading || completedLoading;

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 40 }}
			refreshControl={
				<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f56e3d" />
			}
		>
			{/* Header */}
			<View className="px-6 pt-4 pb-2">
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white">
					Forms & Consent
				</Text>
				<Text className="text-sm font-sans text-text-muted mt-0.5">
					Complete required forms for your children
				</Text>
			</View>

			{/* Child Selector */}
			{children.length > 1 && (
				<View className="px-6 mb-4">
					<ChildSelector
						items={children}
						selectedChildId={activeChildId ?? ""}
						onSelect={setSelectedChildId}
					/>
				</View>
			)}

			{isLoading && (
				<View className="items-center py-12">
					<ActivityIndicator size="large" color="#f56e3d" />
				</View>
			)}

			{/* Action Required */}
			{!isLoading && pendingForms && pendingForms.length > 0 && (
				<View className="px-6 mb-6">
					<View className="flex-row items-center gap-2 mb-4">
						<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted">
							Action Required
						</Text>
						<View className="bg-red-100 rounded-full px-2 py-0.5">
							<Text className="text-xs font-sans-bold text-red-600">{pendingForms.length}</Text>
						</View>
					</View>
					{pendingForms.map((form) => (
						<Pressable
							key={form.id}
							onPress={() =>
								navigation.navigate("FormDetail", {
									formId: form.id,
									childId: activeChildId as string,
								})
							}
							className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row items-center gap-3"
							style={{ borderLeftWidth: 4, borderLeftColor: "#f56e3d" }}
						>
							<View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
								<MaterialIcons name="description" size={24} color="#f56e3d" />
							</View>
							<View className="flex-1">
								<Text className="text-base font-sans-bold text-foreground dark:text-white">
									{form.title}
								</Text>
								{form.description && (
									<Text className="text-xs font-sans text-text-muted mt-0.5" numberOfLines={1}>
										{form.description}
									</Text>
								)}
							</View>
							<View className="bg-primary rounded-full px-4 py-1.5">
								<Text className="text-white font-sans-bold text-xs">Complete</Text>
							</View>
						</Pressable>
					))}
				</View>
			)}

			{/* Completed */}
			{!isLoading && completedForms && completedForms.length > 0 && (
				<View className="px-6 mb-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Completed
					</Text>
					{completedForms.map((response) => (
						<View
							key={response.id}
							className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row items-center gap-3"
							style={{ opacity: 0.7 }}
						>
							<View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center">
								<MaterialIcons name="check-circle" size={24} color="#16A34A" />
							</View>
							<View className="flex-1">
								<Text className="text-base font-sans-bold text-foreground dark:text-white">
									{response.template.title}
								</Text>
								<Text className="text-xs font-sans text-text-muted mt-0.5">
									Submitted{" "}
									{new Date(response.submittedAt).toLocaleDateString("en-GB", {
										day: "numeric",
										month: "short",
										year: "numeric",
									})}
								</Text>
							</View>
							<View className="bg-green-100 rounded-full px-3 py-1">
								<Text className="text-xs font-sans-bold text-green-700">Done</Text>
							</View>
						</View>
					))}
				</View>
			)}

			{/* Empty State */}
			{!isLoading &&
				(!pendingForms || pendingForms.length === 0) &&
				(!completedForms || completedForms.length === 0) && (
					<View className="items-center py-20 px-6">
						<MaterialIcons name="assignment" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No forms available
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1 text-center">
							Forms and consent requests will appear here
						</Text>
					</View>
				)}
		</ScrollView>
	);
}
