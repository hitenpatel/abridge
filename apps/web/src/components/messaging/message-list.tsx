"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

interface MessageListProps {
	schoolId: string;
}

const BADGE_COLORS: Record<string, string> = {
	URGENT: "bg-red-100 text-red-800",
	STANDARD: "bg-blue-100 text-blue-800",
	FYI: "bg-gray-100 text-gray-800",
};

export function MessageList({ schoolId }: MessageListProps) {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, isError } = trpc.messaging.listSent.useQuery({
		schoolId,
		page,
		limit,
	});

	if (isLoading) {
		return <div className="p-4 text-center text-gray-500">Loading messages...</div>;
	}

	if (isError) {
		return <div className="p-4 text-center text-red-500">Failed to load messages.</div>;
	}

	if (!data || data.data.length === 0) {
		return <div className="p-4 text-center text-gray-500">No messages sent yet.</div>;
	}

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto bg-white shadow rounded-lg">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Date
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Subject
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Category
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Recipients
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Read Status
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{data.data.map((message) => (
							<tr key={message.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(message.createdAt).toLocaleDateString()}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{message.subject}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm">
									<span
										className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											BADGE_COLORS[message.category] || "bg-gray-100 text-gray-800"
										}`}
									>
										{message.category}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{message.recipientCount}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{message.readCount} / {message.recipientCount}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="flex justify-between items-center px-4">
				<Button
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					disabled={page === 1}
					className="disabled:opacity-50"
				>
					Previous
				</Button>
				<span className="text-sm text-gray-700">
					Page {page} of {data.totalPages}
				</span>
				<Button
					onClick={() => setPage((p) => p + 1)}
					disabled={page >= data.totalPages}
					className="disabled:opacity-50"
				>
					Next
				</Button>
			</div>
		</div>
	);
}
