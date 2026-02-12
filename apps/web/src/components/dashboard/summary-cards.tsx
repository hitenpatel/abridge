import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CreditCard, Mail } from "lucide-react";
import Link from "next/link";

interface SummaryMetrics {
	unreadMessages: number;
	paymentsCount: number;
	paymentsTotal: number; // in pence
	attendanceAlerts: number;
}

interface SummaryCardsProps {
	data: SummaryMetrics;
}

export function SummaryCards({ data }: SummaryCardsProps) {
	const formatCurrency = (amountInPence: number) => {
		return new Intl.NumberFormat("en-GB", {
			style: "currency",
			currency: "GBP",
		}).format(amountInPence / 100);
	};

	return (
		<div className="grid gap-4 md:grid-cols-3 mb-8">
			{/* Unread Messages */}
			<Link href="/dashboard/messages" className="block">
				<Card className="hover:shadow-md transition-shadow h-full">
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-sm font-medium text-muted-foreground">Unread Messages</h3>
							<Mail className="h-4 w-4 text-info" />
						</div>
						<div className="text-2xl font-bold">{data.unreadMessages}</div>
						{data.unreadMessages > 0 && (
							<p className="text-xs text-info mt-1 font-medium">
								{data.unreadMessages} new message{data.unreadMessages === 1 ? "" : "s"}
							</p>
						)}
					</CardContent>
				</Card>
			</Link>

			{/* Outstanding Payments */}
			<Link href="/dashboard/payments" className="block">
				<Card className="hover:shadow-md transition-shadow h-full">
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-sm font-medium text-muted-foreground">Outstanding Payments</h3>
							<CreditCard className="h-4 w-4 text-warning" />
						</div>
						<div className="text-2xl font-bold">{formatCurrency(data.paymentsTotal)}</div>
						<p className="text-xs text-muted-foreground mt-1">
							{data.paymentsCount} item{data.paymentsCount === 1 ? "" : "s"} pending
						</p>
					</CardContent>
				</Card>
			</Link>

			{/* Attendance Alerts */}
			<Link href="/dashboard/attendance" className="block">
				<Card className="hover:shadow-md transition-shadow h-full">
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-sm font-medium text-muted-foreground">Attendance Alerts</h3>
							<AlertCircle className="h-4 w-4 text-destructive" />
						</div>
						<div className="text-2xl font-bold">{data.attendanceAlerts}</div>
						{data.attendanceAlerts > 0 && (
							<p className="text-xs text-destructive mt-1 font-medium">Last 7 days</p>
						)}
					</CardContent>
				</Card>
			</Link>
		</div>
	);
}
