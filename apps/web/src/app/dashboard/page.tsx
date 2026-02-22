"use client";

import { ActionItemsRow } from "@/components/feed/action-items-row";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { ClassPostCard } from "@/components/feed/class-post-card";
import { ChildSwitcher } from "@/components/feed/child-switcher";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, PenSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

function StaffDashboard({ schoolId, userId }: { schoolId: string; userId: string }) {
	const utils = trpc.useUtils();
	const { data: posts, isLoading } = trpc.classPost.listRecent.useQuery({
		schoolId,
		limit: 10,
	});

	const handleDeleted = () => {
		utils.classPost.listRecent.invalidate();
	};

	if (isLoading) {
		return (
			<div className="max-w-2xl mx-auto space-y-4 p-4">
				<Skeleton className="h-10 w-full rounded-full" />
				<Skeleton className="h-64 w-full rounded-xl" />
				<Skeleton className="h-48 w-full rounded-xl" />
			</div>
		);
	}

	return (
		<div data-testid="dashboard-view" className="max-w-2xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Recent Posts</h1>
				<Link href="/dashboard/compose">
					<Button size="sm" className="gap-2">
						<PenSquare className="h-4 w-4" />
						Compose Post
					</Button>
				</Link>
			</div>

			{posts && posts.length > 0 ? (
				<div className="space-y-4" data-testid="activity-feed">
					{posts.map((post) => (
						<ClassPostCard
							key={post.id}
							postId={post.id}
							body={post.body}
							mediaUrls={post.mediaUrls}
							authorId={post.authorId}
							authorName="Staff"
							timestamp={post.createdAt}
							isStaff
							currentUserId={userId}
							schoolId={schoolId}
							onDeleted={handleDeleted}
						/>
					))}
				</div>
			) : (
				<div className="text-center py-12 text-muted-foreground">
					<p className="text-sm">No posts yet. Create your first class post!</p>
				</div>
			)}
		</div>
	);
}

export default function DashboardPage() {
	const { data: session, isPending: isAuthPending } = authClient.useSession();
	const router = useRouter();
	const utils = trpc.useUtils();

	// Get session with role info
	const { data: sessionInfo } = trpc.auth.getSession.useQuery(undefined, {
		enabled: !!session,
	});

	const isStaff = !!sessionInfo?.staffRole && !!sessionInfo?.schoolId;

	// Get children from summary (preserved endpoint)
	const { data: summaryData, isLoading: isSummaryLoading } = trpc.dashboard.getSummary.useQuery(
		undefined,
		{
			enabled: !!session,
		},
	);

	const children = summaryData?.children ?? [];
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

	// Set first child as default when data arrives
	useEffect(() => {
		if (children.length > 0 && !selectedChildId) {
			setSelectedChildId(children[0].id);
		}
	}, [children, selectedChildId]);

	// Feed query
	const {
		data: feedData,
		isLoading: isFeedLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = trpc.dashboard.getFeed.useInfiniteQuery(
		{ childId: selectedChildId ?? "", limit: 20 },
		{
			enabled: !!selectedChildId,
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		},
	);

	// Action items query
	const { data: actionItems, isLoading: isActionItemsLoading } =
		trpc.dashboard.getActionItems.useQuery(
			{ childId: selectedChildId ?? "" },
			{ enabled: !!selectedChildId },
		);

	// Reaction mutations
	const reactMutation = trpc.classPost.react.useMutation({
		onSuccess: () => {
			utils.dashboard.getFeed.invalidate();
		},
	});

	const removeReactionMutation = trpc.classPost.removeReaction.useMutation({
		onSuccess: () => {
			utils.dashboard.getFeed.invalidate();
		},
	});

	const handleReact = useCallback(
		(postId: string, emoji: Emoji) => {
			reactMutation.mutate({ postId, emoji });
		},
		[reactMutation],
	);

	const handleRemoveReaction = useCallback(
		(postId: string) => {
			removeReactionMutation.mutate({ postId });
		},
		[removeReactionMutation],
	);

	const handleLoadMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	useEffect(() => {
		if (!isAuthPending && !session) {
			router.push("/login");
		}
	}, [isAuthPending, session, router]);

	if (isAuthPending || (session && isSummaryLoading)) {
		return (
			<div className="max-w-2xl mx-auto space-y-4 p-4">
				<Skeleton className="h-10 w-full rounded-full" />
				<Skeleton className="h-24 w-full rounded-xl" />
				<Skeleton className="h-64 w-full rounded-xl" />
				<Skeleton className="h-48 w-full rounded-xl" />
			</div>
		);
	}

	if (!session) return null;

	// Staff with no children: show staff dashboard
	if (isStaff && children.length === 0 && sessionInfo?.schoolId) {
		return <StaffDashboard schoolId={sessionInfo.schoolId} userId={sessionInfo.id} />;
	}

	if (children.length === 0) {
		return (
			<div
				data-testid="empty-dashboard"
				className="max-w-2xl mx-auto text-center py-16 text-muted-foreground"
			>
				<p className="text-sm">No children linked to your account yet.</p>
			</div>
		);
	}

	const feedItems = feedData?.pages.flatMap((page) => page.items) ?? [];

	return (
		<div data-testid="dashboard-view" className="max-w-2xl mx-auto space-y-6">
			{/* Child Switcher */}
			{children.length > 1 && (
				<ChildSwitcher
					items={children.map((c) => ({
						id: c.id,
						firstName: c.firstName,
						lastName: c.lastName,
						yearGroup: (c as Record<string, unknown>).yearGroup as string | undefined,
						className: (c as Record<string, unknown>).className as string | undefined,
					}))}
					selectedChildId={selectedChildId ?? ""}
					onSelect={(id) => setSelectedChildId(id)}
				/>
			)}

			{/* Action Items Row */}
			{!isActionItemsLoading && actionItems && actionItems.length > 0 && (
				<ActionItemsRow
					items={actionItems.map((item) => ({
						type: item.type,
						title: (item as Record<string, unknown>).title as string | undefined,
						subject: (item as Record<string, unknown>).subject as string | undefined,
						amountDuePence: (item as Record<string, unknown>).amountDuePence as number | undefined,
						dueDate: (item as Record<string, unknown>).dueDate as string | undefined,
						paymentItemId: (item as Record<string, unknown>).paymentItemId as string | undefined,
						templateId: (item as Record<string, unknown>).templateId as string | undefined,
						messageId: (item as Record<string, unknown>).messageId as string | undefined,
					}))}
					onPayment={() => router.push("/dashboard/payments")}
					onForm={(templateId) => router.push(`/dashboard/forms/${templateId}`)}
					onMessage={() => router.push("/dashboard/messages")}
				/>
			)}

			{/* Activity Feed */}
			<ActivityFeed
				items={feedItems as Parameters<typeof ActivityFeed>[0]["items"]}
				isLoading={isFeedLoading}
				hasMore={!!hasNextPage}
				onLoadMore={handleLoadMore}
				onReact={handleReact}
				onRemoveReaction={handleRemoveReaction}
				onPostPress={(postId) => router.push(`/dashboard/posts/${postId}`)}
			/>

			{/* Report Absence FAB */}
			<div className="fixed bottom-6 right-6 z-40">
				<Link href="/dashboard/attendance">
					<Button size="lg" className="rounded-full shadow-lg gap-2">
						<AlertTriangle className="h-4 w-4" />
						Report Absence
					</Button>
				</Link>
			</div>
		</div>
	);
}
