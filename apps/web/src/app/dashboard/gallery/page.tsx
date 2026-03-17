"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import {
	ArrowLeft,
	Camera,
	ChevronLeft,
	ChevronRight,
	Download,
	Image,
	Plus,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

function ParentView() {
	const { data: albums, isLoading } = trpc.gallery.listAlbums.useQuery({});
	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	const { data: albumDetail } = trpc.gallery.getAlbum.useQuery(
		{ albumId: selectedAlbumId ?? "" },
		{ enabled: !!selectedAlbumId },
	);

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="aspect-square rounded-xl" />
				))}
			</div>
		);
	}

	// Album detail view with lightbox
	if (selectedAlbumId && albumDetail) {
		return (
			<div className="space-y-4">
				<button
					type="button"
					onClick={() => {
						setSelectedAlbumId(null);
						setLightboxIndex(null);
					}}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to albums
				</button>

				<h2 className="text-xl font-semibold">{albumDetail.title}</h2>
				{albumDetail.description && (
					<p className="text-muted-foreground">{albumDetail.description}</p>
				)}

				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
					{albumDetail.photos.map((photo, idx) => (
						<button
							key={photo.id}
							type="button"
							onClick={() => setLightboxIndex(idx)}
							className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
						>
							<img
								src={photo.url}
								alt={photo.caption || "Photo"}
								className="w-full h-full object-cover"
							/>
							{photo.caption && (
								<div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
									{photo.caption}
								</div>
							)}
						</button>
					))}
				</div>

				{/* Lightbox */}
				{lightboxIndex !== null && albumDetail.photos[lightboxIndex] && (
					<div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
						<button
							type="button"
							onClick={() => setLightboxIndex(null)}
							className="absolute top-4 right-4 text-white hover:text-gray-300"
							aria-label="Close lightbox"
						>
							<X className="h-8 w-8" />
						</button>

						{lightboxIndex > 0 && (
							<button
								type="button"
								onClick={() => setLightboxIndex(lightboxIndex - 1)}
								className="absolute left-4 text-white hover:text-gray-300"
								aria-label="Previous photo"
							>
								<ChevronLeft className="h-10 w-10" />
							</button>
						)}

						<img
							src={albumDetail.photos[lightboxIndex].url}
							alt={albumDetail.photos[lightboxIndex].caption || "Photo"}
							className="max-h-[85vh] max-w-[90vw] object-contain"
						/>

						{lightboxIndex < albumDetail.photos.length - 1 && (
							<button
								type="button"
								onClick={() => setLightboxIndex(lightboxIndex + 1)}
								className="absolute right-4 text-white hover:text-gray-300"
								aria-label="Next photo"
							>
								<ChevronRight className="h-10 w-10" />
							</button>
						)}

						<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
							<a
								href={albumDetail.photos[lightboxIndex].url}
								download
								className="text-white hover:text-gray-300"
								aria-label="Download photo"
							>
								<Download className="h-6 w-6" />
							</a>
						</div>
					</div>
				)}
			</div>
		);
	}

	// Album grid
	if (!albums?.length) {
		return (
			<div className="text-center py-12">
				<Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
				<p className="text-muted-foreground">No photo albums available yet.</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
			{albums.map((album) => (
				<button
					key={album.id}
					type="button"
					onClick={() => setSelectedAlbumId(album.id)}
					className="text-left rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
				>
					<div className="aspect-video bg-muted relative">
						{album.thumbnailUrl ? (
							<img
								src={album.thumbnailUrl}
								alt={album.title}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="flex items-center justify-center h-full">
								<Image className="h-8 w-8 text-muted-foreground" />
							</div>
						)}
					</div>
					<div className="p-3">
						<h3 className="font-medium text-sm truncate">{album.title}</h3>
						<p className="text-xs text-muted-foreground mt-1">
							{album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}
						</p>
					</div>
				</button>
			))}
		</div>
	);
}

function StaffView({ schoolId }: { schoolId: string }) {
	const utils = trpc.useUtils();
	const { data: albums, isLoading } = trpc.gallery.listAlbums.useQuery({ schoolId });
	const [showCreate, setShowCreate] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [yearGroup, setYearGroup] = useState("");
	const [className, setClassName] = useState("");
	const [managingAlbumId, setManagingAlbumId] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const createAlbum = trpc.gallery.createAlbum.useMutation({
		onSuccess: () => {
			toast.success("Album created");
			setShowCreate(false);
			setTitle("");
			setDescription("");
			setYearGroup("");
			setClassName("");
			utils.gallery.listAlbums.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const publishAlbum = trpc.gallery.publishAlbum.useMutation({
		onSuccess: () => {
			toast.success("Album updated");
			utils.gallery.listAlbums.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const deleteAlbum = trpc.gallery.deleteAlbum.useMutation({
		onSuccess: () => {
			toast.success("Album deleted");
			utils.gallery.listAlbums.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const getUploadUrl = trpc.media.getUploadUrl.useMutation();
	const confirmUpload = trpc.media.confirmUpload.useMutation();
	const addPhotos = trpc.gallery.addPhotos.useMutation({
		onSuccess: () => {
			toast.success("Photos added");
			utils.gallery.listAlbums.invalidate();
			utils.gallery.getAlbum.invalidate();
		},
	});

	const { data: albumDetail } = trpc.gallery.getAlbum.useQuery(
		{ albumId: managingAlbumId ?? "" },
		{ enabled: !!managingAlbumId },
	);

	const deletePhoto = trpc.gallery.deletePhoto.useMutation({
		onSuccess: () => {
			toast.success("Photo deleted");
			utils.gallery.getAlbum.invalidate();
			utils.gallery.listAlbums.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const handleFileUpload = useCallback(
		async (files: FileList | null) => {
			if (!files || !managingAlbumId) return;
			setUploading(true);

			try {
				const mediaIds: string[] = [];

				for (const file of Array.from(files)) {
					// 1. Get presigned URL
					const { uploadUrl, key } = await getUploadUrl.mutateAsync({
						schoolId,
						filename: file.name,
						mimeType: file.type,
						sizeBytes: file.size,
					});

					// 2. Upload to R2
					await fetch(uploadUrl, {
						method: "PUT",
						body: file,
						headers: { "Content-Type": file.type },
					});

					// 3. Confirm upload
					const media = await confirmUpload.mutateAsync({
						schoolId,
						key,
						filename: file.name,
						mimeType: file.type,
						sizeBytes: file.size,
					});

					mediaIds.push(media.id);
				}

				// 4. Add photos to album
				if (mediaIds.length > 0) {
					await addPhotos.mutateAsync({
						schoolId,
						albumId: managingAlbumId,
						photos: mediaIds.map((id) => ({ mediaId: id })),
					});
				}
			} catch (err) {
				toast.error("Failed to upload photos");
			} finally {
				setUploading(false);
			}
		},
		[schoolId, managingAlbumId, getUploadUrl, confirmUpload, addPhotos],
	);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-40" />
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="aspect-square rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	// Managing album photos
	if (managingAlbumId && albumDetail) {
		return (
			<div className="space-y-4">
				<button
					type="button"
					onClick={() => setManagingAlbumId(null)}
					className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to albums
				</button>

				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">{albumDetail.title}</h2>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
						>
							<Upload className="h-4 w-4 mr-1" />
							{uploading ? "Uploading..." : "Add Photos"}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp,video/mp4"
							multiple
							className="hidden"
							onChange={(e) => handleFileUpload(e.target.files)}
						/>
					</div>
				</div>

				{albumDetail.photos.length === 0 ? (
					<div className="text-center py-12 border-2 border-dashed rounded-xl">
						<Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
						<p className="text-muted-foreground text-sm">
							No photos yet. Upload some to get started.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
						{albumDetail.photos.map((photo) => (
							<div
								key={photo.id}
								className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
							>
								<img
									src={photo.url}
									alt={photo.caption || "Photo"}
									className="w-full h-full object-cover"
								/>
								<button
									type="button"
									onClick={() => deletePhoto.mutate({ schoolId, photoId: photo.id })}
									className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
									aria-label="Delete photo"
								>
									<Trash2 className="h-3 w-3" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div />
				<Button onClick={() => setShowCreate(true)} size="sm">
					<Plus className="h-4 w-4 mr-1" />
					Create Album
				</Button>
			</div>

			{/* Create album form */}
			{showCreate && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">New Album</CardTitle>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								createAlbum.mutate({
									schoolId,
									title,
									description: description || undefined,
									yearGroup: yearGroup || undefined,
									className: className || undefined,
								});
							}}
							className="space-y-4"
						>
							<div className="space-y-1">
								<Label htmlFor="album-title">Title</Label>
								<Input
									id="album-title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									required
									placeholder="e.g. Sports Day 2026"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="album-desc">Description</Label>
								<Input
									id="album-desc"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Optional description"
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<Label htmlFor="album-year">Year Group</Label>
									<Input
										id="album-year"
										value={yearGroup}
										onChange={(e) => setYearGroup(e.target.value)}
										placeholder="e.g. Year 2"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="album-class">Class</Label>
									<Input
										id="album-class"
										value={className}
										onChange={(e) => setClassName(e.target.value)}
										placeholder="e.g. 2B"
									/>
								</div>
							</div>
							<div className="flex gap-2">
								<Button type="submit" disabled={createAlbum.isPending}>
									{createAlbum.isPending ? "Creating..." : "Create"}
								</Button>
								<Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
									Cancel
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			)}

			{/* Album list */}
			{!albums?.length && !showCreate ? (
				<div className="text-center py-12">
					<Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
					<p className="text-muted-foreground">
						No albums yet. Create one to start sharing photos.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{albums?.map((album) => (
						<Card key={album.id} className="overflow-hidden">
							<button
								type="button"
								onClick={() => setManagingAlbumId(album.id)}
								className="w-full text-left"
							>
								<div className="aspect-video bg-muted relative">
									{album.thumbnailUrl ? (
										<img
											src={album.thumbnailUrl}
											alt={album.title}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="flex items-center justify-center h-full">
											<Image className="h-8 w-8 text-muted-foreground" />
										</div>
									)}
									{!album.isPublished && (
										<span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
											Draft
										</span>
									)}
								</div>
								<div className="p-3">
									<h3 className="font-medium truncate">{album.title}</h3>
									<p className="text-xs text-muted-foreground mt-1">
										{album.photoCount} photo
										{album.photoCount !== 1 ? "s" : ""}
										{album.yearGroup ? ` | ${album.yearGroup}` : ""}
									</p>
								</div>
							</button>
							<div className="px-3 pb-3 flex gap-2">
								<Button
									size="sm"
									variant={album.isPublished ? "outline" : "default"}
									onClick={() =>
										publishAlbum.mutate({
											schoolId,
											albumId: album.id,
											isPublished: !album.isPublished,
										})
									}
								>
									{album.isPublished ? "Unpublish" : "Publish"}
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => deleteAlbum.mutate({ schoolId, albumId: album.id })}
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

export default function GalleryPage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const features = useFeatureToggles();

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-40" />
				<div className="grid grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="aspect-square rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	if (!features.galleryEnabled) {
		return <FeatureDisabled featureName="Gallery" />;
	}

	const isStaff = !!session?.staffRole;
	const schoolId = session?.schoolId ?? "";

	return (
		<PageShell maxWidth="5xl">
			<div data-testid="gallery-view" className="p-6">
				<PageHeader
					icon={Image}
					title={isStaff ? "Manage Gallery" : "Photo Gallery"}
					description={
						isStaff ? "Create albums and share photos with parents" : "View photos from your school"
					}
				/>

				{isStaff ? <StaffView schoolId={schoolId} /> : <ParentView />}
			</div>
		</PageShell>
	);
}
