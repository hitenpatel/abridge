"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface PaymentItemListProps {
	schoolId: string;
}

const BADGE_COLORS: Record<string, string> = {
	DINNER_MONEY: "bg-green-100 text-green-800",
	TRIP: "bg-blue-100 text-blue-800",
	CLUB: "bg-purple-100 text-purple-800",
	UNIFORM: "bg-orange-100 text-orange-800",
	OTHER: "bg-gray-100 text-gray-800",
};

export function PaymentItemList({ schoolId }: PaymentItemListProps) {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, isError } = trpc.payments.listPaymentItems.useQuery({
		schoolId,
		page,
		limit,
	});

	if (isLoading) return <div className="text-center py-4">Loading payments...</div>;
	if (isError) return <div className="text-center py-4 text-red-500">Error loading payments.</div>;
	if (!data || data.data.length === 0)
		return <div className="text-center py-4 text-gray-500">No payment items created yet.</div>;

	return (
		<div className="overflow-x-auto bg-white shadow rounded-lg">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Title
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Amount
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Category
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Status
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{data.data.map((item) => (
						<tr key={item.id}>
							<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
								{item.title}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								£{(item.amount / 100).toFixed(2)}
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm">
								<span
									className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${BADGE_COLORS[item.category] || "bg-gray-100 text-gray-800"}`}
								>
									{item.category}
								</span>
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{item.paymentCount} / {item.recipientCount} paid
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
