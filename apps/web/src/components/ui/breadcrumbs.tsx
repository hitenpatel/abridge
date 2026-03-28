"use client";

import type { BreadcrumbItem } from "@/lib/use-breadcrumbs";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

interface BreadcrumbsProps {
	items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<nav
			aria-label="Breadcrumb"
			data-testid="breadcrumbs"
			className="flex items-center gap-1 text-sm mb-6 text-slate-500"
		>
			{items.map((item, index) => {
				const isFirst = index === 0;
				const isLast = !item.href;

				return (
					<span key={`${item.label}-${index}`} className="flex items-center gap-1">
						{index > 0 && (
							<ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
						)}
						{isLast ? (
							<span className="font-medium text-slate-700" aria-current="page">
								{item.label}
							</span>
						) : (
							<Link
								href={item.href as string}
								className="flex items-center gap-1 hover:text-orange-600 transition-colors rounded px-1 py-0.5 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
							>
								{isFirst && <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
								{item.label}
							</Link>
						)}
					</span>
				);
			})}
		</nav>
	);
}
