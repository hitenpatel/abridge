"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { User } from "lucide-react";

const EMOJI_MAP: Record<string, string> = {
	HEART: "\u2764\uFE0F",
	THUMBS_UP: "\uD83D\uDC4D",
	CLAP: "\uD83D\uDC4F",
	LAUGH: "\uD83D\uDE02",
	WOW: "\uD83D\uDE2E",
};

interface ClassPostListProps {
	schoolId: string;
	yearGroup: string;
	className: string;
}

export function ClassPostList({ schoolId, yearGroup, className }: ClassPostListProps) {
	const { data, isLoading } = trpc.classPost.listByClass.useQuery({
		schoolId,
		yearGroup,
		className,
		limit: 20,
	});

	if (isLoading) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-32 w-full rounded-xl" />
				))}
			</div>
		);
	}

	if (!data?.items.length) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p className="text-sm">No posts for this class yet</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{data.items.map((post) => (
				<Card key={post.id}>
					<CardContent className="p-4 space-y-2">
						<div className="flex items-center gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
								<User className="h-3.5 w-3.5 text-muted-foreground" />
							</div>
							<span className="text-xs text-muted-foreground">
								{format(new Date(post.createdAt), "d MMM yyyy, h:mm a")}
							</span>
						</div>

						{post.body && <p className="text-sm text-foreground">{post.body}</p>}

						{Array.isArray(post.mediaUrls) && (post.mediaUrls as string[]).length > 0 && (
							<div className="flex gap-1">
								{(post.mediaUrls as string[]).slice(0, 4).map((url: string) => (
									<img key={url} src={url} alt="Media" className="h-16 w-16 rounded object-cover" />
								))}
								{(post.mediaUrls as string[]).length > 4 && (
									<div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
										+{(post.mediaUrls as string[]).length - 4}
									</div>
								)}
							</div>
						)}

						<div className="flex items-center gap-2 pt-1 border-t">
							{Object.entries(post.reactionCounts).map(([emoji, count]) => (
								<Badge key={emoji} variant="secondary" className="gap-1">
									<span>{EMOJI_MAP[emoji] ?? emoji}</span>
									<span>{count as number}</span>
								</Badge>
							))}
							{post.totalReactions > 0 && (
								<span className="text-xs text-muted-foreground ml-auto">
									Seen by {post.totalReactions}
								</span>
							)}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
