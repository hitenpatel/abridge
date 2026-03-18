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
			className="flex flex-col items-center justify-center py-24 text-center"
			data-testid={testId}
		>
			{Icon && (
				<div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
					<Icon className="w-10 h-10 text-orange-300" />
				</div>
			)}
			<p className="text-lg font-semibold mb-1">{title}</p>
			{description && <p className="text-muted-foreground max-w-md mb-4">{description}</p>}
			{actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
		</div>
	);
}
