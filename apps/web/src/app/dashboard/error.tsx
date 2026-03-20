"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Dashboard error:", error);
	}, [error]);

	return (
		<div className="flex items-center justify-center min-h-[60vh] p-6">
			<Card className="w-full max-w-md rounded-2xl border border-destructive/20">
				<CardContent className="pt-8 pb-8 text-center space-y-4">
					<div className="flex justify-center">
						<div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
							<AlertTriangle className="w-7 h-7 text-destructive" />
						</div>
					</div>
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-1">Something went wrong</h2>
						<p className="text-sm text-muted-foreground">
							An error occurred while loading this page. Please try again.
						</p>
					</div>
					{error.message && process.env.NODE_ENV === "development" && (
						<p className="text-xs text-destructive bg-destructive/5 p-3 rounded-lg font-mono break-all">
							{error.message}
						</p>
					)}
					<Button onClick={reset} className="gap-2">
						<RefreshCw className="w-4 h-4" />
						Try Again
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
