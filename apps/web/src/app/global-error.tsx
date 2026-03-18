"use client";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="en">
			<body>
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
						<p className="text-muted-foreground mb-4">An unexpected error occurred.</p>
						<button
							type="button"
							onClick={reset}
							className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
						>
							Try again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
