"use client";

import { OutstandingPayments } from "@/components/payments/outstanding-payments";
import { PaymentItemList } from "@/components/payments/payment-item-list";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function PaymentsDashboardPage() {
	// TODO: Dynamic school selection
	const schoolId = "school-1";
	const { data: stripeStatus } = trpc.stripe.getStripeStatus.useQuery({ schoolId });

	return (
		<div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
			{/* Parent View */}
			<section>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-900">Outstanding Payments</h2>
					<Link
						href="/dashboard/payments/history"
						className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
					>
						View Payment History
					</Link>
				</div>
				<OutstandingPayments />
			</section>

			<hr className="border-gray-200" />

			{/* Staff View */}
			<section>
				<div className="flex justify-between items-center mb-6">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Manage School Payments</h2>
						<p className="text-sm text-gray-600">
							Create and monitor payment items for this school.
						</p>
					</div>
					<div className="flex gap-4">
						{!stripeStatus?.isConnected && (
							<Link href="/dashboard/settings/payments">
								<Button variant="outline">Setup Stripe</Button>
							</Link>
						)}
						<Link href="/dashboard/payments/new">
							<Button>Create New Item</Button>
						</Link>
					</div>
				</div>

				<PaymentItemList schoolId={schoolId} />
			</section>
		</div>
	);
}
