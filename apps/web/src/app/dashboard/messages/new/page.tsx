"use client";

import { MessageComposer } from "@/components/messaging/composer";
import { PageShell } from "@/components/ui/page-shell";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewMessagePage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const router = useRouter();

	// Protect the route - only staff can compose messages
	useEffect(() => {
		if (!isLoading && !session) {
			router.push("/login");
		}
		if (!isLoading && session && !session.staffRole) {
			// Parents can't send messages
			router.push("/dashboard/messages");
		}
	}, [isLoading, session, router]);

	if (isLoading) {
		return <div className="flex h-[50vh] items-center justify-center">Loading...</div>;
	}

	if (!session) {
		return null;
	}

	const schoolId = session.schoolId || "school-1";

	return (
		<PageShell maxWidth="4xl">
			<div className="py-8 px-4">
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-foreground">Compose Message</h1>
					<p className="text-muted-foreground mt-1">Send a new notification to parents.</p>
				</div>

				<MessageComposer schoolId={schoolId} />
			</div>
		</PageShell>
	);
}
