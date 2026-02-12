"use client";

import { MessageList } from "@/components/messaging/message-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useEffect, useState } from "react";

const BADGE_VARIANT: Record<string, "destructive" | "info" | "secondary"> = {
	URGENT: "destructive",
	STANDARD: "info",
	FYI: "secondary",
};

function ParentMessageList() {
	const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
	const utils = trpc.useUtils();
	const { data, isLoading, isError } = trpc.messaging.listReceived.useQuery({
		limit: 20,
	});

	const markRead = trpc.messaging.markRead.useMutation({
		onSuccess: () => {
			// Invalidate to refresh the list
			utils.messaging.listReceived.invalidate();
		},
	});

	// Mark message as read when selected
	useEffect(() => {
		if (selectedMessage && data) {
			const message = data.items.find((m) => m.id === selectedMessage);
			if (message && !message.isRead) {
				markRead.mutate({ messageId: message.id });
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedMessage]);

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[...Array(3)].map((_, i) => (
					<Card key={i}>
						<CardContent className="p-6">
							<Skeleton className="h-6 w-3/4 mb-2" />
							<Skeleton className="h-4 w-full mb-2" />
							<Skeleton className="h-4 w-1/2" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (isError) {
		return <div className="p-4 text-center text-destructive">Failed to load messages.</div>;
	}

	if (!data || data.items.length === 0) {
		return <div className="p-4 text-center text-muted-foreground">No messages yet.</div>;
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Subject</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>School</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.items.map((message) => (
								<TableRow
									key={message.id}
									className="cursor-pointer hover:bg-muted"
									onClick={() => setSelectedMessage(message.id)}
								>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{new Date(message.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										<span className={message.isRead ? "text-muted-foreground" : "font-semibold text-foreground"}>
											{message.subject}
										</span>
									</TableCell>
									<TableCell className="whitespace-nowrap">
										<Badge variant={BADGE_VARIANT[message.category] || "secondary"}>
											{message.category}
										</Badge>
									</TableCell>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{message.schoolName}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{message.isRead ? (
											<span className="text-muted-foreground text-sm">Read</span>
										) : (
											<Badge variant="info">Unread</Badge>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{selectedMessage && data && (() => {
				const message = data.items.find((m) => m.id === selectedMessage);
				if (!message) return null;

				return (
					<Card>
						<CardContent className="p-6">
							<div className="flex items-start justify-between mb-4">
								<div>
									<h3 className="text-xl font-semibold text-foreground mb-1">{message.subject}</h3>
									<p className="text-sm text-muted-foreground">
										{new Date(message.createdAt).toLocaleString()} • {message.schoolName}
									</p>
								</div>
								<Badge variant={BADGE_VARIANT[message.category] || "secondary"}>
									{message.category}
								</Badge>
							</div>
							<div className="prose prose-sm max-w-none text-foreground">
								{message.body.split("\n").map((line, i) => (
									<p key={i}>{line}</p>
								))}
							</div>
						</CardContent>
					</Card>
				);
			})()}
		</div>
	);
}

export default function MessagesPage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole;
	const schoolId = session?.schoolId || "school-1";

	if (isLoading) {
		return (
			<div className="max-w-4xl mx-auto px-4">
				<Skeleton className="h-8 w-48 mb-6" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (isStaff) {
		// Staff view: Show sent messages
		return (
			<div className="max-w-4xl mx-auto px-4">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-foreground">Sent Messages</h1>
					<Link href="/dashboard/messages/new">
						<Button>Compose New</Button>
					</Link>
				</div>
				<MessageList schoolId={schoolId} />
			</div>
		);
	}

	// Parent view: Show received messages
	return (
		<div className="max-w-4xl mx-auto px-4">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-foreground">Messages</h1>
			</div>
			<ParentMessageList />
		</div>
	);
}
