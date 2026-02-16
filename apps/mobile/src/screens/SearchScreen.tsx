import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import type { MessageItem, RootStackParamList } from "../../App";
import { type RouterOutputs, trpc } from "../lib/trpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Search">;
type SearchResultItem = RouterOutputs["search"]["query"][number];

function getResultIcon(index: string): keyof typeof MaterialIcons.glyphMap {
	switch (index) {
		case "messages":
			return "chat-bubble-outline";
		case "events":
			return "event";
		case "payment_items":
			return "account-balance-wallet";
		default:
			return "search";
	}
}

function getResultColor(index: string): { bg: string; icon: string } {
	switch (index) {
		case "messages":
			return { bg: "#DBEAFE", icon: "#3B82F6" };
		case "events":
			return { bg: "#EDE9FE", icon: "#8B5CF6" };
		case "payment_items":
			return { bg: "#fff0eb", icon: "#f56e3d" };
		default:
			return { bg: "#F3F4F6", icon: "#6B7280" };
	}
}

export function SearchScreen() {
	const navigation = useNavigation<NavigationProp>();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);
		return () => clearTimeout(handler);
	}, [query]);

	const {
		data: results,
		isLoading,
		isError,
	} = trpc.search.query.useQuery({ query: debouncedQuery }, { enabled: debouncedQuery.length > 2 });

	const handlePress = (result: SearchResultItem) => {
		if (result.index === "messages") {
			const source = result.source as Record<string, unknown>;
			const message: MessageItem = {
				id: result.id,
				subject: (source.subject as string) || "No Subject",
				body: (source.body as string) || "",
				category: (source.category as string) || "General",
				createdAt: new Date((source.createdAt as string) || new Date()),
				schoolName: "School",
				schoolLogo: null,
				isRead: true,
			};
			navigation.navigate("MessageDetail", { message });
		}
	};

	return (
		<View className="flex-1 bg-background">
			{/* Search Input */}
			<View className="mx-6 mt-4 mb-4">
				{__DEV__ && (
					<Pressable
						onPress={() => setQuery("Test Message 1")}
						className="bg-neutral-surface dark:bg-surface-dark rounded-full h-10 items-center justify-center mb-3"
					>
						<Text className="text-text-muted font-sans-semibold text-sm">Test Search</Text>
					</Pressable>
				)}
				<View className="flex-row items-center bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 h-12 gap-2">
					<MaterialIcons name="search" size={20} color="#96867f" />
					<TextInput
						placeholder="Search messages, events, payments..."
						placeholderTextColor="#96867f"
						value={query}
						onChangeText={setQuery}
						autoFocus
						className="flex-1 text-foreground dark:text-white font-sans text-base"
					/>
					{query.length > 0 && (
						<Pressable onPress={() => setQuery("")}>
							<MaterialIcons name="close" size={20} color="#96867f" />
						</Pressable>
					)}
				</View>
			</View>

			{isLoading && (
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#f56e3d" />
				</View>
			)}

			{!isLoading && debouncedQuery.length <= 2 && (
				<View className="flex-1 justify-center items-center px-6">
					<MaterialIcons name="search" size={48} color="#D1D5DB" />
					<Text className="text-text-muted font-sans-medium text-base mt-4 text-center">
						Enter at least 3 characters to search
					</Text>
				</View>
			)}

			{!isLoading && debouncedQuery.length > 2 && results?.length === 0 && (
				<View className="flex-1 justify-center items-center px-6">
					<MaterialIcons name="search-off" size={48} color="#9CA3AF" />
					<Text className="text-text-muted font-sans-medium text-base mt-4">No results found</Text>
					<Text className="text-text-muted font-sans text-sm mt-1">
						No results for "{debouncedQuery}"
					</Text>
				</View>
			)}

			{isError && (
				<View className="flex-1 justify-center items-center px-6">
					<MaterialIcons name="error-outline" size={48} color="#F87171" />
					<Text className="text-foreground font-sans-bold text-base mt-4">
						An error occurred while searching
					</Text>
				</View>
			)}

			<FlatList
				data={results}
				keyExtractor={(item) => `${item.index}-${item.id}`}
				contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
				renderItem={({ item }) => {
					const source = item.source as Record<string, unknown>;
					const title = (source.subject as string) || (source.title as string) || "No Title";
					const body = (source.body as string) || (source.description as string) || "";
					const snippet = body.length > 100 ? `${body.substring(0, 100)}...` : body;
					const colors = getResultColor(item.index);
					const icon = getResultIcon(item.index);

					return (
						<Pressable
							onPress={() => handlePress(item)}
							className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 flex-row gap-3"
						>
							<View
								className="w-10 h-10 rounded-full items-center justify-center"
								style={{ backgroundColor: colors.bg }}
							>
								<MaterialIcons name={icon} size={20} color={colors.icon} />
							</View>
							<View className="flex-1">
								<Text className="text-base font-sans-bold text-foreground dark:text-white mb-1">
									{title}
								</Text>
								<Text className="text-sm font-sans text-text-muted mb-1" numberOfLines={2}>
									{snippet}
								</Text>
								<Text className="text-xs font-sans-medium text-primary capitalize">
									{source.category as string}
								</Text>
							</View>
						</Pressable>
					);
				}}
			/>
		</View>
	);
}
