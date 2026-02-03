"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const paymentItemSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	amount: z.string().refine((val) => !Number.isNaN(Number.parseFloat(val)) && Number.parseFloat(val) > 0, {
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
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 shadow rounded-lg">
			<div>
				<label htmlFor="title" className="block text-sm font-medium text-gray-700">
					Title
				</label>
				<input
					{...register("title")}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
					placeholder="e.g. Science Museum Trip"
				/>
				{errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
			</div>

			<div>
				<label htmlFor="description" className="block text-sm font-medium text-gray-700">
					Description (Optional)
				</label>
				<textarea
					{...register("description")}
					rows={3}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label htmlFor="amount" className="block text-sm font-medium text-gray-700">
						Amount (£)
					</label>
					<input
						{...register("amount")}
						type="number"
						step="0.01"
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
						placeholder="0.00"
					/>
					{errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
				</div>

				<div>
					<label htmlFor="category" className="block text-sm font-medium text-gray-700">
						Category
					</label>
					<select
						{...register("category")}
						className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
					>
						<option value="DINNER_MONEY">Dinner Money</option>
						<option value="TRIP">School Trip</option>
						<option value="CLUB">After School Club</option>
						<option value="UNIFORM">Uniform</option>
						<option value="OTHER">Other</option>
					</select>
				</div>
			</div>

			<div className="flex items-center">
				<input
					{...register("allChildren")}
					type="checkbox"
					className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
				/>
				<label htmlFor="allChildren" className="ml-2 block text-sm text-gray-900">
					Send to all children in school
				</label>
			</div>

			<div className="pt-4">
				<Button
					type="submit"
					className="w-full"
					disabled={createPaymentItem.isPending}
				>
					{createPaymentItem.isPending ? "Creating..." : "Create Payment Item"}
				</Button>
			</div>
		</form>
	);
}
