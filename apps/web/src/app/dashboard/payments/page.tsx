"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { CreditCard, History, Plus } from "lucide-react";
import Link from "next/link";

function StaffPaymentsView({ schoolId }: { schoolId: string }) {
	const { data, isLoading } = trpc.payments.listPaymentItems.useQuery({
		schoolId,
		page: 1,
		limit: 50,
	});

	return (
		<PageShell maxWidth="5xl">
			<PageHeader icon={CreditCard} title="Payments" description="Manage school payments">
				<Link href="/dashboard/payments/new">
					<Button data-testid="create-payment-button">
						<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
						Create Payment Item
					</Button>
				</Link>
			</PageHeader>

			<div data-testid="payments-list">
				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				) : data && data.data.length > 0 ? (
					<div className="space-y-3">
						{/* biome-ignore lint/suspicious/noExplicitAny: UI component */}
						{data.data.map((item: any) => (
							<Card key={item.id} className="p-4 hover-lift">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-primary/10 rounded-xl">
											<CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
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
					<EmptyState
						icon={CreditCard}
						title="No payment items yet"
						description="Create one to get started."
					/>
				)}
			</div>
		</PageShell>
	);
}

function ParentPaymentsView() {
	const { data: outstanding, isLoading } = trpc.payments.listOutstandingPayments.useQuery();

	if (isLoading) {
		return (
			<PageShell maxWidth="5xl">
				<div className="space-y-4">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell maxWidth="5xl">
			<PageHeader icon={CreditCard} title="Payments" description="Manage school payments">
				<Link href="/dashboard/payments/history">
					<Button variant="outline">
						<History className="h-4 w-4 mr-1" aria-hidden="true" />
						View Payment History
					</Button>
				</Link>
			</PageHeader>

			<div data-testid="payments-list">
				{outstanding && outstanding.length > 0 ? (
					<div className="space-y-3">
						{outstanding.map((item) => (
							<Card key={`${item.id}-${item.childId}`} className="p-4 hover-lift">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-primary/10 rounded-xl">
											<CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
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
					<EmptyState
						icon={CreditCard}
						title="No outstanding payments"
						description="You're all paid up!"
					/>
				)}
			</div>
		</PageShell>
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
