"use client";

import { MessageComposer } from "@/components/messaging/composer";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewMessagePage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const router = useRouter();

	// Protect the route
	useEffect(() => {
		if (!isLoading && !session) {
			router.push("/login");
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
		<div className="max-w-4xl mx-auto py-8 px-4">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Compose Message</h1>
				<p className="text-gray-600 mt-1">Send a new notification to parents.</p>
			</div>

			<MessageComposer schoolId={schoolId} />
		</div>
	);
}
