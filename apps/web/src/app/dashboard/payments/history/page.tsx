"use client";

import { PaymentHistory } from "@/components/payments/payment-history";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Receipt } from "lucide-react";

export default function PaymentHistoryPage() {
	return (
		<PageShell>
			<PageHeader icon={Receipt} title="Payment History" description="View past transactions" />
			<PaymentHistory />
		</PageShell>
	);
}
