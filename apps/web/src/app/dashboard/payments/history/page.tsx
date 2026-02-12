"use client";

import { PaymentHistory } from "@/components/payments/payment-history";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PaymentHistoryPage() {
	return (
		<div className="max-w-4xl mx-auto px-4 py-8">
			<div className="mb-8">
				<Link
					href="/dashboard/payments"
					className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="mr-1 h-4 w-4" />
					Back to Payments
				</Link>
				<h1 className="text-2xl font-bold text-foreground mt-4">Payment History</h1>
				<p className="text-muted-foreground">
					View your past payments and download receipts for childcare vouchers or Universal Credit.
				</p>
			</div>

			<PaymentHistory />
		</div>
	);
}
