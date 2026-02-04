"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, Check, CreditCard, ShoppingCart, User } from "lucide-react";
import { useState } from "react";
import { type CartItem, PaymentCart } from "./payment-cart";

export function OutstandingPayments() {
	const [cart, setCart] = useState<CartItem[]>([]);
	const { data: payments, isLoading, isError } = trpc.payments.listOutstandingPayments.useQuery();

	const createSession = trpc.payments.createCheckoutSession.useMutation({
		onSuccess: (data) => {
			if (data.url) {
				window.location.href = data.url;
			}
		},
	});

	const createCartSession = trpc.payments.createCartCheckout.useMutation({
		onSuccess: (data) => {
			if (data.url) {
				window.location.href = data.url;
			}
		},
	});

	const addToCart = (payment: any) => {
		if (cart.some((item) => item.id === payment.id && item.childId === payment.childId)) return;
		setCart([
			...cart,
			{
				id: payment.id,
				title: payment.title,
				amount: payment.amount,
				childId: payment.childId,
				childName: payment.childName,
			},
		]);
	};

	const removeFromCart = (id: string, childId: string) => {
		setCart(cart.filter((item) => !(item.id === id && item.childId === childId)));
	};

	const handleCartCheckout = () => {
		createCartSession.mutate({
			items: cart.map((item) => ({
				paymentItemId: item.id,
				childId: item.childId,
			})),
		});
	};

	if (isLoading)
		return <div className="text-center py-8 text-gray-500">Loading your payments...</div>;
	if (isError) return <div className="text-center py-8 text-red-500">Error loading payments.</div>;
	if (!payments || payments.length === 0) {
		return (
			<div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
				<CreditCard className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-sm font-medium text-gray-900">No outstanding payments</h3>
				<p className="mt-1 text-sm text-gray-500">You're all caught up! Great job.</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{payments.map((payment) => {
					const isInCart = cart.some(
						(item) => item.id === payment.id && item.childId === payment.childId,
					);

					return (
						<div
							key={`${payment.id}-${payment.childId}`}
							className="bg-white rounded-lg shadow border p-6 flex flex-col justify-between"
						>
							<div>
								<div className="flex justify-between items-start mb-2">
									<span className="text-xs font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-1 rounded">
										{payment.category}
									</span>
									<span className="text-lg font-bold text-gray-900">
										£{(payment.amount / 100).toFixed(2)}
									</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
									{payment.title}
								</h3>
								<div className="mt-2 space-y-1">
									<div className="flex items-center text-sm text-gray-500">
										<User className="mr-1.5 h-4 w-4 flex-shrink-0" />
										{payment.childName}
									</div>
									{payment.dueDate && (
										<div className="flex items-center text-sm text-gray-500">
											<Calendar className="mr-1.5 h-4 w-4 flex-shrink-0" />
											Due: {new Date(payment.dueDate).toLocaleDateString()}
										</div>
									)}
								</div>
								{payment.description && (
									<p className="mt-3 text-sm text-gray-600 line-clamp-2">{payment.description}</p>
								)}
							</div>
							<div className="mt-6 space-y-2">
								<Button
									variant={isInCart ? "outline" : "primary"}
									className="w-full"
									onClick={() =>
										isInCart ? removeFromCart(payment.id, payment.childId) : addToCart(payment)
									}
								>
									{isInCart ? (
										<>
											<Check className="mr-2 h-4 w-4" /> In Cart
										</>
									) : (
										<>
											<ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
										</>
									)}
								</Button>
								<Button
									variant="ghost"
									className="w-full text-gray-500 hover:text-gray-700"
									onClick={() =>
										createSession.mutate({ paymentItemId: payment.id, childId: payment.childId })
									}
									disabled={createSession.isPending}
								>
									{createSession.isPending ? "Preparing..." : "Pay Now"}
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			<PaymentCart
				items={cart}
				onRemove={removeFromCart}
				onCheckout={handleCartCheckout}
				isPending={createCartSession.isPending}
			/>
		</div>
	);
}
