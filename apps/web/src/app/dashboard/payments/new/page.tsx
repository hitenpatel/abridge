"use client";

import { PaymentItemForm } from "@/components/payments/payment-item-form";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function NewPaymentItemPage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;

	if (isLoading) {
		return (
			<div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
				<Skeleton className="h-8 w-1/3" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!schoolId) {
		return (
			<div className="max-w-2xl mx-auto px-4 py-8 text-center text-muted-foreground">
				You must be a staff member to create payment items.
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-4 py-8">
			<div className="mb-8">
				<Link
					href="/dashboard/payments"
					className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-2 inline-block"
				>
					&larr; Back to Payments
				</Link>
				<h1 className="text-2xl font-bold text-foreground">Create Payment Item</h1>
				<p className="text-muted-foreground">Assign a new fee or contribution to students.</p>
			</div>

			<PaymentItemForm schoolId={schoolId} />
		</div>
	);
}
