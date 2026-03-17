"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Plus, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── WebSocket Hook ──────────────────────────────────────────

interface WsMessage {
	type: string;
	conversationId?: string;
	message?: {
		id: string;
		senderId: string;
		body: string;
		createdAt: string;
	};
	userId?: string;
}

function useChatWebSocket(sessionToken: string | undefined) {
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const reconnectDelayRef = useRef(1000);
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

	const connect = useCallback(() => {
		if (!sessionToken) return;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const apiHost =
			process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, "") ?? "localhost:4000";
		const ws = new WebSocket(`${protocol}//${apiHost}/ws/chat?token=${sessionToken}`);

		ws.onopen = () => {
			setIsConnected(true);
			reconnectDelayRef.current = 1000;
		};

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data) as WsMessage;
				setLastMessage(msg);
			} catch {
				// ignore malformed messages
			}
		};

		ws.onclose = () => {
			setIsConnected(false);
			// Reconnect with exponential backoff
			const delay = Math.min(reconnectDelayRef.current, 30000);
			reconnectTimeoutRef.current = setTimeout(() => {
				reconnectDelayRef.current *= 2;
				connect();
			}, delay);
		};

		ws.onerror = () => {
			ws.close();
		};

		wsRef.current = ws;
	}, [sessionToken]);

	useEffect(() => {
		connect();
		return () => {
			if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
			wsRef.current?.close();
		};
	}, [connect]);

	const sendWsMessage = useCallback((data: object) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(data));
		}
	}, []);

	return { isConnected, lastMessage, sendWsMessage };
}

// ─── Types ───────────────────────────────────────────────────

interface Conversation {
	id: string;
	schoolId: string;
	parentId: string;
	staffId: string;
	subject: string | null;
	lastMessageAt: Date;
	closedAt: Date | null;
	createdAt: Date;
	parent: { id: string; name: string | null };
	staff: { id: string; name: string | null };
	school: { id: string; name: string };
	_count?: undefined;
	unreadCount: number;
}

interface Message {
	id: string;
	senderId: string;
	body: string;
	readAt: Date | null;
	createdAt: Date;
	sender: { id: string; name: string | null };
}

// ─── Conversation List ──────────────────────────────────────

function ConversationList({
	conversations,
	selectedId,
	onSelect,
	currentUserId,
}: {
	conversations: Conversation[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	currentUserId: string;
}) {
	return (
		<div className="space-y-1">
			{conversations.map((conv) => {
				const isSelected = conv.id === selectedId;
				const otherPerson = conv.parentId === currentUserId ? conv.staff : conv.parent;

				return (
					<button
						key={conv.id}
						type="button"
						onClick={() => onSelect(conv.id)}
						className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
							isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-gray-50"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="font-medium text-sm truncate">{otherPerson.name ?? "Unknown"}</span>
							{(conv.unreadCount ?? 0) > 0 && (
								<Badge className="bg-red-500 text-white text-xs ml-2">{conv.unreadCount}</Badge>
							)}
						</div>
						{conv.subject && (
							<p className="text-xs text-muted-foreground truncate mt-0.5">{conv.subject}</p>
						)}
						<p className="text-xs text-gray-300 mt-1">
							{new Date(conv.lastMessageAt).toLocaleDateString("en-GB", {
								day: "numeric",
								month: "short",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</p>
						{conv.closedAt && (
							<Badge className="bg-gray-100 text-gray-500 text-xs mt-1">Closed</Badge>
						)}
					</button>
				);
			})}
		</div>
	);
}

// ─── Message Thread ─────────────────────────────────────────

function MessageThread({
	messages,
	currentUserId,
	isLoading,
	typingUser,
}: {
	messages: Message[];
	currentUserId: string;
	isLoading: boolean;
	typingUser: string | null;
}) {
	const bottomRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message count change only
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	if (isLoading) {
		return (
			<div className="flex-1 p-4 space-y-3">
				<Skeleton className="h-10 w-3/4" />
				<Skeleton className="h-10 w-1/2 ml-auto" />
				<Skeleton className="h-10 w-2/3" />
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-3">
			{messages.length === 0 && (
				<p className="text-center text-muted-foreground text-sm py-8">
					No messages yet. Start the conversation!
				</p>
			)}
			{messages.map((msg) => {
				const isMine = msg.senderId === currentUserId;
				return (
					<div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
						<div
							className={`max-w-[75%] rounded-2xl px-4 py-2 ${
								isMine
									? "bg-primary text-primary-foreground rounded-br-sm"
									: "bg-gray-100 text-gray-900 rounded-bl-sm"
							}`}
						>
							{!isMine && (
								<p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender.name}</p>
							)}
							<p className="text-sm whitespace-pre-wrap">{msg.body}</p>
							<p
								className={`text-xs mt-1 ${
									isMine ? "text-primary-foreground/60" : "text-gray-400"
								}`}
							>
								{new Date(msg.createdAt).toLocaleTimeString("en-GB", {
									hour: "2-digit",
									minute: "2-digit",
								})}
								{isMine && msg.readAt && " \u2713\u2713"}
							</p>
						</div>
					</div>
				);
			})}
			{typingUser && (
				<div className="flex justify-start">
					<div className="bg-gray-100 rounded-2xl px-4 py-2 rounded-bl-sm">
						<p className="text-xs text-gray-500 italic">{typingUser} is typing...</p>
					</div>
				</div>
			)}
			<div ref={bottomRef} />
		</div>
	);
}

// ─── Message Input ──────────────────────────────────────────

function MessageInput({
	onSend,
	onTyping,
	disabled,
}: {
	onSend: (body: string) => void;
	onTyping: () => void;
	disabled?: boolean;
}) {
	const [body, setBody] = useState("");
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = body.trim();
		if (!trimmed) return;
		onSend(trimmed);
		setBody("");
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setBody(e.target.value);
		if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
		onTyping();
		typingTimeoutRef.current = setTimeout(() => {
			// typing stopped
		}, 2000);
	};

	return (
		<form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
			<input
				type="text"
				value={body}
				onChange={handleChange}
				placeholder="Type a message..."
				maxLength={2000}
				disabled={disabled}
				className="flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
				aria-label="Message input"
			/>
			<button
				type="submit"
				disabled={!body.trim() || disabled}
				className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
				aria-label="Send message"
			>
				<Send className="h-4 w-4" />
			</button>
		</form>
	);
}

// ─── New Chat Dialog ────────────────────────────────────────

function NewChatDialog({
	onStart,
	onClose,
}: {
	onStart: (staffId: string, subject?: string) => void;
	onClose: () => void;
}) {
	const { data: staffData, isLoading } = trpc.messaging.listSchoolStaff.useQuery();
	const [selectedStaff, setSelectedStaff] = useState<string>("");
	const [subject, setSubject] = useState("");

	return (
		<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-lg">New Chat</CardTitle>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
						aria-label="Close"
					>
						<X className="h-5 w-5" />
					</button>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						<Skeleton className="h-10 w-full" />
					) : (
						<div>
							<label htmlFor="staff-select" className="text-sm font-medium mb-1 block">
								Select Staff Member
							</label>
							<select
								id="staff-select"
								value={selectedStaff}
								onChange={(e) => setSelectedStaff(e.target.value)}
								className="w-full rounded-md border p-2 text-sm"
							>
								<option value="">Choose a staff member...</option>
								{staffData?.staff?.map((s) => (
									<option key={s.userId} value={s.userId}>
										{s.name ?? "Unknown"} ({s.role})
									</option>
								))}
							</select>
						</div>
					)}
					<div>
						<label htmlFor="chat-subject" className="text-sm font-medium mb-1 block">
							Subject (optional)
						</label>
						<input
							id="chat-subject"
							type="text"
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder="e.g. Homework question"
							maxLength={200}
							className="w-full rounded-md border p-2 text-sm"
						/>
					</div>
					<button
						type="button"
						onClick={() => {
							if (selectedStaff) {
								onStart(selectedStaff, subject || undefined);
							}
						}}
						disabled={!selectedStaff}
						className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						Start Chat
					</button>
				</CardContent>
			</Card>
		</div>
	);
}

// ─── Parent View ────────────────────────────────────────────

function ParentView({ userId, sessionToken }: { userId: string; sessionToken?: string }) {
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
	const [showNewChat, setShowNewChat] = useState(false);
	const [typingUser, setTypingUser] = useState<string | null>(null);

	const utils = trpc.useUtils();

	const { data: conversations, isLoading: convsLoading } = trpc.chat.getConversations.useQuery();

	const { data: messagesData, isLoading: msgsLoading } = trpc.chat.getMessages.useQuery(
		{ conversationId: selectedConversationId ?? "" },
		{ enabled: !!selectedConversationId },
	);

	const sendMessageMutation = trpc.chat.sendMessage.useMutation({
		onSuccess: () => {
			if (selectedConversationId) {
				utils.chat.getMessages.invalidate({ conversationId: selectedConversationId });
				utils.chat.getConversations.invalidate();
			}
		},
	});

	const startConversationMutation = trpc.chat.startConversation.useMutation({
		onSuccess: (data) => {
			setSelectedConversationId(data.id);
			setShowNewChat(false);
			utils.chat.getConversations.invalidate();
		},
	});

	const markReadMutation = trpc.chat.markRead.useMutation({
		onSuccess: () => {
			utils.chat.getConversations.invalidate();
		},
	});

	// WebSocket integration
	const { lastMessage, sendWsMessage } = useChatWebSocket(sessionToken);

	useEffect(() => {
		if (!lastMessage) return;

		if (
			lastMessage.type === "chat:message" &&
			lastMessage.conversationId === selectedConversationId
		) {
			utils.chat.getMessages.invalidate({
				conversationId: selectedConversationId ?? undefined,
			});
			utils.chat.getConversations.invalidate();
		}

		if (
			lastMessage.type === "chat:typing" &&
			lastMessage.conversationId === selectedConversationId
		) {
			const name = lastMessage.userId ?? "Someone";
			setTypingUser(name);
			setTimeout(() => setTypingUser(null), 3000);
		}

		if (lastMessage.type === "chat:read") {
			utils.chat.getMessages.invalidate({
				conversationId: selectedConversationId ?? undefined,
			});
		}
	}, [lastMessage, selectedConversationId, utils]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: mark read only when conversation changes
	useEffect(() => {
		if (selectedConversationId) {
			markReadMutation.mutate({ conversationId: selectedConversationId });
		}
	}, [selectedConversationId]);

	const selectedConv = conversations?.find((c) => c.id === selectedConversationId);

	const handleSend = (body: string) => {
		if (!selectedConversationId) return;
		sendMessageMutation.mutate({ conversationId: selectedConversationId, body });
		sendWsMessage({
			type: "chat:message",
			conversationId: selectedConversationId,
			body,
		});
	};

	const handleTyping = () => {
		if (!selectedConversationId) return;
		sendWsMessage({
			type: "chat:typing",
			conversationId: selectedConversationId,
		});
	};

	return (
		<div className="flex h-[calc(100vh-12rem)] rounded-lg border overflow-hidden">
			{/* Left panel - conversation list */}
			<div className="w-80 border-r flex flex-col bg-white">
				<div className="p-3 border-b flex items-center justify-between">
					<h3 className="font-semibold text-sm">Conversations</h3>
					<button
						type="button"
						onClick={() => setShowNewChat(true)}
						className="rounded-full bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 transition-colors"
						aria-label="New Chat"
					>
						<Plus className="h-4 w-4" />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-2">
					{convsLoading ? (
						<div className="space-y-2 p-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : !conversations?.length ? (
						<p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
					) : (
						<ConversationList
							conversations={conversations as unknown as Conversation[]}
							selectedId={selectedConversationId}
							onSelect={setSelectedConversationId}
							currentUserId={userId}
						/>
					)}
				</div>
			</div>

			{/* Right panel - message thread */}
			<div className="flex-1 flex flex-col bg-white">
				{selectedConversationId ? (
					<>
						<div className="p-3 border-b flex items-center gap-3">
							<MessageCircle className="h-5 w-5 text-primary" />
							<div>
								<p className="font-medium text-sm">
									{selectedConv
										? selectedConv.parentId === userId
											? selectedConv.staff.name
											: selectedConv.parent.name
										: "Chat"}
								</p>
								{selectedConv?.subject && (
									<p className="text-xs text-muted-foreground">{selectedConv.subject}</p>
								)}
							</div>
						</div>
						<MessageThread
							messages={(messagesData?.items ?? []) as Message[]}
							currentUserId={userId}
							isLoading={msgsLoading}
							typingUser={typingUser}
						/>
						<MessageInput
							onSend={handleSend}
							onTyping={handleTyping}
							disabled={!!selectedConv?.closedAt}
						/>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="text-center">
							<MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
							<p className="text-sm">Select a conversation or start a new chat</p>
						</div>
					</div>
				)}
			</div>

			{showNewChat && (
				<NewChatDialog
					onStart={(staffId, subject) => {
						startConversationMutation.mutate({ staffId, subject });
					}}
					onClose={() => setShowNewChat(false)}
				/>
			)}
		</div>
	);
}

// ─── Staff View ─────────────────────────────────────────────

function StaffView({
	userId,
	schoolId,
	sessionToken,
}: { userId: string; schoolId: string; sessionToken?: string }) {
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
	const [typingUser, setTypingUser] = useState<string | null>(null);

	const utils = trpc.useUtils();

	const { data: conversations, isLoading: convsLoading } = trpc.chat.getConversations.useQuery();

	const { data: messagesData, isLoading: msgsLoading } = trpc.chat.getMessages.useQuery(
		{ conversationId: selectedConversationId ?? "" },
		{ enabled: !!selectedConversationId },
	);

	const sendMessageMutation = trpc.chat.sendMessage.useMutation({
		onSuccess: () => {
			if (selectedConversationId) {
				utils.chat.getMessages.invalidate({ conversationId: selectedConversationId });
				utils.chat.getConversations.invalidate();
			}
		},
	});

	const closeConversationMutation = trpc.chat.closeConversation.useMutation({
		onSuccess: () => {
			utils.chat.getConversations.invalidate();
			if (selectedConversationId) {
				utils.chat.getMessages.invalidate({ conversationId: selectedConversationId });
			}
		},
	});

	const markReadMutation = trpc.chat.markRead.useMutation({
		onSuccess: () => {
			utils.chat.getConversations.invalidate();
		},
	});

	// WebSocket integration
	const { lastMessage, sendWsMessage } = useChatWebSocket(sessionToken);

	useEffect(() => {
		if (!lastMessage) return;

		if (
			lastMessage.type === "chat:message" &&
			lastMessage.conversationId === selectedConversationId
		) {
			utils.chat.getMessages.invalidate({
				conversationId: selectedConversationId ?? undefined,
			});
			utils.chat.getConversations.invalidate();
		}

		if (
			lastMessage.type === "chat:typing" &&
			lastMessage.conversationId === selectedConversationId
		) {
			const name = lastMessage.userId ?? "Someone";
			setTypingUser(name);
			setTimeout(() => setTypingUser(null), 3000);
		}
	}, [lastMessage, selectedConversationId, utils]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: mark read only when conversation changes
	useEffect(() => {
		if (selectedConversationId) {
			markReadMutation.mutate({ conversationId: selectedConversationId });
		}
	}, [selectedConversationId]);

	const selectedConv = conversations?.find((c) => c.id === selectedConversationId);

	const handleSend = (body: string) => {
		if (!selectedConversationId) return;
		sendMessageMutation.mutate({ conversationId: selectedConversationId, body });
		sendWsMessage({
			type: "chat:message",
			conversationId: selectedConversationId,
			body,
		});
	};

	const handleTyping = () => {
		if (!selectedConversationId) return;
		sendWsMessage({
			type: "chat:typing",
			conversationId: selectedConversationId,
		});
	};

	return (
		<div className="flex h-[calc(100vh-12rem)] rounded-lg border overflow-hidden">
			{/* Left panel - inbox */}
			<div className="w-80 border-r flex flex-col bg-white">
				<div className="p-3 border-b">
					<h3 className="font-semibold text-sm">Inbox</h3>
				</div>
				<div className="flex-1 overflow-y-auto p-2">
					{convsLoading ? (
						<div className="space-y-2 p-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : !conversations?.length ? (
						<p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
					) : (
						<ConversationList
							conversations={conversations as unknown as Conversation[]}
							selectedId={selectedConversationId}
							onSelect={setSelectedConversationId}
							currentUserId={userId}
						/>
					)}
				</div>
			</div>

			{/* Right panel - message thread */}
			<div className="flex-1 flex flex-col bg-white">
				{selectedConversationId ? (
					<>
						<div className="p-3 border-b flex items-center justify-between">
							<div className="flex items-center gap-3">
								<MessageCircle className="h-5 w-5 text-primary" />
								<div>
									<p className="font-medium text-sm">
										{selectedConv ? selectedConv.parent.name : "Chat"}
									</p>
									{selectedConv?.subject && (
										<p className="text-xs text-muted-foreground">{selectedConv.subject}</p>
									)}
								</div>
							</div>
							{!selectedConv?.closedAt && (
								<button
									type="button"
									onClick={() =>
										closeConversationMutation.mutate({
											conversationId: selectedConversationId,
											schoolId,
										})
									}
									disabled={closeConversationMutation.isPending}
									className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
								>
									Close
								</button>
							)}
						</div>
						<MessageThread
							messages={(messagesData?.items ?? []) as Message[]}
							currentUserId={userId}
							isLoading={msgsLoading}
							typingUser={typingUser}
						/>
						<MessageInput
							onSend={handleSend}
							onTyping={handleTyping}
							disabled={!!selectedConv?.closedAt}
						/>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="text-center">
							<MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
							<p className="text-sm">Select a conversation from your inbox</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Admin View ─────────────────────────────────────────────

function AdminView({ userId, schoolId }: { userId: string; schoolId: string }) {
	const [viewAll, setViewAll] = useState(false);
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

	const { data: conversations, isLoading } = trpc.chat.getConversations.useQuery();

	const { data: messagesData, isLoading: msgsLoading } = trpc.chat.getMessages.useQuery(
		{ conversationId: selectedConversationId ?? "" },
		{ enabled: !!selectedConversationId && !viewAll },
	);

	const { data: adminMessagesData, isLoading: adminMsgsLoading } =
		trpc.chat.adminGetConversation.useQuery(
			{ conversationId: selectedConversationId ?? "", schoolId },
			{ enabled: !!selectedConversationId && viewAll },
		);

	const displayMessages = viewAll
		? (adminMessagesData?.messages ?? [])
		: (messagesData?.items ?? []);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={viewAll}
						onChange={(e) => {
							setViewAll(e.target.checked);
							setSelectedConversationId(null);
						}}
						className="rounded border-gray-300"
					/>
					View all school conversations (read-only)
				</label>
			</div>

			<div className="flex h-[calc(100vh-14rem)] rounded-lg border overflow-hidden">
				<div className="w-80 border-r flex flex-col bg-white">
					<div className="p-3 border-b">
						<h3 className="font-semibold text-sm">
							{viewAll ? "All Conversations" : "My Conversations"}
						</h3>
					</div>
					<div className="flex-1 overflow-y-auto p-2">
						{isLoading ? (
							<div className="space-y-2 p-2">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						) : !conversations?.length ? (
							<p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
						) : (
							<ConversationList
								conversations={conversations as unknown as Conversation[]}
								selectedId={selectedConversationId}
								onSelect={setSelectedConversationId}
								currentUserId={userId}
							/>
						)}
					</div>
				</div>

				<div className="flex-1 flex flex-col bg-white">
					{selectedConversationId ? (
						<>
							<div className="p-3 border-b flex items-center gap-3">
								<MessageCircle className="h-5 w-5 text-primary" />
								<span className="font-medium text-sm">{viewAll ? "Read-only view" : "Chat"}</span>
							</div>
							<MessageThread
								messages={displayMessages as Message[]}
								currentUserId={userId}
								isLoading={viewAll ? adminMsgsLoading : msgsLoading}
								typingUser={null}
							/>
							{!viewAll && <MessageInput onSend={() => {}} onTyping={() => {}} disabled />}
						</>
					) : (
						<div className="flex-1 flex items-center justify-center text-muted-foreground">
							<div className="text-center">
								<MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
								<p className="text-sm">Select a conversation to view</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Main Page ──────────────────────────────────────────────

export default function ChatPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();

	const isStaff = !!session?.staffRole && !!session?.schoolId;
	const isAdmin = session?.staffRole === "ADMIN";
	const userId = (session as { userId?: string })?.userId ?? "";

	// Get session token for WebSocket auth
	const sessionToken =
		typeof window !== "undefined"
			? document.cookie
					.split("; ")
					.find((c) => c.startsWith("better-auth.session_token="))
					?.split("=")[1]
			: undefined;

	if (!features.liveChatEnabled) {
		return <FeatureDisabled featureName="Live Chat" />;
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold">Chat</h1>
				<p className="text-muted-foreground">
					{isAdmin
						? "Manage and monitor school conversations"
						: isStaff
							? "Chat with parents"
							: "Chat with your child's school staff"}
				</p>
			</div>

			{isAdmin && session.schoolId ? (
				<AdminView userId={userId} schoolId={session.schoolId} />
			) : isStaff && session.schoolId ? (
				<StaffView userId={userId} schoolId={session.schoolId} sessionToken={sessionToken} />
			) : (
				<ParentView userId={userId} sessionToken={sessionToken} />
			)}
		</div>
	);
}
