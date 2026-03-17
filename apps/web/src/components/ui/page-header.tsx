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
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
			<div className="flex items-center gap-3">
				{Icon && (
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
						<Icon className="w-5 h-5 text-primary" />
					</div>
				)}
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
					{description && <p className="text-muted-foreground mt-0.5">{description}</p>}
				</div>
			</div>
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	);
}
