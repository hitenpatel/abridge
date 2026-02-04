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
					className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
				>
					<ChevronLeft className="mr-1 h-4 w-4" />
					Back to Payments
				</Link>
				<h1 className="text-2xl font-bold text-gray-900 mt-4">Payment History</h1>
				<p className="text-gray-600">
					View your past payments and download receipts for childcare vouchers or Universal Credit.
				</p>
			</div>

			<PaymentHistory />
		</div>
	);
}
