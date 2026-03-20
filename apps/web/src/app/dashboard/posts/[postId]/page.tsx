"use client";

import { ReactionBar } from "@/components/feed/reaction-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Play, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

function isVideoUrl(url: string): boolean {
	return /\.(mp4|mov|webm|avi)$/i.test(url);
}

export default function PostDetailPage() {
	const params = useParams<{ postId: string }>();
	const utils = trpc.useUtils();
	const [expandedImage, setExpandedImage] = useState<string | null>(null);

	const { data: session } = trpc.auth.getSession.useQuery();
	const [editing, setEditing] = useState(false);
	const [editBody, setEditBody] = useState("");

	const updateMutation = trpc.classPost.update.useMutation({
		onSuccess: () => {
			toast.success("Post updated");
			setEditing(false);
			utils.classPost.getById.invalidate({ postId: params.postId });
		},
		onError: (err) => toast.error(err.message),
	});

	const { data: post, isLoading } = trpc.classPost.getById.useQuery(
		{ postId: params.postId },
		{ enabled: !!params.postId },
	);

	const reactMutation = trpc.classPost.react.useMutation({
		onSuccess: () => {
			utils.classPost.getById.invalidate({ postId: params.postId });
			utils.dashboard.getFeed.invalidate();
		},
	});

	const removeReactionMutation = trpc.classPost.removeReaction.useMutation({
		onSuccess: () => {
			utils.classPost.getById.invalidate({ postId: params.postId });
			utils.dashboard.getFeed.invalidate();
		},
	});

	const handleReact = useCallback(
		(emoji: Emoji) => {
			reactMutation.mutate({ postId: params.postId, emoji });
		},
		[reactMutation, params.postId],
	);

	const handleRemoveReaction = useCallback(() => {
		removeReactionMutation.mutate({ postId: params.postId });
	}, [removeReactionMutation, params.postId]);

	if (isLoading) {
		return (
			<div className="max-w-2xl mx-auto space-y-4">
				<div className="flex items-center gap-3">
					<Skeleton className="h-8 w-8 rounded" />
					<Skeleton className="h-6 w-32" />
				</div>
				<Card>
					<CardContent className="p-6 space-y-4">
						<div className="flex items-center gap-3">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-3 w-40" />
							</div>
						</div>
						<Skeleton className="h-5 w-full" />
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-64 w-full rounded-xl" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="max-w-2xl mx-auto text-center py-12">
				<p className="text-muted-foreground">Post not found</p>
				<Link href="/dashboard" className="mt-4 inline-block">
					<Button variant="ghost">Back to Feed</Button>
				</Link>
			</div>
		);
	}

	const ts = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
	const mediaUrlList = (Array.isArray(post.mediaUrls) ? post.mediaUrls : []) as string[];
	const images = mediaUrlList.filter((u: string) => !isVideoUrl(u));
	const videos = mediaUrlList.filter((u: string) => isVideoUrl(u));

	return (
		<>
			<PageShell maxWidth="4xl">
				<div className="space-y-6 p-6" data-testid="post-detail">
					<div className="flex items-center gap-3">
						<Link href="/dashboard">
							<Button variant="ghost" size="icon">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<h1 className="text-xl font-bold">Class Post</h1>
						{session?.id === post.authorId && !editing && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setEditBody(post.body ?? "");
									setEditing(true);
								}}
								data-testid="edit-post-button"
							>
								<Pencil className="h-4 w-4 mr-1" />
								Edit
							</Button>
						)}
						<span className="text-sm text-muted-foreground ml-auto">
							{post.yearGroup} {post.className}
						</span>
					</div>

					<Card>
						<CardContent className="p-6 space-y-4">
							{/* Author */}
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
									<User className="h-5 w-5 text-muted-foreground" />
								</div>
								<div>
									<p className="text-sm font-medium">{post.authorName}</p>
									<p className="text-xs text-muted-foreground">
										{format(ts, "EEEE d MMMM yyyy, h:mm a")}
									</p>
								</div>
							</div>

							{/* Body */}
							{editing ? (
								<div className="space-y-2">
									<Textarea
										value={editBody}
										onChange={(e) => setEditBody(e.target.value)}
										rows={4}
										maxLength={5000}
										data-testid="edit-post-body"
									/>
									<div className="flex gap-2">
										<Button
											size="sm"
											onClick={() =>
												updateMutation.mutate({
													schoolId: session?.schoolId ?? "",
													postId: post.id,
													body: editBody,
												})
											}
											disabled={updateMutation.isPending}
											data-testid="save-edit-button"
										>
											{updateMutation.isPending ? "Saving..." : "Save"}
										</Button>
										<Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
											Cancel
										</Button>
									</div>
								</div>
							) : (
								post.body && (
									<p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
										{post.body}
									</p>
								)
							)}

							{/* Images */}
							{images.length > 0 && (
								<div className="space-y-2">
									{images.map((url, i) => (
										<button
											key={url}
											type="button"
											onClick={() => setExpandedImage(url)}
											className="w-full overflow-hidden rounded-xl"
										>
											<img
												src={url}
												alt={`Post media ${i + 1}`}
												className="w-full max-h-96 object-cover hover:scale-105 transition-transform"
											/>
										</button>
									))}
								</div>
							)}

							{/* Videos */}
							{videos.map((url) => (
								<button
									key={url}
									type="button"
									onClick={() => window.open(url, "_blank")}
									className="relative w-full rounded-xl overflow-hidden bg-muted"
								>
									<video src={url} className="w-full h-64 object-cover" preload="metadata">
										<track kind="captions" />
									</video>
									<div className="absolute inset-0 flex items-center justify-center bg-black/30">
										<div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
											<Play className="h-6 w-6 text-foreground ml-0.5" />
										</div>
									</div>
								</button>
							))}

							{/* Reactions */}
							<ReactionBar
								reactionCounts={post.reactionCounts as Partial<Record<Emoji, number>>}
								myReaction={post.myReaction as Emoji | null}
								onReact={handleReact}
								onRemoveReaction={handleRemoveReaction}
							/>
						</CardContent>
					</Card>
				</div>
			</PageShell>

			{/* Lightbox */}
			{expandedImage && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
					onClick={() => setExpandedImage(null)}
					onKeyDown={(e) => e.key === "Escape" && setExpandedImage(null)}
					role="dialog"
					tabIndex={0}
				>
					<img
						src={expandedImage}
						alt="Expanded view"
						className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
					/>
				</div>
			)}
		</>
	);
}
