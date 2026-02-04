"use client";

import { PaymentItemForm } from "@/components/payments/payment-item-form";
import Link from "next/link";

export default function NewPaymentItemPage() {
	const schoolId = "school-1";

	return (
		<div className="max-w-2xl mx-auto px-4 py-8">
			<div className="mb-8">
				<Link
					href="/dashboard/payments"
					className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-2 inline-block"
				>
					&larr; Back to Payments
				</Link>
				<h1 className="text-2xl font-bold text-gray-900">Create Payment Item</h1>
				<p className="text-gray-600">Assign a new fee or contribution to students.</p>
			</div>

			<PaymentItemForm schoolId={schoolId} />
		</div>
	);
}
