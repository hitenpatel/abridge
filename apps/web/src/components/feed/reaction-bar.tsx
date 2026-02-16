"use client";

import { cn } from "@/lib/utils";

type Emoji = "HEART" | "THUMBS_UP" | "CLAP" | "LAUGH" | "WOW";

const EMOJI_MAP: Record<Emoji, string> = {
	HEART: "\u2764\uFE0F",
	THUMBS_UP: "\uD83D\uDC4D",
	CLAP: "\uD83D\uDC4F",
	LAUGH: "\uD83D\uDE02",
	WOW: "\uD83D\uDE2E",
};

const EMOJI_ORDER: Emoji[] = ["HEART", "THUMBS_UP", "CLAP", "LAUGH", "WOW"];

interface ReactionBarProps {
	reactionCounts: Partial<Record<Emoji, number>>;
	myReaction: Emoji | null;
	onReact: (emoji: Emoji) => void;
	onRemoveReaction: () => void;
}

export function ReactionBar({
	reactionCounts,
	myReaction,
	onReact,
	onRemoveReaction,
}: ReactionBarProps) {
	const handleClick = (emoji: Emoji) => {
		if (myReaction === emoji) {
			onRemoveReaction();
		} else {
			onReact(emoji);
		}
	};

	return (
		<div className="flex items-center gap-1 pt-2 border-t border-border">
			{EMOJI_ORDER.map((emoji) => {
				const count = reactionCounts[emoji] ?? 0;
				const isActive = myReaction === emoji;

				return (
					<button
						key={emoji}
						type="button"
						data-testid={`reaction-${emoji}`}
						onClick={() => handleClick(emoji)}
						className={cn(
							"flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors",
							isActive ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted",
						)}
					>
						<span className="text-base leading-none">{EMOJI_MAP[emoji]}</span>
						{count > 0 && (
							<span
								className={cn(
									"text-xs font-medium",
									isActive ? "text-primary" : "text-muted-foreground",
								)}
							>
								{count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
