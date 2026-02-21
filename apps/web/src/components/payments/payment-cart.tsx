import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
		<Card className="overflow-hidden sticky bottom-8 max-w-md ml-auto z-10 border-primary-100">
			<CardHeader className="bg-primary-50 border-b border-primary-100">
				<CardTitle className="text-primary-900 flex items-center">
					<ShoppingCart className="mr-2 h-5 w-5" />
					Your Cart ({items.length})
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 space-y-3 max-h-60 overflow-y-auto">
				{items.map((item) => (
					<div
						key={`${item.id}-${item.childId}`}
						className="flex justify-between items-center text-sm"
					>
						<div className="flex-1 mr-4">
							<p className="font-medium text-foreground line-clamp-1">{item.title}</p>
							<p className="text-muted-foreground text-xs">{item.childName}</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="font-semibold text-foreground">
								£{(item.amount / 100).toFixed(2)}
							</span>
							<button
								type="button"
								onClick={() => onRemove(item.id, item.childId)}
								className="text-muted-foreground hover:text-destructive transition-colors"
								aria-label={`Remove ${item.title} for ${item.childName}`}
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					</div>
				))}
			</CardContent>
			<CardFooter className="flex-col bg-muted border-t border-border p-4">
				<div className="flex justify-between items-center mb-4 w-full">
					<span className="text-muted-foreground font-medium">Total to pay</span>
					<span className="text-xl font-bold text-foreground">£{(total / 100).toFixed(2)}</span>
				</div>
				<Button
					className="w-full py-6 text-lg"
					onClick={onCheckout}
					disabled={isPending}
					data-testid="cart-checkout-button"
				>
					{isPending ? "Preparing Checkout..." : "Checkout Now"}
				</Button>
			</CardFooter>
		</Card>
	);
}
