import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2 } from "lucide-react";

export interface CartItem {
	id: string;
	title: string;
	amount: number;
	childId: string;
	childName: string;
}

interface PaymentCartProps {
	items: CartItem[];
	onRemove: (id: string, childId: string) => void;
	onCheckout: () => void;
	isPending: boolean;
}

export function PaymentCart({ items, onRemove, onCheckout, isPending }: PaymentCartProps) {
	const total = items.reduce((sum, item) => sum + item.amount, 0);

	if (items.length === 0) return null;

	return (
		<div className="bg-white rounded-lg shadow-lg border border-primary-100 overflow-hidden sticky bottom-8 max-w-md ml-auto z-10">
			<div className="p-4 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
				<h3 className="font-bold text-primary-900 flex items-center">
					<ShoppingCart className="mr-2 h-5 w-5" />
					Your Cart ({items.length})
				</h3>
			</div>
			<div className="p-4 space-y-3 max-h-60 overflow-y-auto">
				{items.map((item) => (
					<div
						key={`${item.id}-${item.childId}`}
						className="flex justify-between items-center text-sm"
					>
						<div className="flex-1 mr-4">
							<p className="font-medium text-gray-900 line-clamp-1">{item.title}</p>
							<p className="text-gray-500 text-xs">{item.childName}</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="font-semibold text-gray-900">£{(item.amount / 100).toFixed(2)}</span>
							<button
								type="button"
								onClick={() => onRemove(item.id, item.childId)}
								className="text-gray-400 hover:text-red-500 transition-colors"
								aria-label={`Remove ${item.title} for ${item.childName}`}
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					</div>
				))}
			</div>
			<div className="p-4 bg-gray-50 border-t border-gray-100">
				<div className="flex justify-between items-center mb-4">
					<span className="text-gray-600 font-medium">Total to pay</span>
					<span className="text-xl font-bold text-gray-900">£{(total / 100).toFixed(2)}</span>
				</div>
				<Button className="w-full py-6 text-lg" onClick={onCheckout} disabled={isPending}>
					{isPending ? "Preparing Checkout..." : "Checkout Now"}
				</Button>
			</div>
		</div>
	);
}
