"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
		return <div className="text-center py-8 text-muted-foreground">Loading payment history...</div>;
	if (isError)
		return <div className="text-center py-8 text-destructive">Error loading payment history.</div>;

	if (!data || data.data.length === 0) {
		return (
			<div className="text-center py-12 bg-card rounded-lg border-2 border-dashed border-border">
				<Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
				<h3 className="mt-2 text-sm font-medium text-foreground">No payment history</h3>
				<p className="mt-1 text-sm text-muted-foreground">You haven't made any payments yet.</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Receipt #</TableHead>
							<TableHead>Items</TableHead>
							<TableHead>Amount</TableHead>
							<TableHead className="text-right">Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.data.map((payment) => (
							<TableRow key={payment.id}>
								<TableCell className="whitespace-nowrap text-foreground">
									{new Date(payment.completedAt || payment.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell className="whitespace-nowrap text-muted-foreground">
									{payment.receiptNumber || payment.id.slice(0, 8)}
								</TableCell>
								<TableCell className="text-muted-foreground">
									<div className="max-w-xs truncate">
										{payment.lineItems.map((li) => li.paymentItem.title).join(", ")}
									</div>
								</TableCell>
								<TableCell className="whitespace-nowrap font-medium text-foreground">
									£{(payment.totalAmount / 100).toFixed(2)}
								</TableCell>
								<TableCell className="whitespace-nowrap text-right">
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
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			{data.totalPages > 1 && (
				<Card className="flex items-center justify-between px-4 py-3 sm:px-6">
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
							<p className="text-sm text-muted-foreground">
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
				</Card>
			)}

			{selectedPaymentId && (
				<ReceiptView paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} />
			)}
		</div>
	);
}
