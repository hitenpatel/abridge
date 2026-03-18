"use client";

import { Ban } from "lucide-react";

export function FeatureDisabled({ featureName }: { featureName: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-24 px-6 text-center">
			<Ban className="w-16 h-16 text-muted-foreground/50 mb-4" aria-hidden="true" />
			<h2 className="text-xl font-semibold text-foreground mb-2">{featureName} is not enabled</h2>
			<p className="text-muted-foreground max-w-md">
				This feature has been disabled for your school. Contact your school administrator if you
				believe this is an error.
			</p>
		</div>
	);
}
