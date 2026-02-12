"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const BADGE_VARIANTS: Record<string, "success" | "info" | "secondary" | "warning" | "default"> = {
	DINNER_MONEY: "success",
	TRIP: "info",
	CLUB: "secondary",
	UNIFORM: "warning",
	OTHER: "default",
};

interface PaymentItemListProps {
	schoolId: string;
}

export function PaymentItemList({ schoolId }: PaymentItemListProps) {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, isError } = trpc.payments.listPaymentItems.useQuery({
		schoolId,
		page,
		limit,
	});

	if (isLoading) return <div className="text-center py-4">Loading payments...</div>;
	if (isError)
		return <div className="text-center py-4 text-destructive">Error loading payments.</div>;
	if (!data || data.data.length === 0)
		return (
			<div className="text-center py-4 text-muted-foreground">No payment items created yet.</div>
		);

	return (
		<Card className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Title</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Category</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.data.map((item) => (
						<TableRow key={item.id}>
							<TableCell className="font-medium">{item.title}</TableCell>
							<TableCell className="text-muted-foreground">
								£{(item.amount / 100).toFixed(2)}
							</TableCell>
							<TableCell>
								<Badge variant={BADGE_VARIANTS[item.category] || "default"}>{item.category}</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{item.paymentCount} / {item.recipientCount} paid
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
