"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/messaging/message-list";

export default function MessagesPage() {
	// TODO: Get schoolId from context/auth
	const schoolId = "school-1";

	return (
		<div className="max-w-4xl mx-auto px-4">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-900">Sent Messages</h1>
				<Link href="/dashboard/messages/new">
					<Button>Compose New</Button>
				</Link>
			</div>
			<MessageList schoolId={schoolId} />
		</div>
	);
}
