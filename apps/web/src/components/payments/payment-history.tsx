"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Download, Receipt } from "lucide-react";
import { useState } from "react";
import { ReceiptView } from "./receipt-view";

export function PaymentHistory() {
	const [page, setPage] = useState(1);
	const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

	const { data, isLoading, isError } = trpc.payments.getPaymentHistory.useQuery({
		page,
		limit: 10,
	});

	if (isLoading)
		return <div className="text-center py-8 text-gray-500">Loading payment history...</div>;
	if (isError)
		return <div className="text-center py-8 text-red-500">Error loading payment history.</div>;

	if (!data || data.data.length === 0) {
		return (
			<div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
				<Receipt className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-medium text-gray-900">No payment history</h3>
				<p className="mt-1 text-sm text-gray-500">You haven't made any payments yet.</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="bg-white shadow overflow-hidden sm:rounded-lg border">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Date
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Receipt #
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Items
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Amount
							</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Action
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{data.data.map((payment) => (
							<tr key={payment.id}>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{new Date(payment.completedAt || payment.createdAt).toLocaleDateString()}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{payment.receiptNumber || payment.id.slice(0, 8)}
								</td>
								<td className="px-6 py-4 text-sm text-gray-500">
									<div className="max-w-xs truncate">
										{payment.lineItems.map((li) => li.paymentItem.title).join(", ")}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									£{(payment.totalAmount / 100).toFixed(2)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
									<div className="flex gap-2 justify-end">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSelectedPaymentId(payment.id)}
										>
											<Receipt className="h-4 w-4 mr-1" />
											View
										</Button>
										{payment.status === "COMPLETED" && (
											<Button
												variant="default"
												size="sm"
												onClick={() => {
													window.open(`/api/pdf/payment-receipt/${payment.id}`, "_blank");
												}}
												title="Download UC-compliant receipt"
											>
												<Download className="h-4 w-4 mr-1" />
												PDF
											</Button>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{data.totalPages > 1 && (
				<div className="flex items-center justify-between px-4 py-3 bg-white border rounded-lg sm:px-6">
					<div className="flex justify-between flex-1 sm:hidden">
						<Button
							variant="outline"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
							disabled={page === data.totalPages}
						>
							Next
						</Button>
					</div>
					<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
						<div>
							<p className="text-sm text-gray-700">
								Showing page <span className="font-medium">{page}</span> of{" "}
								<span className="font-medium">{data.totalPages}</span>
							</p>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
								disabled={page === data.totalPages}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			)}

			{selectedPaymentId && (
				<ReceiptView paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} />
			)}
		</div>
	);
}
