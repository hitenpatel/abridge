import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar, CreditCard, MessageSquare, Search as SearchIcon } from "lucide-react-native";
import type React from "react";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import type { MessageItem, RootStackParamList } from "../../App";
import { theme } from "../lib/theme";
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
		const color = theme.colors.textMuted;
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
			<TouchableOpacity style={styles.resultItem} onPress={() => handlePress(item)}>
				<View style={styles.iconContainer}>{renderIcon(item.index)}</View>
				<View style={styles.contentContainer}>
					<Text style={styles.resultTitle}>{title}</Text>
					<Text style={styles.resultSnippet}>{snippet}</Text>
					<Text style={styles.resultCategory}>{source.category as string}</Text>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<SearchIcon size={20} color={theme.colors.inactiveTab} style={styles.searchIcon} />
				<TextInput
					style={styles.input}
					placeholder="Search messages, events, payments..."
					value={query}
					onChangeText={setQuery}
					autoFocus
					clearButtonMode="while-editing"
				/>
			</View>

			{isLoading && (
				<View style={styles.centerContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
				</View>
			)}

			{!isLoading && debouncedQuery.length > 2 && results?.length === 0 && (
				<View style={styles.centerContainer}>
					<Text style={styles.emptyText}>No results found for "{debouncedQuery}"</Text>
				</View>
			)}

			{!isLoading && debouncedQuery.length <= 2 && (
				<View style={styles.centerContainer}>
					<Text style={styles.hintText}>Enter at least 3 characters to search</Text>
				</View>
			)}

			{isError && (
				<View style={styles.centerContainer}>
					<Text style={styles.errorText}>An error occurred while searching</Text>
				</View>
			)}

			<FlatList
				data={results}
				keyExtractor={(item) => `${item.index}-${item.id}`}
				renderItem={renderItem}
				contentContainerStyle={styles.listContent}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: theme.colors.card,
		margin: 16,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: theme.colors.border,
		height: 48,
	},
	searchIcon: {
		marginRight: 8,
	},
	input: {
		flex: 1,
		height: "100%",
		fontSize: 16,
		color: theme.colors.text,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	resultItem: {
		flexDirection: "row",
		backgroundColor: theme.colors.card,
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: theme.colors.secondary,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	contentContainer: {
		flex: 1,
	},
	resultTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.text,
		marginBottom: 4,
	},
	resultSnippet: {
		fontSize: 14,
		color: theme.colors.textMuted,
		marginBottom: 4,
	},
	resultCategory: {
		fontSize: 12,
		fontWeight: "500",
		color: theme.colors.primary,
		textTransform: "capitalize",
	},
	centerContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	emptyText: {
		fontSize: 16,
		color: theme.colors.textMuted,
		textAlign: "center",
	},
	hintText: {
		fontSize: 16,
		color: theme.colors.inactiveTab,
		textAlign: "center",
	},
	errorText: {
		fontSize: 16,
		color: theme.colors.error,
		textAlign: "center",
	},
});
