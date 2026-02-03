"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
	const { data: session, isPending } = authClient.useSession();
	const { data: secret, error: secretError } = trpc.auth.getSecretMessage.useQuery(undefined, {
		enabled: !!session,
	});
	const router = useRouter();

	useEffect(() => {
		if (!isPending && !session) {
			router.push("/login");
		}
	}, [isPending, session, router]);

	if (isPending)
		return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

	if (!session) return null;

	return (
		<div className="p-8 max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold">Dashboard</h1>
			<div className="mt-8 bg-white p-6 rounded-lg shadow">
				<p className="text-lg">
					Welcome, <span className="font-semibold">{session.user.name}</span>
				</p>
				<div className="mt-4 p-4 bg-primary-50 rounded border border-primary-100">
					<p className="text-sm font-medium text-primary-800">Server Secret:</p>
					<p className="text-primary-700 italic">
						{secret ?? (secretError ? `Error: ${secretError.message}` : "Fetching secret...")}
					</p>
				</div>
			</div>

			<Button
				className="mt-6"
				onClick={async () => {
					await authClient.signOut();
					router.push("/login");
				}}
			>
				Sign Out
			</Button>
		</div>
	);
}
