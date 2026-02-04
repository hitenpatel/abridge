"use client";

import { MessageComposer } from "@/components/messaging/composer";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewMessagePage() {
	const { data: session, isPending } = authClient.useSession();
	const router = useRouter();

	// Protect the route
	useEffect(() => {
		if (!isPending && !session) {
			router.push("/login");
		}
	}, [isPending, session, router]);

	if (isPending) {
		return <div className="flex h-[50vh] items-center justify-center">Loading...</div>;
	}

	if (!session) {
		return null;
	}

	// TODO: Retrieve the actual school ID from the user's profile or context.
	// For MVP, we assume the user belongs to a school and hardcode a placeholder or
	// fetch it if available. Since session user doesn't have it typed yet, we use a placeholder.
	// This will need to be updated when the school selection/context is implemented.
	const schoolId = "school-1";

	return (
		<div className="max-w-4xl mx-auto py-8 px-4">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Compose Message</h1>
				<p className="text-gray-600 mt-1">Send a new notification to parents.</p>
			</div>

			<MessageComposer schoolId={schoolId} />
		</div>
	);
}
