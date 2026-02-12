"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface MessageListProps {
	schoolId: string;
}

const BADGE_VARIANT: Record<string, "destructive" | "info" | "secondary"> = {
	URGENT: "destructive",
	STANDARD: "info",
	FYI: "secondary",
};

export function MessageList({ schoolId }: MessageListProps) {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, isError } = trpc.messaging.listSent.useQuery({
		schoolId,
		page,
		limit,
	});

	if (isLoading) {
		return <div className="p-4 text-center text-muted-foreground">Loading messages...</div>;
	}

	if (isError) {
		return <div className="p-4 text-center text-destructive">Failed to load messages.</div>;
	}

	if (!data || data.data.length === 0) {
		return <div className="p-4 text-center text-muted-foreground">No messages sent yet.</div>;
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
								<TableHead>Recipients</TableHead>
								<TableHead>Read Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.data.map((message) => (
								<TableRow key={message.id}>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{new Date(message.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="whitespace-nowrap font-medium text-foreground">
										{message.subject}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										<Badge variant={BADGE_VARIANT[message.category] || "secondary"}>
											{message.category}
										</Badge>
									</TableCell>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{message.recipientCount}
									</TableCell>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{message.readCount} / {message.recipientCount}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<div className="flex justify-between items-center px-4">
				<Button
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					disabled={page === 1}
					className="disabled:opacity-50"
				>
					Previous
				</Button>
				<span className="text-sm text-muted-foreground">
					Page {page} of {data.totalPages}
				</span>
				<Button
					onClick={() => setPage((p) => p + 1)}
					disabled={page >= data.totalPages}
					className="disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	);
}
