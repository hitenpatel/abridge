import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar, CreditCard, MessageSquare, Search as SearchIcon } from "lucide-react-native";
import type React from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import type { MessageItem, RootStackParamList } from "../../App";
import { Body, Card, EmptyState, Input, Muted, Small } from "../components/ui";
import { type RouterOutputs, trpc } from "../lib/trpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Search">;
type SearchResultItem = RouterOutputs["search"]["query"][number];

export const SearchScreen: React.FC = () => {
	const navigation = useNavigation<NavigationProp>();
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);

		return () => {
			clearTimeout(handler);
		};
	}, [query]);

	const {
		data: results,
		isLoading,
		isError,
	} = trpc.search.query.useQuery({ query: debouncedQuery }, { enabled: debouncedQuery.length > 2 });

	const renderIcon = (index: string) => {
		const size = 20;
		const color = "#9CA3AF";
		switch (index) {
			case "messages":
				return <MessageSquare size={size} color={color} />;
			case "events":
				return <Calendar size={size} color={color} />;
			case "payment_items":
				return <CreditCard size={size} color={color} />;
			default:
				return <SearchIcon size={size} color={color} />;
		}
	};

	const handlePress = (result: SearchResultItem) => {
		if (result.index === "messages") {
			// Construct a MessageItem from search result source
			const source = result.source as Record<string, unknown>;
			const message: MessageItem = {
				id: result.id,
				subject: (source.subject as string) || "No Subject",
				body: (source.body as string) || "",
				category: (source.category as string) || "General",
				createdAt: new Date((source.createdAt as string) || new Date()),
				schoolName: "School", // Search results don't have schoolName directly
				schoolLogo: null,
				isRead: true,
			};
			navigation.navigate("MessageDetail", { message });
		} else {
			// For events and payments, we don't have detail screens yet
			console.log("Pressed result:", result);
		}
	};

	const renderItem = ({ item }: { item: SearchResultItem }) => {
		const source = item.source as Record<string, unknown>;
		const title = (source.subject as string) || (source.title as string) || "No Title";
		const body = (source.body as string) || (source.description as string) || "";
		const snippet = body.length > 100 ? `${body.substring(0, 100)}...` : body;

		return (
			<Pressable onPress={() => handlePress(item)} className="mb-3">
				<Card className="flex-row active:opacity-70">
					<View className="w-10 h-10 rounded-full bg-secondary items-center justify-center mr-3">
						{renderIcon(item.index)}
					</View>
					<View className="flex-1">
						<Body className="font-semibold mb-1">{title}</Body>
						<Muted className="text-sm mb-1">{snippet}</Muted>
						<Small className="font-medium text-primary capitalize">
							{source.category as string}
						</Small>
					</View>
				</Card>
			</Pressable>
		);
	};

	return (
		<View className="flex-1 bg-background">
			<View className="m-4">
				<View className="flex-row items-center bg-card px-3 rounded-xl border border-input h-12">
					<SearchIcon size={20} color="#9CA3AF" className="mr-2" />
					<Input
						placeholder="Search messages, events, payments..."
						value={query}
						onChangeText={setQuery}
						autoFocus
						className="flex-1 border-0"
					/>
				</View>
			</View>

			{isLoading && (
				<View className="flex-1 justify-center items-center p-5">
					<ActivityIndicator size="large" color="#FF7D45" />
				</View>
			)}

			{!isLoading && debouncedQuery.length > 2 && results?.length === 0 && (
				<EmptyState
					icon={<SearchIcon size={48} color="#9CA3AF" />}
					title="No results found"
					description={`No results for "${debouncedQuery}"`}
				/>
			)}

			{!isLoading && debouncedQuery.length <= 2 && (
				<View className="flex-1 justify-center items-center p-5">
					<Muted className="text-center">Enter at least 3 characters to search</Muted>
				</View>
			)}

			{isError && (
				<View className="flex-1 justify-center items-center p-5">
					<Body className="text-destructive text-center">An error occurred while searching</Body>
				</View>
			)}

			<FlatList
				data={results}
				keyExtractor={(item) => `${item.index}-${item.id}`}
				renderItem={renderItem}
				contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
			/>
		</View>
	);
};
