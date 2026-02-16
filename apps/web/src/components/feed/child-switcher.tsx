"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChildOption {
	id: string;
	firstName: string;
	lastName: string;
	yearGroup?: string | null;
	className?: string | null;
	avatarUrl?: string | null;
}

interface ChildSwitcherProps {
	items: ChildOption[];
	selectedChildId: string;
	onSelect: (childId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function ChildSwitcher({ items, selectedChildId, onSelect }: ChildSwitcherProps) {
	if (items.length === 0) return null;

	return (
		<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
			{items.map((child) => {
				const isActive = child.id === selectedChildId;
				const classLabel = [child.yearGroup, child.className].filter(Boolean).join(" ");
				return (
					<button
						key={child.id}
						type="button"
						onClick={() => onSelect(child.id)}
						className={cn(
							"flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors shrink-0",
							isActive
								? "bg-primary text-primary-foreground shadow-sm"
								: "bg-muted text-muted-foreground hover:bg-muted/80",
						)}
					>
						<Avatar className="h-7 w-7">
							{child.avatarUrl && <AvatarImage src={child.avatarUrl} alt={child.firstName} />}
							<AvatarFallback
								className={cn(
									"text-xs",
									isActive && "bg-primary-foreground/20 text-primary-foreground",
								)}
							>
								{getInitials(child.firstName, child.lastName)}
							</AvatarFallback>
						</Avatar>
						<span>{child.firstName}</span>
						{classLabel && (
							<span
								className={cn(
									"text-xs",
									isActive ? "text-primary-foreground/70" : "text-muted-foreground/70",
								)}
							>
								{classLabel}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
