"use client";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
	return (
		<PageShell>
			<div className="p-8 max-w-2xl mx-auto text-center space-y-6">
				<div className="bg-success/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
					<CheckCircle2 className="h-10 w-10 text-success" />
				</div>
				<div className="space-y-2">
					<h2 className="text-3xl font-bold text-foreground">Payment Successful!</h2>
					<p className="text-muted-foreground">
						Thank you — your payment has been received. A receipt will appear in your payment
						history shortly.
					</p>
				</div>
				<div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
					<Link href="/dashboard/payments/history">
						<Button className="w-full sm:w-auto">View Payment History</Button>
					</Link>
					<Link href="/dashboard/payments">
						<Button variant="outline" className="w-full sm:w-auto">
							Back to Payments
						</Button>
					</Link>
				</div>
			</div>
		</PageShell>
	);
}
