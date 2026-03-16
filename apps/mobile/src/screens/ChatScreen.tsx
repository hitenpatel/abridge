import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	RefreshControl,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

interface ConversationItem {
	id: string;
	subject: string | null;
	lastMessageAt: Date;
	closedAt: Date | null;
	staff: { id: string; name: string };
	parent: { id: string; name: string };
	school: { id: string; name: string };
	unreadCount: number;
}

interface MessageData {
	id: string;
	senderId: string;
	body: string;
	readAt: Date | null;
	createdAt: Date;
	sender: { id: string; name: string };
}

interface WsIncoming {
	type: string;
	conversationId: string;
	message: {
		id: string;
		senderId: string;
		body: string;
		createdAt: string;
		readAt: null;
	};
}

function formatTime(date: Date): string {
	const d = new Date(date);
	return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
	const now = new Date();
	const messageDate = new Date(date);

	if (
		messageDate.getDate() === now.getDate() &&
		messageDate.getMonth() === now.getMonth() &&
		messageDate.getFullYear() === now.getFullYear()
	) {
		return formatTime(date);
	}

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (
		messageDate.getDate() === yesterday.getDate() &&
		messageDate.getMonth() === yesterday.getMonth() &&
		messageDate.getFullYear() === yesterday.getFullYear()
	) {
		return "Yesterday";
	}

	return messageDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

// --- Conversation List View ---

function ConversationList({
	onSelectConversation,
}: {
	onSelectConversation: (conversation: ConversationItem) => void;
}) {
	const insets = useSafeAreaInsets();
	const {
		data: conversations,
		isLoading,
		refetch,
		isRefetching,
	} = trpc.chat.getConversations.useQuery();

	const onRefresh = useCallback(() => {
		refetch();
	}, [refetch]);

	if (isLoading) {
		return (
			<View
				testID="chat-screen"
				className="flex-1 bg-background"
				style={{ paddingTop: insets.top }}
			>
				<View className="px-6 pt-6 pb-4">
					<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Chat</Text>
				</View>
				<View className="px-6 gap-3">
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
				</View>
			</View>
		);
	}

	return (
		<View testID="chat-screen" className="flex-1 bg-background">
			<View className="px-6 pb-4 bg-background" style={{ paddingTop: insets.top + 8 }}>
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white">Chat</Text>
				{conversations && conversations.length > 0 && (
					<Text className="text-xs text-text-muted font-sans">
						{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
					</Text>
				)}
			</View>

			<FlatList
				testID="conversations-list"
				data={(conversations as ConversationItem[]) ?? []}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View className="flex-1 items-center justify-center py-20">
						<MaterialIcons name="chat-bubble-outline" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No conversations yet
						</Text>
						<Text className="text-text-muted font-sans text-sm mt-1">Pull down to refresh</Text>
					</View>
				}
				renderItem={({ item }) => (
					<Pressable
						onPress={() => onSelectConversation(item)}
						testID={`conversation-${item.id}`}
						className="mx-6 mb-3 bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4"
						style={{
							shadowColor: "#f56e3d",
							shadowOffset: { width: 0, height: 8 },
							shadowOpacity: 0.08,
							shadowRadius: 24,
							elevation: 4,
						}}
					>
						<View className="flex-row gap-3">
							{/* Avatar */}
							<View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center flex-shrink-0">
								<Text className="text-primary font-sans-bold text-lg">
									{item.staff.name[0]?.toUpperCase()}
								</Text>
							</View>

							{/* Content */}
							<View className="flex-1">
								<View className="flex-row items-center justify-between mb-1">
									<View className="flex-row items-center flex-1 mr-2">
										{item.unreadCount > 0 && (
											<View className="w-2 h-2 rounded-full bg-primary mr-2" />
										)}
										<Text
											className={`flex-1 text-base ${
												item.unreadCount > 0
													? "font-sans-bold text-foreground dark:text-white"
													: "font-sans-medium text-text-main dark:text-gray-200"
											}`}
											numberOfLines={1}
										>
											{item.staff.name}
										</Text>
									</View>
									<Text className="text-xs font-sans text-text-muted">
										{formatDate(item.lastMessageAt)}
									</Text>
								</View>

								<View className="flex-row items-center justify-between">
									<Text
										className="text-sm font-sans text-text-muted dark:text-gray-400 flex-1 mr-2"
										numberOfLines={1}
									>
										{item.subject ?? "No subject"}
									</Text>
									{item.unreadCount > 0 && (
										<View
											className="bg-primary rounded-full min-w-[20px] h-5 items-center justify-center px-1.5"
											accessibilityLabel={`${item.unreadCount} unread`}
										>
											<Text className="text-white text-xs font-sans-bold">{item.unreadCount}</Text>
										</View>
									)}
								</View>

								<Text className="text-xs font-sans text-primary mt-1">{item.school.name}</Text>
							</View>
						</View>
					</Pressable>
				)}
			/>
		</View>
	);
}

// --- Message Thread View ---

function MessageThread({
	conversationId,
	staffName,
	onBack,
}: {
	conversationId: string;
	staffName: string;
	onBack: () => void;
}) {
	const insets = useSafeAreaInsets();
	const utils = trpc.useUtils();
	const flatListRef = useRef<FlatList>(null);
	const [messageText, setMessageText] = useState("");
	const [wsMessages, setWsMessages] = useState<MessageData[]>([]);
	const wsRef = useRef<WebSocket | null>(null);

	const { data: sessionData } = trpc.auth.getSession.useQuery();
	const currentUserId = sessionData?.user?.id;

	const {
		data: messagesData,
		isLoading,
		refetch,
		isRefetching,
	} = trpc.chat.getMessages.useQuery({ conversationId, limit: 50 }, { enabled: !!conversationId });

	const markReadMutation = trpc.chat.markRead.useMutation();
	const sendMessageMutation = trpc.chat.sendMessage.useMutation({
		onSuccess: () => {
			setMessageText("");
			utils.chat.getMessages.invalidate({ conversationId });
			utils.chat.getConversations.invalidate();
		},
	});

	// Mark messages as read on mount
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutate is stable
	useEffect(() => {
		if (conversationId) {
			markReadMutation.mutate({ conversationId });
		}
	}, [conversationId]);

	// WebSocket connection for real-time messages
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutate is stable, ws lifecycle managed manually
	useEffect(() => {
		if (!conversationId || !sessionData?.session?.token) return;

		const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000";
		const wsUrl = apiUrl.replace(/^http/, "ws");
		const ws = new WebSocket(`${wsUrl}/ws/chat?token=${sessionData.session.token}`);
		wsRef.current = ws;

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as WsIncoming;
				if (data.type === "chat:message" && data.conversationId === conversationId) {
					const incoming: MessageData = {
						id: data.message.id,
						senderId: data.message.senderId,
						body: data.message.body,
						readAt: null,
						createdAt: new Date(data.message.createdAt),
						sender: { id: data.message.senderId, name: staffName },
					};
					setWsMessages((prev) => [...prev, incoming]);
					// Mark as read immediately
					markReadMutation.mutate({ conversationId });
				}
			} catch {
				// Ignore parse errors
			}
		};

		ws.onerror = () => {
			console.log("[Chat WS] Connection error");
		};

		return () => {
			ws.close();
			wsRef.current = null;
		};
	}, [conversationId, sessionData?.session?.token, staffName]);

	const allMessages = [
		...(messagesData?.items ?? []),
		...wsMessages.filter((wsMsg) => !messagesData?.items?.some((m) => m.id === wsMsg.id)),
	].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	const handleSend = () => {
		const trimmed = messageText.trim();
		if (!trimmed) return;
		sendMessageMutation.mutate({
			conversationId,
			body: trimmed,
		});
	};

	const onRefresh = useCallback(() => {
		refetch();
		setWsMessages([]);
	}, [refetch]);

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			keyboardVerticalOffset={0}
		>
			{/* Header */}
			<View
				className="flex-row items-center px-4 pb-3 bg-background border-b border-gray-100 dark:border-white/10"
				style={{ paddingTop: insets.top + 8 }}
			>
				<Pressable
					onPress={onBack}
					testID="chat-back"
					accessibilityLabel="Back"
					className="w-10 h-10 rounded-full items-center justify-center mr-2"
				>
					<MaterialIcons name="arrow-back" size={24} color="#5c4d47" />
				</Pressable>
				<View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
					<Text className="text-primary font-sans-bold text-lg">{staffName[0]?.toUpperCase()}</Text>
				</View>
				<Text
					className="text-lg font-sans-bold text-foreground dark:text-white flex-1"
					numberOfLines={1}
				>
					{staffName}
				</Text>
			</View>

			{/* Messages */}
			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#f56e3d" />
				</View>
			) : (
				<FlatList
					ref={flatListRef}
					testID="messages-thread"
					data={allMessages}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 }}
					refreshControl={
						<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
					}
					showsVerticalScrollIndicator={false}
					onContentSizeChange={() => {
						flatListRef.current?.scrollToEnd({ animated: false });
					}}
					ListEmptyComponent={
						<View className="flex-1 items-center justify-center py-20">
							<MaterialIcons name="chat" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No messages yet
							</Text>
							<Text className="text-text-muted font-sans text-sm mt-1">Send the first message</Text>
						</View>
					}
					renderItem={({ item }) => {
						const isOwn = item.senderId === currentUserId;
						return (
							<View
								className={`mb-2 max-w-[80%] ${isOwn ? "self-end" : "self-start"}`}
								testID={isOwn ? "message-sent" : "message-received"}
							>
								<View
									className={`rounded-2xl px-4 py-3 ${
										isOwn
											? "bg-primary rounded-br-md"
											: "bg-neutral-surface dark:bg-surface-dark rounded-bl-md"
									}`}
								>
									<Text
										className={`text-sm font-sans ${
											isOwn ? "text-white" : "text-foreground dark:text-white"
										}`}
									>
										{item.body}
									</Text>
								</View>
								<Text
									className={`text-[10px] font-sans text-text-muted mt-1 ${
										isOwn ? "text-right" : "text-left"
									}`}
								>
									{formatTime(item.createdAt)}
								</Text>
							</View>
						);
					}}
				/>
			)}

			{/* Input Bar */}
			<View
				className="flex-row items-end px-4 py-3 bg-background border-t border-gray-100 dark:border-white/10"
				style={{ paddingBottom: Math.max(insets.bottom, 12) }}
			>
				<TextInput
					className="flex-1 bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 py-3 text-foreground dark:text-white font-sans text-base mr-3 max-h-[100px]"
					placeholder="Type a message..."
					placeholderTextColor="#96867f"
					value={messageText}
					onChangeText={setMessageText}
					multiline
					testID="message-input"
					accessibilityLabel="Message"
				/>
				<Pressable
					onPress={handleSend}
					disabled={!messageText.trim() || sendMessageMutation.isPending}
					testID="send-message"
					accessibilityLabel="Send"
					className={`w-12 h-12 rounded-full items-center justify-center ${
						messageText.trim() ? "bg-primary" : "bg-neutral-surface"
					}`}
				>
					<MaterialIcons name="send" size={20} color={messageText.trim() ? "#FFFFFF" : "#9CA3AF"} />
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}

// --- Main Chat Screen ---

export function ChatScreen({ route }: Props) {
	const [activeConversationId, setActiveConversationId] = useState<string | null>(
		route.params?.conversationId ?? null,
	);
	const [activeStaffName, setActiveStaffName] = useState<string>("");

	const handleSelectConversation = useCallback((conversation: ConversationItem) => {
		setActiveConversationId(conversation.id);
		setActiveStaffName(conversation.staff.name);
	}, []);

	const handleBack = useCallback(() => {
		setActiveConversationId(null);
		setActiveStaffName("");
	}, []);

	if (activeConversationId) {
		return (
			<MessageThread
				conversationId={activeConversationId}
				staffName={activeStaffName}
				onBack={handleBack}
			/>
		);
	}

	return <ConversationList onSelectConversation={handleSelectConversation} />;
}
