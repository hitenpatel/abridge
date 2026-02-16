"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Play, User } from "lucide-react";
import { useState } from "react";

interface ClassPostCardProps {
	body?: string | null;
	mediaUrls: string[];
	authorName?: string;
	timestamp: Date | string;
	children?: React.ReactNode;
	onPress?: () => void;
}

function isVideoUrl(url: string): boolean {
	return /\.(mp4|mov|webm|avi)$/i.test(url);
}

function PhotoGrid({
	urls,
	onImageClick,
}: { urls: string[]; onImageClick: (index: number) => void }) {
	const images = urls.filter((u) => !isVideoUrl(u));
	if (images.length === 0) return null;

	const count = Math.min(images.length, 4);

	if (count === 1) {
		return (
			<button
				type="button"
				onClick={() => onImageClick(0)}
				className="w-full overflow-hidden rounded-xl"
			>
				<img
					src={images[0]}
					alt="Post media"
					className="w-full h-64 object-cover hover:scale-105 transition-transform"
				/>
			</button>
		);
	}

	if (count === 2) {
		return (
			<div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
				{images.slice(0, 2).map((url, i) => (
					<button
						key={url}
						type="button"
						onClick={() => onImageClick(i)}
						className="overflow-hidden"
					>
						<img
							src={url}
							alt={`Post media ${i + 1}`}
							className="w-full h-48 object-cover hover:scale-105 transition-transform"
						/>
					</button>
				))}
			</div>
		);
	}

	if (count === 3) {
		return (
			<div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
				<button
					type="button"
					onClick={() => onImageClick(0)}
					className="row-span-2 overflow-hidden"
				>
					<img
						src={images[0]}
						alt="Post media 1"
						className="w-full h-full object-cover hover:scale-105 transition-transform"
					/>
				</button>
				{images.slice(1, 3).map((url, i) => (
					<button
						key={url}
						type="button"
						onClick={() => onImageClick(i + 1)}
						className="overflow-hidden"
					>
						<img
							src={url}
							alt={`Post media ${i + 2}`}
							className="w-full h-24 object-cover hover:scale-105 transition-transform"
						/>
					</button>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
			{images.slice(0, 4).map((url, i) => (
				<button
					key={url}
					type="button"
					onClick={() => onImageClick(i)}
					className="relative overflow-hidden"
				>
					<img
						src={url}
						alt={`Post media ${i + 1}`}
						className="w-full h-32 object-cover hover:scale-105 transition-transform"
					/>
					{i === 3 && images.length > 4 && (
						<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
							<span className="text-white text-lg font-bold">+{images.length - 4}</span>
						</div>
					)}
				</button>
			))}
		</div>
	);
}

function VideoThumbnail({ url, onClick }: { url: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="relative w-full rounded-xl overflow-hidden bg-muted"
		>
			<video src={url} className="w-full h-48 object-cover" preload="metadata">
				<track kind="captions" />
			</video>
			<div className="absolute inset-0 flex items-center justify-center bg-black/30">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
					<Play className="h-5 w-5 text-foreground ml-0.5" />
				</div>
			</div>
		</button>
	);
}

export function ClassPostCard({
	body,
	mediaUrls,
	authorName,
	timestamp,
	children,
	onPress,
}: ClassPostCardProps) {
	const [expandedImage, setExpandedImage] = useState<string | null>(null);
	const videos = mediaUrls.filter(isVideoUrl);
	const ts = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

	return (
		<>
			<Card data-testid="class-post-card" className={onPress ? "cursor-pointer" : ""}>
				<CardContent className="p-4 space-y-3">
					{/* Clickable area for navigation */}
					<div
						onClick={onPress}
						onKeyDown={onPress ? (e) => e.key === "Enter" && onPress() : undefined}
						role={onPress ? "button" : undefined}
						tabIndex={onPress ? 0 : undefined}
					>
						{/* Author row */}
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
								<User className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="flex-1 min-w-0">
								{authorName && (
									<p className="text-sm font-medium text-foreground truncate">{authorName}</p>
								)}
								<p className="text-xs text-muted-foreground">{format(ts, "d MMM yyyy, h:mm a")}</p>
							</div>
						</div>

						{/* Caption */}
						{body && <p className="text-sm text-foreground whitespace-pre-wrap mt-3">{body}</p>}
					</div>

					{/* Photo grid */}
					<PhotoGrid
						urls={mediaUrls}
						onImageClick={(i) => {
							const images = mediaUrls.filter((u) => !isVideoUrl(u));
							setExpandedImage(images[i] ?? null);
						}}
					/>

					{/* Video thumbnail */}
					{videos.map((url) => (
						<VideoThumbnail key={url} url={url} onClick={() => window.open(url, "_blank")} />
					))}

					{/* Reaction bar slot */}
					{children}
				</CardContent>
			</Card>

			{/* Lightbox overlay */}
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
