"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function MessagesPage() {
	const { data: session, isLoading: sessionLoading } = trpc.auth.getSession.useQuery();
	const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
	const [messageInput, setMessageInput] = useState("");

	const { data: messages, isLoading: messagesLoading } = trpc.messaging.listReceived.useQuery(
		{ limit: 20 },
		{ enabled: !!session && !session.staffRole }
	);

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

	const selectedMessage = messages?.items.find((m) => m.id === selectedMessageId);

	// Auto-select first message if none selected
	if (!selectedMessageId && messages?.items && messages.items.length > 0) {
		setSelectedMessageId(messages.items[0].id);
	}

	return (
		<main className="flex h-[calc(100vh-120px)] -mx-10 -my-10">
			{/* Left Sidebar - Conversation List */}
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
						/>
					</div>
				</div>

				{/* Filter Tabs */}
				<div className="px-4 py-3 border-b">
					<div className="flex gap-2">
						<button
							type="button"
							className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg"
						>
							All Chats
						</button>
						<button
							type="button"
							className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200"
						>
							Unread
						</button>
						<button
							type="button"
							className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200"
						>
							Teachers
						</button>
					</div>
				</div>

				{/* Conversation List */}
				<div className="flex-1 overflow-y-auto">
					{messages?.items && messages.items.length > 0 ? (
						messages.items.map((message) => (
							<div
								key={message.id}
								onClick={() => setSelectedMessageId(message.id)}
								className={`group flex items-center gap-3 p-3 cursor-pointer transition-colors ${
									selectedMessageId === message.id
										? "bg-orange-50 border-l-4 border-primary"
										: "hover:bg-gray-50"
								}`}
							>
								<div className="relative">
									<div className="w-12 h-12 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-sm">
										{message.schoolName?.[0] || "S"}
									</div>
									{!message.isRead && (
										<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-baseline mb-1">
										<h3 className="font-semibold text-gray-900 truncate text-sm">
											{message.schoolName}
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
								{!message.isRead && (
									<div className="w-5 h-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
										!
									</div>
								)}
							</div>
						))
					) : (
						<div className="p-8 text-center text-gray-500">
							<span className="material-symbols-rounded text-4xl mb-2 text-gray-300">
								inbox
							</span>
							<p className="text-sm">No messages yet</p>
						</div>
					)}
				</div>
			</aside>

			{/* Right Panel - Message Thread */}
			<section className="flex-1 flex flex-col bg-background">
				{selectedMessage ? (
					<>
						{/* Contact Header */}
						<div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 p-4 flex justify-between items-center">
							<div className="flex items-center gap-3">
								<div className="relative">
									<div className="w-10 h-10 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary font-bold">
										{selectedMessage.schoolName?.[0] || "S"}
									</div>
									<div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
								</div>
								<div>
									<h2 className="text-lg font-bold text-gray-900 leading-tight">
										{selectedMessage.schoolName}
									</h2>
									<p className="text-xs text-gray-500 font-medium">
										{selectedMessage.category} • School Message
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									className="p-2 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-full transition-all"
									title="View Profile"
								>
									<span className="material-symbols-rounded">info</span>
								</button>
								<button
									type="button"
									className="p-2 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-full transition-all"
									title="More Options"
								>
									<span className="material-symbols-rounded">more_vert</span>
								</button>
							</div>
						</div>

						{/* Messages Area */}
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

							{/* Received Message */}
							<div className="flex gap-3 max-w-2xl">
								<div className="w-8 h-8 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-1">
									{selectedMessage.schoolName?.[0] || "S"}
								</div>
								<div className="flex flex-col gap-1">
									<Card className="bg-white p-4 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
										<div className="mb-2">
											<h3 className="font-semibold text-gray-900 mb-1">
												{selectedMessage.subject}
											</h3>
											<Badge variant="secondary" className="text-xs">
												{selectedMessage.category}
											</Badge>
										</div>
										<div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
											{selectedMessage.body}
										</div>
									</Card>
									<span className="text-[10px] text-gray-400 ml-1">
										{new Date(selectedMessage.createdAt).toLocaleTimeString(undefined, {
											hour: "numeric",
											minute: "2-digit",
										})}
									</span>
								</div>
							</div>
						</div>

						{/* Input Area */}
						<div className="bg-white border-t border-gray-200 p-4">
							<div className="max-w-4xl mx-auto flex items-end gap-3">
								<button
									type="button"
									className="p-3 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
								>
									<span className="material-symbols-rounded">add_circle_outline</span>
								</button>
								<div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all flex items-center shadow-inner">
									<textarea
										value={messageInput}
										onChange={(e) => setMessageInput(e.target.value)}
										placeholder="Type your message..."
										rows={1}
										className="flex-1 bg-transparent px-5 py-3.5 text-sm resize-none focus:outline-none placeholder:text-gray-400"
									/>
									<button
										type="button"
										className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
									>
										<span className="material-symbols-rounded">sentiment_satisfied</span>
									</button>
								</div>
								<button
									type="button"
									className="p-3 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
								>
									<span className="material-symbols-rounded">mic</span>
								</button>
								<button
									type="button"
									className="p-3 bg-primary hover:bg-orange-600 text-white rounded-full transition-all flex-shrink-0 shadow-lg"
								>
									<span className="material-symbols-rounded">send</span>
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-gray-400">
						<div className="text-center">
							<span className="material-symbols-rounded text-6xl mb-4 text-gray-300">
								chat_bubble_outline
							</span>
							<p className="text-lg">Select a conversation to view messages</p>
						</div>
					</div>
				)}
			</section>
		</main>
	);
}
