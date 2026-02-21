"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const paymentItemSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	amount: z
		.string()
		.refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
			message: "Amount must be a positive number",
		}),
	category: z.enum(["DINNER_MONEY", "TRIP", "CLUB", "UNIFORM", "OTHER"]),
	allChildren: z.boolean(),
});

type PaymentItemValues = z.infer<typeof paymentItemSchema>;

interface PaymentItemFormProps {
	schoolId: string;
}

export function PaymentItemForm({ schoolId }: PaymentItemFormProps) {
	const router = useRouter();
	const createPaymentItem = trpc.payments.createPaymentItem.useMutation({
		onSuccess: () => {
			router.push("/dashboard/payments");
		},
	});

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<PaymentItemValues>({
		resolver: zodResolver(paymentItemSchema),
		defaultValues: {
			category: "OTHER",
			allChildren: true,
		},
	});

	const onSubmit = (values: PaymentItemValues) => {
		// Convert pounds to pence
		const amountInPence = Math.round(Number.parseFloat(values.amount) * 100);

		createPaymentItem.mutate({
			schoolId,
			title: values.title,
			description: values.description,
			amount: amountInPence,
			category: values.category,
			allChildren: values.allChildren,
		});
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					<div>
						<Label htmlFor="title">Title</Label>
						<input
							{...register("title")}
							data-testid="payment-title-input"
							className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
							placeholder="e.g. Science Museum Trip"
						/>
						{errors.title && (
							<p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea {...register("description")} rows={3} className="mt-1" />
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="amount">Amount (£)</Label>
							<input
								{...register("amount")}
								type="number"
								step="0.01"
								data-testid="payment-amount-input"
								className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
								placeholder="0.00"
							/>
							{errors.amount && (
								<p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>
							)}
						</div>

						<div>
							<Label htmlFor="category">Category</Label>
							<Controller
								name="category"
								control={control}
								render={({ field }) => (
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<SelectTrigger className="mt-1" data-testid="payment-category-select">
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DINNER_MONEY">Dinner Money</SelectItem>
											<SelectItem value="TRIP">School Trip</SelectItem>
											<SelectItem value="CLUB">After School Club</SelectItem>
											<SelectItem value="UNIFORM">Uniform</SelectItem>
											<SelectItem value="OTHER">Other</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>
					</div>

					<div className="flex items-center">
						<input
							{...register("allChildren")}
							type="checkbox"
							className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
						/>
						<Label htmlFor="allChildren" className="ml-2">
							Send to all children in school
						</Label>
					</div>

					<div className="pt-4">
						<Button type="submit" className="w-full" disabled={createPaymentItem.isPending} data-testid="payment-create-submit">
							{createPaymentItem.isPending ? "Creating..." : "Create Payment Item"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
