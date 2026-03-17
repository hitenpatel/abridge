import type { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	"data-testid"?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	actionLabel,
	onAction,
	"data-testid": testId,
}: EmptyStateProps) {
	return (
		<div
			className="flex flex-col items-center justify-center py-16 text-center"
			data-testid={testId}
		>
			{Icon && (
				<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
					<Icon className="w-8 h-8 text-muted-foreground" />
				</div>
			)}
			<h3 className="text-lg font-semibold mb-1">{title}</h3>
			{description && <p className="text-muted-foreground max-w-sm mb-4">{description}</p>}
			{actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
		</div>
	);
}
