"use client";

import { Film, ImagePlus, X } from "lucide-react";
import { useRef } from "react";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime";

interface MediaPickerProps {
	files: File[];
	onChange: (files: File[]) => void;
	maxFiles?: number;
}

function isVideo(file: File): boolean {
	return file.type.startsWith("video/");
}

export function MediaPicker({ files, onChange, maxFiles = 10 }: MediaPickerProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newFiles = Array.from(e.target.files ?? []);
		const combined = [...files, ...newFiles].slice(0, maxFiles);
		onChange(combined);
		if (inputRef.current) inputRef.current.value = "";
	};

	const handleRemove = (index: number) => {
		onChange(files.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={files.length >= maxFiles}
					className="flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
				>
					<ImagePlus className="h-4 w-4" />
					Add Photos / Videos
				</button>
				<span className="text-xs text-muted-foreground">
					{files.length}/{maxFiles} files
				</span>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_TYPES}
				multiple
				onChange={handleAdd}
				className="hidden"
			/>

			{files.length > 0 && (
				<div className="grid grid-cols-4 gap-2">
					{files.map((file, i) => (
						<div
							key={`${file.name}-${i}`}
							className="relative group rounded-lg overflow-hidden bg-muted aspect-square"
						>
							{isVideo(file) ? (
								<div className="flex h-full items-center justify-center bg-muted">
									<Film className="h-8 w-8 text-muted-foreground" />
								</div>
							) : (
								<img
									src={URL.createObjectURL(file)}
									alt={file.name}
									className="h-full w-full object-cover"
								/>
							)}
							<button
								type="button"
								onClick={() => handleRemove(i)}
								className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
