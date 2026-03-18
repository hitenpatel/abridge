"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	ArrowLeft,
	Calendar,
	Hand,
	MessageCircle,
	MessageSquarePlus,
	Pin,
	PinOff,
	Plus,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";

const POST_TYPES = ["DISCUSSION", "EVENT", "VOLUNTEER_REQUEST"] as const;
type PostType = (typeof POST_TYPES)[number];

const TYPE_LABELS: Record<PostType, string> = {
	DISCUSSION: "Discussion",
	EVENT: "Event",
	VOLUNTEER_REQUEST: "Volunteer Request",
};

const TYPE_BADGE_COLORS: Record<PostType, string> = {
	DISCUSSION: "bg-blue-100 text-blue-800",
	EVENT: "bg-purple-100 text-purple-800",
	VOLUNTEER_REQUEST: "bg-amber-100 text-amber-800",
};

const FILTER_OPTIONS = [
	{ label: "All", value: undefined },
	{ label: "Discussion", value: "DISCUSSION" as PostType },
	{ label: "Event", value: "EVENT" as PostType },
	{ label: "Volunteer", value: "VOLUNTEER_REQUEST" as PostType },
];

function timeAgo(date: Date | string): string {
	const now = Date.now();
	const then = new Date(date).getTime();
	const seconds = Math.floor((now - then) / 1000);

	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(date).toLocaleDateString("en-GB");
}

function CreatePostForm({ onClose, schoolId }: { onClose: () => void; schoolId: string }) {
	const [type, setType] = useState<PostType>("DISCUSSION");
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [slots, setSlots] = useState<
		Array<{
			description: string;
			date: string;
			startTime: string;
			endTime: string;
			spotsTotal: number;
		}>
	>([]);

	const utils = trpc.useUtils();
	const createPost = trpc.community.createPost.useMutation({
		onSuccess: () => {
			utils.community.listPosts.invalidate();
			onClose();
		},
	});

	const addSlot = () => {
		setSlots([...slots, { description: "", date: "", startTime: "", endTime: "", spotsTotal: 1 }]);
	};

	const updateSlot = (index: number, field: string, value: string | number) => {
		setSlots(slots.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
	};

	const removeSlot = (index: number) => {
		setSlots(slots.filter((_, i) => i !== index));
	};

	const handleSubmit = () => {
		const tags = tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean)
			.slice(0, 3);

		createPost.mutate({
			schoolId,
			type,
			title,
			body,
			tags,
			...(type === "VOLUNTEER_REQUEST" && slots.length > 0
				? {
						volunteerSlots: slots.map((s) => ({
							description: s.description,
							date: new Date(s.date),
							startTime: s.startTime,
							endTime: s.endTime,
							spotsTotal: s.spotsTotal,
						})),
					}
				: {}),
		});
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-lg">
						<MessageSquarePlus className="h-5 w-5" />
						New Post
					</CardTitle>
					<button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted">
						<X className="h-4 w-4" />
					</button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="flex gap-2">
						{POST_TYPES.map((t) => (
							<Button
								key={t}
								size="sm"
								variant={type === t ? "default" : "outline"}
								onClick={() => {
									setType(t);
									if (t !== "VOLUNTEER_REQUEST") setSlots([]);
								}}
							>
								{TYPE_LABELS[t]}
							</Button>
						))}
					</div>

					<input
						type="text"
						placeholder="Title"
						maxLength={150}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="w-full rounded-md border p-2 text-sm"
					/>

					<Textarea
						placeholder="What would you like to share?"
						maxLength={2000}
						value={body}
						onChange={(e) => setBody(e.target.value)}
						rows={4}
					/>

					<input
						type="text"
						placeholder="Tags (comma separated, max 3)"
						value={tagsInput}
						onChange={(e) => setTagsInput(e.target.value)}
						className="w-full rounded-md border p-2 text-sm"
					/>

					{type === "VOLUNTEER_REQUEST" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Volunteer Slots</span>
								<Button
									variant="outline"
									size="sm"
									onClick={addSlot}
									className="flex items-center gap-1"
								>
									<Plus className="h-3 w-3" />
									Add Slot
								</Button>
							</div>
							{slots.map((slot, i) => (
								<div key={`slot-${i}`} className="space-y-2 rounded-md border p-3">
									<div className="flex items-center justify-between">
										<span className="text-xs font-medium">Slot {i + 1}</span>
										<button
											type="button"
											onClick={() => removeSlot(i)}
											className="rounded-md p-1 text-red-500 hover:bg-red-50"
										>
											<X className="h-3 w-3" />
										</button>
									</div>
									<input
										type="text"
										placeholder="Description"
										value={slot.description}
										onChange={(e) => updateSlot(i, "description", e.target.value)}
										className="w-full rounded-md border p-2 text-sm"
									/>
									<div className="grid grid-cols-3 gap-2">
										<input
											type="date"
											value={slot.date}
											onChange={(e) => updateSlot(i, "date", e.target.value)}
											className="rounded-md border p-2 text-sm"
										/>
										<input
											type="time"
											value={slot.startTime}
											onChange={(e) => updateSlot(i, "startTime", e.target.value)}
											className="rounded-md border p-2 text-sm"
										/>
										<input
											type="time"
											value={slot.endTime}
											onChange={(e) => updateSlot(i, "endTime", e.target.value)}
											className="rounded-md border p-2 text-sm"
										/>
									</div>
									<input
										type="number"
										placeholder="Spots available"
										min={1}
										value={slot.spotsTotal}
										onChange={(e) => updateSlot(i, "spotsTotal", Number(e.target.value))}
										className="w-32 rounded-md border p-2 text-sm"
									/>
								</div>
							))}
						</div>
					)}

					<Button
						onClick={handleSubmit}
						disabled={!title.trim() || !body.trim() || createPost.isPending}
						size="sm"
					>
						{createPost.isPending ? "Posting..." : "Post"}
					</Button>

					{createPost.isError && <p className="text-sm text-red-600">{createPost.error.message}</p>}
				</div>
			</CardContent>
		</Card>
	);
}

function PostDetail({
	postId,
	isStaff,
	schoolId,
	userId,
	onBack,
}: {
	postId: string;
	isStaff: boolean;
	schoolId: string;
	userId: string | undefined;
	onBack: () => void;
}) {
	const [commentBody, setCommentBody] = useState("");
	const [removeReason, setRemoveReason] = useState("");
	const [showRemovePrompt, setShowRemovePrompt] = useState(false);

	const utils = trpc.useUtils();
	const { data: post, isLoading } = trpc.community.getPost.useQuery({
		postId,
	});

	const addComment = trpc.community.addComment.useMutation({
		onSuccess: () => {
			setCommentBody("");
			utils.community.getPost.invalidate({ postId });
		},
	});

	const pinPost = trpc.community.pinPost.useMutation({
		onSuccess: () => {
			utils.community.getPost.invalidate({ postId });
			utils.community.listPosts.invalidate();
		},
	});

	const removePost = trpc.community.removePost.useMutation({
		onSuccess: () => {
			onBack();
			utils.community.listPosts.invalidate();
		},
	});

	const signUp = trpc.community.signUpForSlot.useMutation({
		onSuccess: () => {
			utils.community.getPost.invalidate({ postId });
		},
	});

	const cancelSignup = trpc.community.cancelSignup.useMutation({
		onSuccess: () => {
			utils.community.getPost.invalidate({ postId });
		},
	});

	if (isLoading) {
		return <Skeleton className="h-96 w-full" />;
	}

	if (!post) {
		return <p className="text-muted-foreground">Post not found.</p>;
	}

	return (
		<div className="space-y-4">
			<button
				type="button"
				onClick={onBack}
				className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to feed
			</button>

			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2 mb-1">
								<span className="text-sm font-medium">{post.author.name}</span>
								<span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
								<Badge className={TYPE_BADGE_COLORS[post.type as PostType]}>
									{TYPE_LABELS[post.type as PostType]}
								</Badge>
								{post.isPinned && (
									<Badge className="bg-yellow-100 text-yellow-800">
										<Pin className="h-3 w-3 mr-1" />
										Pinned
									</Badge>
								)}
							</div>
							<CardTitle className="text-lg">{post.title}</CardTitle>
						</div>
						{isStaff && (
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										pinPost.mutate({
											schoolId,
											postId: post.id,
											pinned: !post.isPinned,
										})
									}
									disabled={pinPost.isPending}
									className="flex items-center gap-1"
								>
									{post.isPinned ? (
										<>
											<PinOff className="h-3 w-3" />
											Unpin
										</>
									) : (
										<>
											<Pin className="h-3 w-3" />
											Pin
										</>
									)}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowRemovePrompt(true)}
									className="flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50"
								>
									<Trash2 className="h-3 w-3" />
									Remove
								</Button>
							</div>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm whitespace-pre-wrap">{post.body}</p>
					{post.tags.length > 0 && (
						<div className="flex gap-1 mt-3">
							{post.tags.map((tag) => (
								<Badge key={tag} variant="secondary" className="text-xs">
									{tag}
								</Badge>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{showRemovePrompt && (
				<Card className="border-red-200">
					<CardContent className="pt-6">
						<div className="space-y-3">
							<p className="text-sm font-medium text-red-700">Reason for removal</p>
							<Textarea
								value={removeReason}
								onChange={(e) => setRemoveReason(e.target.value)}
								placeholder="Explain why this post is being removed..."
								maxLength={500}
								className="border-red-200"
								rows={2}
							/>
							<div className="flex gap-2">
								<Button
									onClick={() => {
										if (removeReason.trim()) {
											removePost.mutate({
												schoolId,
												postId: post.id,
												reason: removeReason,
											});
										}
									}}
									disabled={!removeReason.trim() || removePost.isPending}
									size="sm"
									className="bg-red-600 hover:bg-red-700 text-white"
								>
									{removePost.isPending ? "Removing..." : "Confirm Remove"}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setShowRemovePrompt(false);
										setRemoveReason("");
									}}
								>
									Cancel
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{post.type === "VOLUNTEER_REQUEST" && post.volunteerSlots.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Hand className="h-5 w-5" />
							Volunteer Slots
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{post.volunteerSlots.map((slot) => {
								const spotsRemaining = slot.spotsTotal - slot.signups.length;
								const isSignedUp = slot.signups.some((s) => s.user.id === userId);

								return (
									<div
										key={slot.id}
										className="flex items-center justify-between rounded-md border p-3"
									>
										<div>
											<p className="text-sm font-medium">{slot.description}</p>
											<p className="text-xs text-muted-foreground">
												<Calendar className="mr-1 inline h-3 w-3" />
												{new Date(slot.date).toLocaleDateString("en-GB")} &middot; {slot.startTime}{" "}
												- {slot.endTime}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												<Users className="mr-1 inline h-3 w-3" />
												{spotsRemaining} of {slot.spotsTotal} spots remaining
											</p>
										</div>
										{isSignedUp ? (
											<Button
												variant="outline"
												size="sm"
												onClick={() => cancelSignup.mutate({ slotId: slot.id })}
												disabled={cancelSignup.isPending}
												className="border-red-200 text-red-600 hover:bg-red-50"
											>
												Cancel
											</Button>
										) : (
											<Button
												size="sm"
												onClick={() => signUp.mutate({ slotId: slot.id })}
												disabled={spotsRemaining <= 0 || signUp.isPending}
											>
												Sign Up
											</Button>
										)}
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<MessageCircle className="h-5 w-5" />
						Comments ({post.comments.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{post.comments.length === 0 && (
							<p className="text-sm text-muted-foreground">
								No comments yet. Be the first to reply.
							</p>
						)}
						{post.comments.map((comment) => (
							<div key={comment.id} className="rounded-md border p-3">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-sm font-medium">{comment.author.name}</span>
									<span className="text-xs text-muted-foreground">
										{timeAgo(comment.createdAt)}
									</span>
								</div>
								<p className="text-sm">{comment.body}</p>
							</div>
						))}

						<div className="flex gap-2 pt-2 border-t">
							<input
								type="text"
								placeholder="Write a comment..."
								maxLength={500}
								value={commentBody}
								onChange={(e) => setCommentBody(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && commentBody.trim()) {
										addComment.mutate({
											postId: post.id,
											body: commentBody,
										});
									}
								}}
								className="flex-1 rounded-md border p-2 text-sm"
							/>
							<Button
								size="sm"
								onClick={() => {
									if (commentBody.trim()) {
										addComment.mutate({
											postId: post.id,
											body: commentBody,
										});
									}
								}}
								disabled={!commentBody.trim() || addComment.isPending}
							>
								{addComment.isPending ? "..." : "Reply"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function PostList({
	schoolId,
	isStaff,
	userId,
}: { schoolId: string; isStaff: boolean; userId: string | undefined }) {
	const [typeFilter, setTypeFilter] = useState<PostType | undefined>(undefined);
	const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);

	const { data, isLoading } = trpc.community.listPosts.useQuery({
		schoolId,
		type: typeFilter,
	});

	if (selectedPostId) {
		return (
			<PostDetail
				postId={selectedPostId}
				isStaff={isStaff}
				schoolId={schoolId}
				userId={userId}
				onBack={() => setSelectedPostId(null)}
			/>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex gap-2">
					{FILTER_OPTIONS.map((opt) => (
						<Button
							key={opt.label}
							size="sm"
							variant={typeFilter === opt.value ? "default" : "outline"}
							onClick={() => setTypeFilter(opt.value)}
						>
							{opt.label}
						</Button>
					))}
				</div>
				<Button
					size="sm"
					onClick={() => setShowCreateForm(!showCreateForm)}
					className="flex items-center gap-1"
				>
					<Plus className="h-4 w-4" />
					New Post
				</Button>
			</div>

			{showCreateForm && (
				<CreatePostForm onClose={() => setShowCreateForm(false)} schoolId={schoolId} />
			)}

			{isLoading && <Skeleton className="h-64 w-full" />}

			{data?.items.length === 0 && !isLoading && (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">No posts yet. Start a discussion!</p>
					</CardContent>
				</Card>
			)}

			{data?.items.map((post) => (
				<Card
					key={post.id}
					className="cursor-pointer transition-colors hover:bg-muted/50 hover-lift"
					onClick={() => setSelectedPostId(post.id)}
				>
					<CardContent className="pt-6">
						<div className="flex items-start justify-between">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<span className="text-sm font-medium">{post.author.name}</span>
									<span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
									<Badge className={TYPE_BADGE_COLORS[post.type as PostType]}>
										{TYPE_LABELS[post.type as PostType]}
									</Badge>
									{post.isPinned && (
										<Badge className="bg-yellow-100 text-yellow-800">
											<Pin className="h-3 w-3 mr-1" />
											Pinned
										</Badge>
									)}
								</div>
								<h3 className="font-semibold">{post.title}</h3>
								<p className="text-sm text-muted-foreground mt-1">
									{post.body.length > 100 ? `${post.body.slice(0, 100)}...` : post.body}
								</p>
								<div className="flex items-center gap-3 mt-2">
									{post.tags.length > 0 && (
										<div className="flex gap-1">
											{post.tags.map((tag) => (
												<Badge key={tag} variant="secondary" className="text-xs">
													{tag}
												</Badge>
											))}
										</div>
									)}
									<span className="flex items-center gap-1 text-xs text-muted-foreground">
										<MessageCircle className="h-3 w-3" />
										{post._count.comments}
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export default function CommunityPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	// For parents, derive schoolId from their child link
	const { data: children } = trpc.user.listChildren.useQuery(undefined, {
		enabled: !isStaff,
	});
	const schoolId = isStaff ? session?.schoolId : children?.[0]?.child?.schoolId;

	if (!features.communityHubEnabled) {
		return <FeatureDisabled featureName="Community Hub" />;
	}

	if (!schoolId) {
		return (
			<PageShell>
				<PageHeader icon={Users} title="Community" description="Community hub and discussions" />
				<p className="text-muted-foreground">Loading...</p>
			</PageShell>
		);
	}

	return (
		<PageShell>
			<PageHeader icon={Users} title="Community" description="Community hub and discussions" />
			<PostList schoolId={schoolId} isStaff={isStaff} userId={session?.id} />
		</PageShell>
	);
}
