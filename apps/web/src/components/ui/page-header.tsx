import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	children?: ReactNode;
}

export function PageHeader({ icon: Icon, title, description, children }: PageHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
			<div className="flex items-center gap-4">
				{Icon && (
					<div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
						<Icon className="w-6 h-6 text-primary" />
					</div>
				)}
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
					{description && <p className="text-muted-foreground mt-1">{description}</p>}
				</div>
			</div>
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	);
}
