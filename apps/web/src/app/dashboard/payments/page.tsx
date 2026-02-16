"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Card } from "@/components/ui/card";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function PaymentsDashboardPage() {
	const features = useFeatureToggles();
	if (!features.paymentsEnabled) return <FeatureDisabled featureName="Payments" />;
	const { data: session } = trpc.auth.getSession.useQuery();
	const [view, setView] = useState<"upcoming" | "history">("upcoming");
	const [customAmount, setCustomAmount] = useState("");

	// Mock payment data (in real app, fetch from API)
	const upcomingPayments = [
		{
			id: "1",
			title: "Science Museum Trip",
			description: "Permission slip signed • Transport included",
			amount: 25.0,
			dueDate: "Tomorrow",
			icon: "science",
			iconColor: "purple",
			teacher: "Ms. Thompson",
			urgent: true,
		},
		{
			id: "2",
			title: "November Lunch Plan",
			description: "20 Meals • Hot Lunch Program",
			amount: 85.0,
			dueDate: "Nov 1",
			icon: "restaurant",
			iconColor: "blue",
			autoRenew: true,
		},
	];

	const recentPayments = [
		{
			id: "3",
			title: "Art Supplies Fee",
			amount: 15.0,
			paidDate: "Oct 20",
			icon: "palette",
		},
		{
			id: "4",
			title: "Fall Festival Ticket",
			amount: 12.0,
			paidDate: "Oct 15",
			icon: "festival",
		},
	];

	const balance = 142.5;
	const firstName = session?.name?.split(" ")[0] || "Student";

	return (
		<div
			className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8"
			data-testid="payments-list"
		>
			{/* Left Column - Expenses List */}
			<div className="lg:col-span-7 flex flex-col gap-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-4xl font-bold mb-1">{firstName}'s School Expenses</h1>
						<p className="text-gray-500">Manage upcoming trips, lunches, and fees.</p>
					</div>
					<div className="hidden sm:flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
						<button
							type="button"
							onClick={() => setView("upcoming")}
							className={`px-4 py-2 rounded-lg font-medium transition-all ${
								view === "upcoming"
									? "bg-primary text-white shadow-sm"
									: "text-gray-500 hover:bg-gray-50"
							}`}
						>
							Upcoming
						</button>
						<button
							type="button"
							onClick={() => setView("history")}
							className={`px-4 py-2 rounded-lg font-medium transition-all ${
								view === "history"
									? "bg-primary text-white shadow-sm"
									: "text-gray-500 hover:bg-gray-50"
							}`}
						>
							History
						</button>
					</div>
				</div>

				{/* Payments List */}
				<div
					className="flex-grow bg-card rounded-3xl p-6 shadow-sm border border-gray-100 overflow-y-auto"
					style={{ maxHeight: "700px" }}
				>
					{view === "upcoming" ? (
						<>
							{/* Due Soon Section */}
							<div className="flex items-center gap-2 mb-4">
								<span className="material-symbols-rounded text-amber-500">warning_amber</span>
								<h3 className="text-lg font-bold text-gray-800">Due Soon</h3>
							</div>

							{upcomingPayments.map((payment, index) => (
								<div
									key={payment.id}
									className="group relative flex items-center p-4 mb-4 rounded-2xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all bg-white"
									data-testid={`payment-item-${index + 1}`}
								>
									<div
										className={`w-16 h-16 rounded-xl bg-${payment.iconColor}-100 flex items-center justify-center text-${payment.iconColor}-600 mr-5 shrink-0`}
									>
										<span className="material-symbols-rounded text-3xl">{payment.icon}</span>
									</div>
									<div className="flex-grow">
										<div className="flex justify-between items-start mb-1">
											<h4 className="text-xl font-bold text-gray-800 group-hover:text-primary transition-colors">
												{payment.title}
											</h4>
											<span
												className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
													payment.urgent ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
												}`}
											>
												Due {payment.dueDate}
											</span>
										</div>
										<p className="text-sm text-gray-500 mb-2">{payment.description}</p>
										{payment.teacher && (
											<div className="flex items-center gap-2">
												<div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
													<span className="material-symbols-rounded text-xs text-primary">
														person
													</span>
												</div>
												<span className="text-xs font-medium text-gray-500">{payment.teacher}</span>
											</div>
										)}
										{payment.autoRenew && (
											<div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
												<span className="material-symbols-rounded text-sm">schedule</span>
												Auto-renew available
											</div>
										)}
									</div>
									<div className="ml-4 flex flex-col items-end gap-2">
										<span className="text-2xl font-bold text-gray-900">
											${payment.amount.toFixed(2)}
										</span>
										<button
											type="button"
											data-testid="pay-button"
											className={
												payment.urgent
													? "bg-primary hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-orange-200 transition transform active:scale-95"
													: "bg-white border-2 border-gray-200 hover:border-primary hover:text-primary text-gray-600 px-5 py-2 rounded-xl font-bold transition"
											}
										>
											{payment.urgent ? "Pay" : "Details"}
										</button>
									</div>
								</div>
							))}

							{/* Recently Paid Section */}
							<div className="flex items-center gap-2 mb-4 mt-8 opacity-60">
								<span className="material-symbols-rounded">check_circle</span>
								<h3 className="text-lg font-bold">Recently Paid</h3>
							</div>

							{recentPayments.map((payment) => (
								<div
									key={payment.id}
									className="flex items-center p-4 mb-4 rounded-2xl border border-transparent bg-gray-50 opacity-75 hover:opacity-100 transition"
								>
									<div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 mr-5 shrink-0">
										<span className="material-symbols-rounded text-2xl">{payment.icon}</span>
									</div>
									<div className="flex-grow">
										<h4 className="text-lg font-bold text-gray-700">{payment.title}</h4>
										<p className="text-sm text-gray-500">Paid on {payment.paidDate}</p>
									</div>
									<div className="text-right">
										<span className="text-lg font-bold text-gray-400 line-through">
											${payment.amount.toFixed(2)}
										</span>
										<div className="text-green-500 text-xs font-bold uppercase">Paid</div>
									</div>
								</div>
							))}
						</>
					) : (
						<div className="text-center py-12 text-gray-500">
							<span className="material-symbols-rounded text-4xl mb-2 text-gray-300">history</span>
							<p>Payment history coming soon</p>
						</div>
					)}
				</div>
			</div>

			{/* Right Column - Balance & Top-Up */}
			<div className="lg:col-span-5 flex flex-col gap-6">
				{/* Balance Card */}
				<Card className="rounded-3xl p-8 shadow-lg relative overflow-hidden flex flex-col items-center text-center h-[500px] border-0">
					<h2 className="text-2xl font-bold text-gray-800 z-20 mb-2">Current Balance</h2>
					<p className="text-gray-500 z-20 mb-6">Safe & Secure School Wallet</p>

					{/* Liquid Container */}
					<div className="relative w-48 h-64 border-4 border-gray-200 rounded-b-3xl rounded-t-lg bg-white/20 backdrop-blur-sm z-10">
						<div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-52 h-6 rounded-full border-4 border-gray-200 bg-white z-30" />

						{/* Liquid Fill (simplified - would need CSS animation in real implementation) */}
						<div className="absolute bottom-0 left-0 right-0 h-4/5 bg-gradient-to-t from-secondary to-yellow-300 rounded-b-3xl" />

						{/* Floating Coins */}
						<div className="absolute bottom-10 left-4 text-yellow-600 opacity-80 z-20">
							<span className="material-symbols-rounded text-3xl">monetization_on</span>
						</div>
						<div className="absolute bottom-20 right-8 text-yellow-500 opacity-60 z-20">
							<span className="material-symbols-rounded text-2xl">monetization_on</span>
						</div>

						{/* Balance Amount */}
						<div className="absolute inset-0 flex items-center justify-center z-40">
							<span className="text-5xl font-extrabold text-white drop-shadow-md">
								${balance.toFixed(2)}
							</span>
						</div>
					</div>

					{/* Background Blurs */}
					<div className="absolute top-20 right-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl opacity-50 z-0" />
					<div className="absolute bottom-20 left-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-50 z-0" />

					{/* Auto-refill Toggle */}
					<div className="mt-8 z-20 flex items-center gap-3 bg-gray-50 p-2 pr-4 rounded-full border border-gray-100">
						<label
							htmlFor="auto-refill"
							className="relative inline-flex items-center cursor-pointer"
						>
							<input id="auto-refill" type="checkbox" className="sr-only peer" />
							<div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-400" />
							<span className="ml-3 text-sm font-semibold text-gray-600 cursor-pointer">
								Auto-refill when below $10
							</span>
						</label>
					</div>
				</Card>

				{/* Quick Top-Up */}
				<Card className="bg-primary/5 rounded-3xl p-6 border-2 border-dashed border-primary/20">
					<h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
						<span className="material-symbols-rounded text-primary">add_card</span>
						Quick Top-Up
					</h3>

					<div className="grid grid-cols-3 gap-3 mb-4">
						{[20, 50, 100].map((amount) => (
							<button
								key={amount}
								type="button"
								className="py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:border-primary hover:text-primary hover:bg-orange-50 transition"
							>
								+${amount}
							</button>
						))}
					</div>

					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<span className="text-gray-500 font-bold">$</span>
						</div>
						<input
							type="number"
							value={customAmount}
							onChange={(e) => setCustomAmount(e.target.value)}
							className="w-full pl-8 pr-32 py-4 rounded-xl border-none ring-1 ring-gray-200 bg-white focus:ring-2 focus:ring-primary shadow-sm text-lg font-bold text-gray-800"
							placeholder="Custom Amount"
						/>
						<button
							type="button"
							className="absolute right-2 top-2 bottom-2 bg-gray-900 text-white px-6 rounded-lg font-bold hover:bg-gray-800 transition flex items-center gap-2"
						>
							Add
							<span className="material-symbols-rounded text-sm">arrow_forward</span>
						</button>
					</div>
				</Card>

				{/* Payment Methods */}
				<Card className="rounded-3xl p-6 border border-gray-100">
					<h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
						Payment Methods
					</h3>
					<div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-serif font-bold italic">
								V
							</div>
							<div className="flex flex-col">
								<span className="font-bold text-gray-800 text-sm">Visa ending in 4242</span>
								<span className="text-xs text-gray-500">Expires 12/25</span>
							</div>
						</div>
						<button type="button" className="text-primary text-sm font-bold hover:underline">
							Edit
						</button>
					</div>
				</Card>
			</div>
		</div>
	);
}
