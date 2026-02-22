"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type ViewTab = "messages" | "direct";

export default function MessagesPage() {
	const features = useFeatureToggles();
	const utils = trpc.useUtils();
	const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
	const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<ViewTab>("messages");
	const [replyInput, setReplyInput] = useState("");
	const [dmInput, setDmInput] = useState("");
	const [staffPickerOpen, setStaffPickerOpen] = useState(false);
	const [newConvoBody, setNewConvoBody] = useState("");
	const [showOriginal, setShowOriginal] = useState(false);
	const [translatedSubject, setTranslatedSubject] = useState<string | null>(null);
	const [translatedBody, setTranslatedBody] = useState<string | null>(null);
	const { userLang, translate, isTranslating } = useTranslation();

	const isStaff = !!session?.staffRole && !!session?.schoolId;

	// Parent inbox
	const { data: receivedMessages, isLoading: receivedLoading } =
		trpc.messaging.listReceived.useQuery({ limit: 20 }, { enabled: !!session && !isStaff });

	// Staff sent messages
	const { data: sentMessages, isLoading: sentLoading } = trpc.messaging.listSent.useQuery(
		{ schoolId: session?.schoolId ?? "", limit: 20 },
		{ enabled: !!session && isStaff },
	);

	// Conversations
	const { data: conversations } = trpc.messaging.listConversations.useQuery(
		{ limit: 20 },
		{ enabled: !!session },
	);

	// Replies for selected broadcast message
	const { data: repliesData } = trpc.messaging.listReplies.useQuery(
		{ messageId: selectedMessageId ?? "" },
		{ enabled: !!selectedMessageId && activeTab === "messages" },
	);

	// Conversation messages
	const { data: convoData } = trpc.messaging.getConversation.useQuery(
		{ conversationId: selectedConversationId ?? "" },
		{ enabled: !!selectedConversationId && activeTab === "direct" },
	);

	// Staff list for new conversation (parent only)
	const { data: staffData } = trpc.messaging.listSchoolStaff.useQuery(undefined, {
		enabled: !!session && !isStaff,
	});

	// Mutations
	const replyMutation = trpc.messaging.reply.useMutation({
		onSuccess: () => {
			setReplyInput("");
			if (selectedMessageId) {
				utils.messaging.listReplies.invalidate({ messageId: selectedMessageId });
			}
		},
	});

	const sendDirectMutation = trpc.messaging.sendDirect.useMutation({
		onSuccess: () => {
			setDmInput("");
			if (selectedConversationId) {
				utils.messaging.getConversation.invalidate({ conversationId: selectedConversationId });
				utils.messaging.listConversations.invalidate();
			}
		},
	});

	const createConversationMutation = trpc.messaging.createConversation.useMutation({
		onSuccess: (data) => {
			setStaffPickerOpen(false);
			setNewConvoBody("");
			setActiveTab("direct");
			setSelectedConversationId(data.conversationId);
			utils.messaging.listConversations.invalidate();
		},
	});

	const closeConversationMutation = trpc.messaging.closeConversation.useMutation({
		onSuccess: () => {
			if (selectedConversationId) {
				utils.messaging.getConversation.invalidate({ conversationId: selectedConversationId });
				utils.messaging.listConversations.invalidate();
			}
		},
	});

	// Translate selected message when language is not English
	useEffect(() => {
		if (!selectedMessage || userLang === "en") {
			setTranslatedSubject(null);
			setTranslatedBody(null);
			return;
		}
		setShowOriginal(false);
		translate([selectedMessage.subject, selectedMessage.body]).then(([subject, body]) => {
			setTranslatedSubject(subject ?? null);
			setTranslatedBody(body ?? null);
		});
	}, [selectedMessageId, userLang]);

	if (!features.messagingEnabled) return <FeatureDisabled featureName="Messaging" />;

	const messagesLoading = isStaff ? sentLoading : receivedLoading;

	if (sessionLoading || messagesLoading) {
		return (
			<div className="flex h-[calc(100vh-120px)]">
				<div className="w-80 lg:w-96 border-r p-4 space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
				<div className="flex-1 p-4">
					<Skeleton className="h-full w-full" />
				</div>
			</div>
		);
	}

	// Normalize message list
	// biome-ignore lint/suspicious/noExplicitAny: merging two different tRPC response shapes
	const allMessages: any[] = isStaff ? sentMessages?.data ?? [] : receivedMessages?.items ?? [];

	const selectedMessage = allMessages.find((m) => m.id === selectedMessageId);

	const filteredMessages = categoryFilter
		? allMessages.filter((m) => m.category === categoryFilter)
		: allMessages;

	// Auto-select first message if none selected
	if (activeTab === "messages" && !selectedMessageId && allMessages.length > 0) {
		setSelectedMessageId(allMessages[0].id);
	}

	const handleSendReply = () => {
		if (!replyInput.trim() || !selectedMessageId) return;
		replyMutation.mutate({ messageId: selectedMessageId, body: replyInput.trim() });
	};

	const handleSendDirect = () => {
		if (!dmInput.trim() || !selectedConversationId) return;
		sendDirectMutation.mutate({ conversationId: selectedConversationId, body: dmInput.trim() });
	};

	const handleStartConversation = (staffId: string) => {
		if (!newConvoBody.trim()) return;
		createConversationMutation.mutate({ staffId, body: newConvoBody.trim() });
	};

	const handleTabChange = (tab: ViewTab) => {
		setActiveTab(tab);
		if (tab === "messages") {
			setSelectedConversationId(null);
		} else {
			setSelectedMessageId(null);
		}
	};

	return (
		<main className="flex h-[calc(100vh-120px)] -mx-10 -my-10">
			{/* Left Sidebar */}
			<aside className="w-80 lg:w-96 border-r bg-card flex flex-col">
				{/* Search */}
				<div className="p-4 border-b">
					<div className="relative">
						<span className="material-symbols-rounded absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
							search
						</span>
						<input
							type="text"
							placeholder="Search messages..."
							className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
							data-testid="search-input"
						/>
					</div>
				</div>

				{/* View Tabs: Messages / Direct */}
				<div className="px-4 py-3 border-b">
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => handleTabChange("messages")}
							className={cn(
								"px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
								activeTab === "messages"
									? "bg-primary text-white"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200",
							)}
						>
							Messages
						</button>
						<button
							type="button"
							onClick={() => handleTabChange("direct")}
							data-testid="direct-tab"
							className={cn(
								"px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
								activeTab === "direct"
									? "bg-primary text-white"
									: "bg-gray-100 text-gray-600 hover:bg-gray-200",
							)}
						>
							Direct
						</button>
						{!isStaff && (
							<button
								type="button"
								onClick={() => setStaffPickerOpen(true)}
								data-testid="new-conversation-button"
								className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
							>
								New Message
							</button>
						)}
					</div>
				</div>

				{/* Category Filter (messages tab only) */}
				{activeTab === "messages" && (
					<div className="px-4 py-2 border-b flex gap-2 flex-wrap">
						{[
							{ key: null, label: "All Categories" },
							{ key: "URGENT", label: "Urgent", testId: "filter-urgent" },
							{ key: "STANDARD", label: "Standard", testId: "filter-standard" },
							{ key: "FYI", label: "FYI", testId: "filter-fyi" },
						].map((cat) => (
							<button
								key={cat.label}
								type="button"
								data-testid={cat.testId}
								onClick={() => setCategoryFilter(cat.key)}
								className={cn(
									"px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
									categoryFilter === cat.key
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground hover:bg-accent",
								)}
							>
								{cat.label}
							</button>
						))}
					</div>
				)}

				{/* List */}
				<div className="flex-1 overflow-y-auto" data-testid="messages-list">
					{activeTab === "messages" ? (
						// Broadcast message list
						filteredMessages && filteredMessages.length > 0 ? (
							filteredMessages.map((message) => (
								<div
									key={message.id}
									onClick={() => {
										setSelectedMessageId(message.id);
										setSelectedConversationId(null);
									}}
									onKeyDown={(e) =>
										(e.key === "Enter" || e.key === " ") && setSelectedMessageId(message.id)
									}
									role="button"
									tabIndex={0}
									data-testid="message-item"
									className={cn(
										"group flex items-center gap-3 p-3 cursor-pointer transition-colors",
										selectedMessageId === message.id
											? "bg-orange-50 border-l-4 border-primary"
											: "hover:bg-gray-50",
									)}
								>
									<div className="relative">
										<div className="w-12 h-12 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-sm">
											{message.schoolName?.[0] || message.subject?.[0] || "S"}
										</div>
										{message.isRead === false && (
											<div
												data-testid="unread-badge"
												className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
											/>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-baseline mb-1">
											<h3 className="font-semibold text-gray-900 truncate text-sm">
												{message.schoolName || message.subject}
											</h3>
											<span className="text-xs text-gray-400">
												{new Date(message.createdAt).toLocaleDateString(undefined, {
													month: "short",
													day: "numeric",
												})}
											</span>
										</div>
										<p className="text-sm text-gray-500 truncate">{message.subject}</p>
									</div>
									<div className="flex items-center gap-1">
										{message.replyCount > 0 && (
											<span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium" data-testid="reply-count-badge">
												{message.replyCount}
											</span>
										)}
										{message.isRead === false && (
											<div className="w-5 h-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
												!
											</div>
										)}
									</div>
								</div>
							))
						) : (
							<div className="p-8 text-center text-gray-500" data-testid="empty-messages">
								<span className="material-symbols-rounded text-4xl mb-2 text-gray-300">inbox</span>
								<p className="text-sm">No messages yet</p>
							</div>
						)
					) : (
						// Conversations list
						conversations?.items && conversations.items.length > 0 ? (
							conversations.items.map((convo) => (
								<div
									key={convo.id}
									onClick={() => {
										setSelectedConversationId(convo.id);
										setSelectedMessageId(null);
									}}
									onKeyDown={(e) =>
										(e.key === "Enter" || e.key === " ") && setSelectedConversationId(convo.id)
									}
									role="button"
									tabIndex={0}
									data-testid="conversation-item"
									className={cn(
										"group flex items-center gap-3 p-3 cursor-pointer transition-colors",
										selectedConversationId === convo.id
											? "bg-orange-50 border-l-4 border-primary"
											: "hover:bg-gray-50",
									)}
								>
									<div className="w-12 h-12 rounded-[20px] bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
										{(isStaff ? convo.parent.name?.[0] : convo.staff.name?.[0]) || "?"}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-baseline mb-1">
											<h3 className="font-semibold text-gray-900 truncate text-sm">
												{isStaff ? convo.parent.name : convo.staff.name}
											</h3>
											<span className="text-xs text-gray-400">
												{new Date(convo.lastMessageAt).toLocaleDateString(undefined, {
													month: "short",
													day: "numeric",
												})}
											</span>
										</div>
										<p className="text-sm text-gray-500 truncate">
											{convo.lastMessage?.body || convo.subject || "No messages"}
										</p>
									</div>
									{convo.closedAt && (
										<Badge variant="secondary" className="text-xs shrink-0">Closed</Badge>
									)}
								</div>
							))
						) : (
							<div className="p-8 text-center text-gray-500" data-testid="empty-conversations">
								<span className="material-symbols-rounded text-4xl mb-2 text-gray-300">forum</span>
								<p className="text-sm">No conversations yet</p>
							</div>
						)
					)}
				</div>
			</aside>

			{/* Right Panel */}
			<section className="flex-1 flex flex-col bg-background" data-testid="message-detail">
				{activeTab === "messages" && selectedMessage ? (
					<>
						{/* Message Header */}
						<div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 p-4 flex justify-between items-center">
							<div className="flex items-center gap-3">
								<div className="relative">
									<div className="w-10 h-10 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary font-bold">
										{selectedMessage.schoolName?.[0] || selectedMessage.subject?.[0] || "S"}
									</div>
									<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
								</div>
								<div>
									<h2 className="text-lg font-bold text-gray-900 leading-tight">
										{selectedMessage.schoolName || "Sent Message"}
									</h2>
									<p className="text-xs text-gray-500 font-medium">
										{selectedMessage.category} • School Message
									</p>
								</div>
							</div>
						</div>

						{/* Messages Area with Replies */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
							{/* Date Separator */}
							<div className="flex justify-center">
								<span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
									{new Date(selectedMessage.createdAt).toLocaleDateString(undefined, {
										weekday: "long",
										month: "short",
										day: "numeric",
									})}
								</span>
							</div>

							{/* Original Broadcast Message */}
							<div className="flex gap-3 max-w-2xl">
								<div className="w-8 h-8 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-1">
									{selectedMessage.schoolName?.[0] || selectedMessage.subject?.[0] || "S"}
								</div>
								<div className="flex flex-col gap-1">
									<Card className="bg-white p-4 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
										<div className="mb-2">
											<h3 className="font-semibold text-gray-900 mb-1">
												{showOriginal || !translatedSubject ? selectedMessage.subject : translatedSubject}
											</h3>
											<Badge variant="secondary" className="text-xs">
												{selectedMessage.category}
											</Badge>
										</div>
										<div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
											{showOriginal || !translatedBody ? selectedMessage.body : translatedBody}
										</div>
										{translatedBody && (
											<div className="mt-2 flex items-center gap-2">
												<span className="text-xs text-blue-600 font-medium" data-testid="translated-indicator">
													{isTranslating ? "Translating..." : "Translated"}
												</span>
												<button
													type="button"
													onClick={() => setShowOriginal(!showOriginal)}
													className="text-xs text-gray-500 underline hover:text-gray-700"
													data-testid="show-original-toggle"
												>
													{showOriginal ? "Show translation" : "Show original"}
												</button>
											</div>
										)}
									</Card>
									<span className="text-[10px] text-gray-400 ml-1">
										{new Date(selectedMessage.createdAt).toLocaleTimeString(undefined, {
											hour: "numeric",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>

							{/* Reply Thread */}
							{repliesData?.items && repliesData.items.length > 0 && (
								<div className="space-y-4 ml-11" data-testid="reply-thread">
									<div className="flex items-center gap-2 text-xs text-gray-500">
										<div className="h-px flex-1 bg-gray-200" />
										<span>{repliesData.items.length} {repliesData.items.length === 1 ? "reply" : "replies"}</span>
										<div className="h-px flex-1 bg-gray-200" />
									</div>
									{repliesData.items.map((reply) => {
										const isOwnReply = reply.authorId === session?.userId;
										return (
											<div
												key={reply.id}
												data-testid="reply-item"
												className={cn("flex gap-3 max-w-xl", isOwnReply && "ml-auto flex-row-reverse")}
											>
												<div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 mt-1">
													{reply.authorName?.[0] || "?"}
												</div>
												<div className="flex flex-col gap-0.5">
													<div className={cn(
														"px-3 py-2 rounded-2xl text-sm",
														isOwnReply
															? "bg-primary text-white rounded-br-sm"
															: "bg-white border border-gray-100 rounded-bl-sm",
													)}>
														{reply.body}
													</div>
													<span className={cn("text-[10px] text-gray-400", isOwnReply ? "text-right mr-1" : "ml-1")}>
														{reply.authorName} • {new Date(reply.createdAt).toLocaleTimeString(undefined, {
															hour: "numeric",
															minute: "2-digit",
														})}
													</span>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						{/* Reply Input */}
						<div className="bg-white border-t border-gray-200 p-4">
							<div className="max-w-4xl mx-auto flex items-end gap-3">
								<div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all flex items-center shadow-inner">
									<textarea
										value={replyInput}
										onChange={(e) => setReplyInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												handleSendReply();
											}
										}}
										placeholder="Write a reply..."
										rows={1}
										data-testid="reply-input"
										className="flex-1 bg-transparent px-5 py-3.5 text-sm resize-none focus:outline-none placeholder:text-gray-400"
									/>
								</div>
								<button
									type="button"
									onClick={handleSendReply}
									disabled={!replyInput.trim() || replyMutation.isPending}
									data-testid="reply-send-button"
									className="p-3 bg-primary hover:bg-orange-600 text-white rounded-full transition-all flex-shrink-0 shadow-lg disabled:opacity-50"
								>
									<span className="material-symbols-rounded">send</span>
								</button>
							</div>
						</div>
					</>
				) : activeTab === "direct" && convoData ? (
					<>
						{/* Conversation Header */}
						<div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 p-4 flex justify-between items-center">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-[20px] bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
									{(isStaff ? convoData.conversation.parent.name?.[0] : convoData.conversation.staff.name?.[0]) || "?"}
								</div>
								<div>
									<h2 className="text-lg font-bold text-gray-900 leading-tight">
										{isStaff ? convoData.conversation.parent.name : convoData.conversation.staff.name}
									</h2>
									<p className="text-xs text-gray-500 font-medium">
										{convoData.conversation.subject || "Direct Message"}
										{convoData.conversation.closedAt && " • Closed"}
									</p>
								</div>
							</div>
							{isStaff && !convoData.conversation.closedAt && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => closeConversationMutation.mutate({ conversationId: convoData.conversation.id })}
									disabled={closeConversationMutation.isPending}
									data-testid="close-conversation-button"
								>
									Close
								</Button>
							)}
						</div>

						{/* Conversation Messages */}
						<div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
							{convoData.items.map((msg) => {
								const isOwn = msg.authorId === session?.userId;
								return (
									<div
										key={msg.id}
										className={cn("flex gap-3 max-w-xl", isOwn && "ml-auto flex-row-reverse")}
									>
										<div className={cn(
											"w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-1",
											isOwn ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-600",
										)}>
											{isOwn
												? (session?.name?.[0] || "Y")
												: ((isStaff ? convoData.conversation.parent.name?.[0] : convoData.conversation.staff.name?.[0]) || "?")}
										</div>
										<div className="flex flex-col gap-0.5">
											<div className={cn(
												"px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
												isOwn
													? "bg-primary text-white rounded-br-sm"
													: "bg-white border border-gray-100 rounded-bl-sm shadow-sm",
											)}>
												{msg.body}
											</div>
											<span className={cn("text-[10px] text-gray-400", isOwn ? "text-right mr-1" : "ml-1")}>
												{new Date(msg.createdAt).toLocaleTimeString(undefined, {
													hour: "numeric",
													minute: "2-digit",
												})}
											</span>
										</div>
									</div>
								);
							})}
							{convoData.conversation.closedAt && (
								<div className="flex justify-center py-4">
									<span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
										Conversation closed
									</span>
								</div>
							)}
						</div>

						{/* DM Input */}
						{!convoData.conversation.closedAt ? (
							<div className="bg-white border-t border-gray-200 p-4">
								<div className="max-w-4xl mx-auto flex items-end gap-3">
									<div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all flex items-center shadow-inner">
										<textarea
											value={dmInput}
											onChange={(e) => setDmInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && !e.shiftKey) {
													e.preventDefault();
													handleSendDirect();
												}
											}}
											placeholder="Type a message..."
											rows={1}
											data-testid="dm-input"
											className="flex-1 bg-transparent px-5 py-3.5 text-sm resize-none focus:outline-none placeholder:text-gray-400"
										/>
									</div>
									<button
										type="button"
										onClick={handleSendDirect}
										disabled={!dmInput.trim() || sendDirectMutation.isPending}
										data-testid="dm-send-button"
										className="p-3 bg-primary hover:bg-orange-600 text-white rounded-full transition-all flex-shrink-0 shadow-lg disabled:opacity-50"
									>
										<span className="material-symbols-rounded">send</span>
									</button>
								</div>
							</div>
						) : (
							<div className="bg-gray-50 border-t border-gray-200 p-4 text-center text-sm text-gray-500">
								This conversation is closed
							</div>
						)}
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-gray-400">
						<div className="text-center">
							<span className="material-symbols-rounded text-6xl mb-4 text-gray-300">
								{activeTab === "direct" ? "forum" : "chat_bubble_outline"}
							</span>
							<p className="text-lg">
								{activeTab === "direct"
									? "Select a conversation to view messages"
									: "Select a message to view"}
							</p>
						</div>
					</div>
				)}
			</section>

			{/* Staff Picker Dialog */}
			<Dialog open={staffPickerOpen} onOpenChange={setStaffPickerOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Message</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium text-gray-700 mb-1 block">Your message</label>
							<textarea
								value={newConvoBody}
								onChange={(e) => setNewConvoBody(e.target.value)}
								placeholder="Write your message..."
								rows={3}
								data-testid="new-convo-body"
								className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-gray-700 mb-2 block">Select staff member</label>
							<div className="space-y-1 max-h-60 overflow-y-auto">
								{staffData?.staff.map((s) => (
									<button
										key={s.userId}
										type="button"
										onClick={() => handleStartConversation(s.userId)}
										disabled={!newConvoBody.trim() || createConversationMutation.isPending}
										data-testid="staff-picker-item"
										className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
									>
										<div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
											{s.name?.[0] || "?"}
										</div>
										<div>
											<p className="text-sm font-medium">{s.name}</p>
											<p className="text-xs text-gray-500">{s.role}</p>
										</div>
									</button>
								))}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
