"use client";

import { PaymentItemForm } from "@/components/payments/payment-item-form";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CreditCard } from "lucide-react";

export default function NewPaymentItemPage() {
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;

	if (isLoading) {
		return (
			<PageShell maxWidth="4xl">
				<div className="space-y-4">
					<Skeleton className="h-8 w-1/3" />
					<Skeleton className="h-64 w-full" />
				</div>
			</PageShell>
		);
	}

	if (!schoolId) {
		return (
			<PageShell maxWidth="4xl">
				<div className="text-center text-muted-foreground py-8">
					You must be a staff member to create payment items.
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell maxWidth="4xl">
			<PageHeader icon={CreditCard} title="New Payment Request" />
			<PaymentItemForm schoolId={schoolId} />
		</PageShell>
	);
}
