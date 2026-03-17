"use client";

import { ClassSelector } from "@/components/staff/class-selector";
import { MediaPicker } from "@/components/staff/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/ui/page-shell";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ComposePostPage() {
	const router = useRouter();
	const utils = trpc.useUtils();
	const { data: session } = trpc.auth.getSession.useQuery();

	const [selectedClass, setSelectedClass] = useState<{
		yearGroup: string;
		className: string;
	} | null>(null);
	const [body, setBody] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [isPosting, setIsPosting] = useState(false);

	const getUploadUrl = trpc.classPost.getUploadUrl.useMutation();
	const createPost = trpc.classPost.create.useMutation();

	const isStaff = !!session?.staffRole && !!session?.schoolId;
	const schoolId = session?.schoolId ?? "";
	const canPost = selectedClass && (body.trim().length > 0 || files.length > 0);

	if (session && !isStaff) {
		return (
			<div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
				<p>Only staff members can compose posts.</p>
			</div>
		);
	}

	const handlePost = async () => {
		if (!canPost || !selectedClass || !schoolId) return;

		setIsPosting(true);
		try {
			// Upload files
			const mediaUrls: string[] = [];
			let uploadFailed = false;

			for (const file of files) {
				try {
					const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({
						schoolId,
						filename: file.name,
						contentType: file.type,
					});

					await fetch(uploadUrl, {
						method: "PUT",
						body: file,
						headers: { "Content-Type": file.type },
					});

					mediaUrls.push(publicUrl);
				} catch {
					uploadFailed = true;
				}
			}

			if (uploadFailed && mediaUrls.length === 0 && !body.trim()) {
				toast.error("Could not upload media. Please try again.");
				setIsPosting(false);
				return;
			}

			// Create post
			await createPost.mutateAsync({
				schoolId,
				yearGroup: selectedClass.yearGroup,
				className: selectedClass.className,
				body: body.trim() || undefined,
				mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
			});

			// Invalidate caches so feed refreshes
			await Promise.all([
				utils.classPost.listByClass.invalidate(),
				utils.dashboard.getFeed.invalidate(),
				utils.dashboard.getSummary.invalidate(),
			]);

			toast.success("Post created successfully");
			router.push("/dashboard");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create post");
		} finally {
			setIsPosting(false);
		}
	};

	return (
		<PageShell maxWidth="2xl">
			<div className="space-y-6 p-6">
				<div className="flex items-center gap-3">
					<Link href="/dashboard">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-2xl font-bold">Post to Class</h1>
				</div>

				<Card data-testid="compose-post-form">
					<CardHeader>
						<CardTitle>New Class Post</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label>Class</Label>
							<ClassSelector value={selectedClass} onChange={setSelectedClass} />
						</div>

						<div className="space-y-2">
							<Label htmlFor="caption">Caption</Label>
							<textarea
								id="caption"
								data-testid="post-body-input"
								value={body}
								onChange={(e) => setBody(e.target.value)}
								placeholder="Write something about today's class..."
								rows={4}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</div>

						<div className="space-y-2">
							<Label>Photos / Videos</Label>
							<MediaPicker files={files} onChange={setFiles} />
						</div>

						<Button
							data-testid="submit-post-button"
							onClick={handlePost}
							disabled={!canPost || isPosting}
							className="w-full"
						>
							{isPosting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Posting...
								</>
							) : (
								"Post"
							)}
						</Button>
					</CardContent>
				</Card>
			</div>
		</PageShell>
	);
}
