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
				<div className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 h-full">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-gray-500">Unread Messages</h3>
						<Mail className="h-4 w-4 text-blue-500" />
					</div>
					<div className="text-2xl font-bold">{data.unreadMessages}</div>
					{data.unreadMessages > 0 && (
						<p className="text-xs text-blue-600 mt-1 font-medium">
							{data.unreadMessages} new message{data.unreadMessages === 1 ? "" : "s"}
						</p>
					)}
				</div>
			</Link>

			{/* Outstanding Payments */}
			<Link href="/dashboard/payments" className="block">
				<div className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 h-full">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-gray-500">Outstanding Payments</h3>
						<CreditCard className="h-4 w-4 text-orange-500" />
					</div>
					<div className="text-2xl font-bold">{formatCurrency(data.paymentsTotal)}</div>
					<p className="text-xs text-gray-500 mt-1">
						{data.paymentsCount} item{data.paymentsCount === 1 ? "" : "s"} pending
					</p>
				</div>
			</Link>

			{/* Attendance Alerts */}
			<Link href="/dashboard/attendance" className="block">
				<div className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 h-full">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-gray-500">Attendance Alerts</h3>
						<AlertCircle className="h-4 w-4 text-red-500" />
					</div>
					<div className="text-2xl font-bold">{data.attendanceAlerts}</div>
					{data.attendanceAlerts > 0 && (
						<p className="text-xs text-red-600 mt-1 font-medium">Last 7 days</p>
					)}
				</div>
			</Link>
		</div>
	);
}
