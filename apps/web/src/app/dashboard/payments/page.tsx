"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

function StaffPaymentsView({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.payments.listPaymentItems.useQuery({
		schoolId,
		page: 1,
		limit: 50,
	});

	return (
		<div className="max-w-5xl mx-auto" data-testid="payments-list">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Payment Items</h1>
					<p className="text-muted-foreground mt-1">Create and manage payment items for parents.</p>
				</div>
				<Link href="/dashboard/payments/new">
					<Button data-testid="create-payment-button">
						<span className="material-symbols-rounded text-base mr-1" aria-hidden="true">
							add
						</span>
						Create Payment Item
					</Button>
				</Link>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			) : data && data.data.length > 0 ? (
				<div className="space-y-3">
					{/* biome-ignore lint/suspicious/noExplicitAny: UI component */}
					{data.data.map((item: any) => (
						<Card key={item.id} className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-xl">
										<span className="material-symbols-rounded text-primary" aria-hidden="true">
											payments
										</span>
									</div>
									<div>
										<h4 className="font-medium text-foreground">{item.title}</h4>
										<p className="text-sm text-muted-foreground">
											£{(item.amount / 100).toFixed(2)} &middot; {item.category} &middot;{" "}
											{item.recipientCount} recipients
										</p>
									</div>
								</div>
								<Badge variant="secondary">{item.category}</Badge>
							</div>
						</Card>
					))}
				</div>
			) : (
				<div className="bg-muted rounded-lg p-12 text-center border border-dashed border-border">
					<span
						className="material-symbols-rounded text-4xl text-muted-foreground mb-4"
						aria-hidden="true"
					>
						payments
					</span>
					<p className="text-muted-foreground">No payment items yet. Create one to get started.</p>
				</div>
			)}
		</div>
	);
}

function ParentPaymentsView() {
	const { data: outstanding, isLoading } = trpc.payments.listOutstandingPayments.useQuery();

	if (isLoading) {
		return (
			<div className="max-w-5xl mx-auto space-y-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto" data-testid="payments-list">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Outstanding Payments</h1>
					<p className="text-muted-foreground mt-1">View and manage your payment items.</p>
				</div>
				<Link href="/dashboard/payments/history">
					<Button variant="outline">
						<span className="material-symbols-rounded text-base mr-1" aria-hidden="true">
							history
						</span>
						View Payment History
					</Button>
				</Link>
			</div>

			{outstanding && outstanding.length > 0 ? (
				<div className="space-y-3">
					{outstanding.map((item) => (
						<Card key={`${item.id}-${item.childId}`} className="p-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-xl">
										<span className="material-symbols-rounded text-primary" aria-hidden="true">
											payments
										</span>
									</div>
									<div>
										<h4 className="font-medium text-foreground">{item.title}</h4>
										<p className="text-sm text-muted-foreground">
											{item.childName}
											{item.description ? ` · ${item.description}` : ""}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<span className="font-bold text-foreground">
										£{(item.amount / 100).toFixed(2)}
									</span>
									<Badge variant="secondary">{item.category}</Badge>
								</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<div className="bg-muted rounded-lg p-12 text-center border border-dashed border-border">
					<span
						className="material-symbols-rounded text-4xl text-muted-foreground mb-4"
						aria-hidden="true"
					>
						payments
					</span>
					<p className="text-muted-foreground">No outstanding payments. You're all paid up!</p>
				</div>
			)}
		</div>
	);
}

export default function PaymentsDashboardPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.paymentsEnabled) return <FeatureDisabled featureName="Payments" />;

	if (isStaff && session.schoolId) {
		return <StaffPaymentsView schoolId={session.schoolId} />;
	}

	return <ParentPaymentsView />;
}
