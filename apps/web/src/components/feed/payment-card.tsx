"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import Link from "next/link";

type PaymentCategory = "DINNER_MONEY" | "TRIP" | "CLUB" | "UNIFORM" | "OTHER";

interface PaymentCardProps {
	title: string;
	amountDuePence: number;
	dueDate?: Date | string | null;
	category: PaymentCategory;
	paymentItemId?: string;
}

const CATEGORY_VARIANT: Record<
	PaymentCategory,
	"success" | "info" | "secondary" | "warning" | "default"
> = {
	DINNER_MONEY: "success",
	TRIP: "info",
	CLUB: "secondary",
	UNIFORM: "warning",
	OTHER: "default",
};

const CATEGORY_LABELS: Record<PaymentCategory, string> = {
	DINNER_MONEY: "Dinner Money",
	TRIP: "Trip",
	CLUB: "Club",
	UNIFORM: "Uniform",
	OTHER: "Other",
};

function formatCurrency(pence: number): string {
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: "GBP",
	}).format(pence / 100);
}

export function PaymentCard({ title, amountDuePence, dueDate, category }: PaymentCardProps) {
	const due = dueDate ? (typeof dueDate === "string" ? new Date(dueDate) : dueDate) : null;

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
						<CreditCard className="h-4 w-4 text-amber-600" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-foreground truncate">{title}</p>
						<div className="flex items-center gap-2 mt-1">
							<span className="text-lg font-bold text-foreground">
								{formatCurrency(amountDuePence)}
							</span>
							<Badge variant={CATEGORY_VARIANT[category]}>{CATEGORY_LABELS[category]}</Badge>
						</div>
						<div className="flex items-center justify-between mt-2">
							{due && (
								<span className="text-xs text-muted-foreground">
									Due {format(due, "d MMM yyyy")}
								</span>
							)}
							<Link
								href="/dashboard/payments"
								className="text-xs font-semibold text-primary hover:underline"
							>
								Pay
							</Link>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
