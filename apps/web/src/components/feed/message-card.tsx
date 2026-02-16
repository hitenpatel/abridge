"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Mail } from "lucide-react";

type MessageCategory = "URGENT" | "STANDARD" | "FYI";

interface MessageCardProps {
	subject: string;
	body: string;
	category: MessageCategory;
	authorName?: string;
	timestamp: Date | string;
	isRead: boolean;
}

const CATEGORY_VARIANT: Record<MessageCategory, "destructive" | "secondary" | "info"> = {
	URGENT: "destructive",
	STANDARD: "secondary",
	FYI: "info",
};

export function MessageCard({ subject, body, category, timestamp, isRead }: MessageCardProps) {
	const ts = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

	return (
		<Card className={cn(!isRead && "ring-1 ring-primary/20")}>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
						<Mail className="h-4 w-4 text-blue-600" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							{!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
							<h4
								className={cn(
									"text-sm truncate",
									isRead ? "font-normal text-foreground" : "font-semibold text-foreground",
								)}
							>
								{subject}
							</h4>
						</div>
						<p className="text-xs text-muted-foreground line-clamp-2 mb-2">{body}</p>
						<div className="flex items-center gap-2">
							<Badge variant={CATEGORY_VARIANT[category]}>{category}</Badge>
							<span className="text-xs text-muted-foreground">{format(ts, "d MMM, h:mm a")}</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
