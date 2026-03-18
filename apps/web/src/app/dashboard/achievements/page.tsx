"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { Award, Crown, Plus, Star, Trophy, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);

	const childId = selectedChild ?? children?.[0]?.child?.id;

	const { data: achievements, isLoading } = trpc.achievement.getChildAchievements.useQuery(
		{ childId: childId ?? "" },
		{ enabled: !!childId },
	);

	const { data: recentAwards } = trpc.achievement.getRecentAwards.useQuery();

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	return (
		<div className="space-y-6">
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<button
							key={pc.child.id}
							type="button"
							onClick={() => setSelectedChild(pc.child.id)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
								childId === pc.child.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
							}`}
						>
							{pc.child.firstName}
						</button>
					))}
				</div>
			)}

			{/* Total Points */}
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
							<Trophy className="h-8 w-8 text-yellow-600" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Total Points</p>
							{isLoading ? (
								<Skeleton className="h-10 w-24" />
							) : (
								<p className="text-4xl font-bold text-foreground" data-testid="total-points">
									{achievements?.totalPoints ?? 0}
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Badge Wall */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Star className="h-5 w-5" />
						Badge Wall
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-24 w-full" />
					) : (
						<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
							{achievements?.awards
								?.filter((a) => a.category.type === "BADGE")
								.map((award) => (
									<div
										key={award.id}
										className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50"
									>
										<span className="text-2xl">{award.category.icon || "🏆"}</span>
										<span className="text-xs text-center font-medium">{award.category.name}</span>
									</div>
								))}
							{achievements?.awards?.filter((a) => a.category.type === "BADGE").length === 0 && (
								<p className="col-span-full text-sm text-muted-foreground">
									No badges earned yet. Keep up the great work!
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Recent Awards */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Award className="h-5 w-5" />
						Recent Awards
					</CardTitle>
				</CardHeader>
				<CardContent>
					{!recentAwards?.length ? (
						<p className="text-sm text-muted-foreground">No awards yet.</p>
					) : (
						<div className="space-y-3">
							{recentAwards.map((award) => (
								<div
									key={award.id}
									className="flex items-center gap-3 rounded-md border p-3"
									data-testid="award-item"
								>
									<span className="text-xl">{award.category.icon || "⭐"}</span>
									<div className="flex-1">
										<p className="text-sm font-medium">{award.category.name}</p>
										{award.reason && (
											<p className="text-xs text-muted-foreground">{award.reason}</p>
										)}
										<p className="text-xs text-muted-foreground">
											Awarded by {award.awarder.name} &middot;{" "}
											{new Date(award.createdAt).toLocaleDateString("en-GB", {
												day: "numeric",
												month: "short",
											})}
										</p>
									</div>
									<Badge className="bg-yellow-100 text-yellow-800">+{award.points}</Badge>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const utils = trpc.useUtils();
	const { data: categories, isLoading: catsLoading } = trpc.achievement.listCategories.useQuery({
		schoolId,
	});
	const { data: leaderboard, isLoading: leaderLoading } =
		trpc.achievement.getClassLeaderboard.useQuery({ schoolId });

	// Quick award form state
	const [awardChildId, setAwardChildId] = useState("");
	const [awardCategoryId, setAwardCategoryId] = useState("");
	const [awardReason, setAwardReason] = useState("");

	// New category form state
	const [showNewCategory, setShowNewCategory] = useState(false);
	const [catName, setCatName] = useState("");
	const [catIcon, setCatIcon] = useState("");
	const [catType, setCatType] = useState<"POINTS" | "BADGE">("POINTS");
	const [catPointValue, setCatPointValue] = useState("1");

	// Get all children in school for the award form
	const { data: children } = trpc.user.listChildren.useQuery();
	// For staff, we use the leaderboard children + any available children
	// In a real app, we'd have a school-scoped child list

	const awardMutation = trpc.achievement.awardAchievement.useMutation({
		onSuccess: () => {
			toast.success("Achievement awarded!");
			setAwardReason("");
			utils.achievement.getClassLeaderboard.invalidate({ schoolId });
		},
		onError: (err) => toast.error(err.message),
	});

	const createCategoryMutation = trpc.achievement.createCategory.useMutation({
		onSuccess: () => {
			toast.success("Category created");
			setCatName("");
			setCatIcon("");
			setCatPointValue("1");
			setShowNewCategory(false);
			utils.achievement.listCategories.invalidate({ schoolId });
		},
		onError: (err) => toast.error(err.message),
	});

	const deactivateMutation = trpc.achievement.deactivateCategory.useMutation({
		onSuccess: () => {
			toast.success("Category deactivated");
			utils.achievement.listCategories.invalidate({ schoolId });
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<div className="space-y-6">
			{/* Quick Award */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Award className="h-5 w-5" />
						Award Achievement
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div className="space-y-1">
								<Label htmlFor="award-child">Student</Label>
								<Input
									id="award-child"
									data-testid="award-child-input"
									value={awardChildId}
									onChange={(e) => setAwardChildId(e.target.value)}
									placeholder="Child ID"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="award-category">Category</Label>
								<select
									id="award-category"
									data-testid="award-category-select"
									value={awardCategoryId}
									onChange={(e) => setAwardCategoryId(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="">Select category</option>
									{categories?.map((cat) => (
										<option key={cat.id} value={cat.id}>
											{cat.icon || ""} {cat.name} (+{cat.pointValue})
										</option>
									))}
								</select>
							</div>
							<div className="space-y-1">
								<Label htmlFor="award-reason">Reason</Label>
								<Input
									id="award-reason"
									data-testid="award-reason-input"
									value={awardReason}
									onChange={(e) => setAwardReason(e.target.value)}
									placeholder="Optional reason"
								/>
							</div>
						</div>
						<Button
							data-testid="award-submit"
							onClick={() => {
								if (awardChildId && awardCategoryId) {
									awardMutation.mutate({
										schoolId,
										childId: awardChildId,
										categoryId: awardCategoryId,
										reason: awardReason || undefined,
									});
								}
							}}
							disabled={!awardChildId || !awardCategoryId || awardMutation.isPending}
						>
							{awardMutation.isPending ? "Awarding..." : "Award"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Leaderboard */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Crown className="h-5 w-5" />
						Class Leaderboard
					</CardTitle>
				</CardHeader>
				<CardContent>
					{leaderLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !leaderboard?.length ? (
						<p className="text-sm text-muted-foreground">No achievements awarded yet.</p>
					) : (
						<div className="space-y-2">
							{leaderboard.map((entry) => (
								<div
									key={entry.childId}
									className="flex items-center gap-3 rounded-md border p-3"
									data-testid="leaderboard-entry"
								>
									<span
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
											entry.rank === 1
												? "bg-yellow-100 text-yellow-800"
												: entry.rank === 2
													? "bg-gray-100 text-gray-800"
													: entry.rank === 3
														? "bg-orange-100 text-orange-800"
														: "bg-muted text-muted-foreground"
										}`}
									>
										{entry.rank}
									</span>
									<span className="flex-1 font-medium text-sm">{entry.childName}</span>
									<Badge className="bg-yellow-100 text-yellow-800">{entry.totalPoints} pts</Badge>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Categories */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Star className="h-5 w-5" />
							Categories
						</CardTitle>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowNewCategory(!showNewCategory)}
						>
							{showNewCategory ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
							{showNewCategory ? "Cancel" : "Add Category"}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{showNewCategory && (
						<div className="mb-4 p-4 rounded-md border space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label htmlFor="cat-name">Name</Label>
									<Input
										id="cat-name"
										data-testid="cat-name-input"
										value={catName}
										onChange={(e) => setCatName(e.target.value)}
										placeholder="e.g. Star of the Week"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="cat-icon">Icon/Emoji</Label>
									<Input
										id="cat-icon"
										data-testid="cat-icon-input"
										value={catIcon}
										onChange={(e) => setCatIcon(e.target.value)}
										placeholder="e.g. ⭐"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="cat-type">Type</Label>
									<select
										id="cat-type"
										data-testid="cat-type-select"
										value={catType}
										onChange={(e) => setCatType(e.target.value as "POINTS" | "BADGE")}
										className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										<option value="POINTS">Points</option>
										<option value="BADGE">Badge</option>
									</select>
								</div>
								<div className="space-y-1">
									<Label htmlFor="cat-points">Point Value</Label>
									<Input
										id="cat-points"
										type="number"
										data-testid="cat-points-input"
										value={catPointValue}
										onChange={(e) => setCatPointValue(e.target.value)}
										min="1"
									/>
								</div>
							</div>
							<Button
								data-testid="cat-create-submit"
								onClick={() => {
									if (catName.trim()) {
										createCategoryMutation.mutate({
											schoolId,
											name: catName.trim(),
											icon: catIcon || undefined,
											type: catType,
											pointValue: Number.parseInt(catPointValue, 10) || 1,
										});
									}
								}}
								disabled={!catName.trim() || createCategoryMutation.isPending}
							>
								{createCategoryMutation.isPending ? "Creating..." : "Create Category"}
							</Button>
						</div>
					)}

					{catsLoading ? (
						<Skeleton className="h-24 w-full" />
					) : !categories?.length ? (
						<p className="text-sm text-muted-foreground">
							No categories yet. Create one to start awarding achievements.
						</p>
					) : (
						<div className="space-y-2">
							{categories.map((cat) => (
								<div
									key={cat.id}
									className="flex items-center gap-3 rounded-md border p-3"
									data-testid="category-item"
								>
									<span className="text-lg">{cat.icon || "⭐"}</span>
									<div className="flex-1">
										<p className="text-sm font-medium">{cat.name}</p>
										<p className="text-xs text-muted-foreground">
											{cat.type === "BADGE" ? "Badge" : `${cat.pointValue} points`}
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => deactivateMutation.mutate({ schoolId, categoryId: cat.id })}
										disabled={deactivateMutation.isPending}
										className="text-red-500 hover:text-red-700"
									>
										Deactivate
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function AchievementsPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.achievementsEnabled) {
		return <FeatureDisabled featureName="Achievements" />;
	}

	return (
		<PageShell>
			<div className="space-y-6 p-6">
				<PageHeader
					icon={Award}
					title={isStaff ? "Awards" : "Achievements"}
					description={
						isStaff
							? "Award achievements and manage categories"
							: "View your child's achievements and awards"
					}
				/>

				{isStaff && session.schoolId ? <StaffView schoolId={session.schoolId} /> : <ParentView />}
			</div>
		</PageShell>
	);
}
