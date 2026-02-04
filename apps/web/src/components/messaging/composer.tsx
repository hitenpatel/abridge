"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const messageSchema = z.object({
	schoolId: z.string(),
	subject: z.string().min(1, "Subject is required"),
	body: z.string().min(1, "Message body is required"),
	category: z.enum(["STANDARD", "URGENT", "FYI"]),
	allChildren: z.boolean(),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface MessageComposerProps {
	schoolId: string;
}

export function MessageComposer({ schoolId }: MessageComposerProps) {
	const router = useRouter();
	const utils = trpc.useUtils();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<MessageFormData>({
		resolver: zodResolver(messageSchema),
		defaultValues: {
			schoolId,
			subject: "",
			body: "",
			category: "STANDARD",
			allChildren: true,
		},
	});

	const sendMutation = trpc.messaging.send.useMutation({
		onSuccess: () => {
			reset();
			utils.messaging.listSent.invalidate();
			router.push("/dashboard/messages");
		},
		onError: (err) => {
			setError(err.message);
		},
	});

	const onSubmit = (data: MessageFormData) => {
		setError(null);
		sendMutation.mutate(data);
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-6 bg-white p-6 rounded-lg shadow border border-gray-200"
		>
			{error && (
				<div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200">
					{error}
				</div>
			)}

			<div>
				<label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
					Subject
				</label>
				<Input
					id="subject"
					placeholder="Enter subject"
					{...register("subject")}
					className={errors.subject ? "border-red-500" : ""}
				/>
				{errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
			</div>

			<div>
				<label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
					Category
				</label>
				<select
					id="category"
					{...register("category")}
					className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
				>
					<option value="STANDARD">Standard</option>
					<option value="URGENT">Urgent</option>
					<option value="FYI">FYI</option>
				</select>
				{errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
			</div>

			<div>
				<label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
					Message Body
				</label>
				<textarea
					id="body"
					rows={6}
					{...register("body")}
					className={`w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${
						errors.body ? "border-red-500" : ""
					}`}
					placeholder="Type your message here..."
				/>
				{errors.body && <p className="text-red-500 text-xs mt-1">{errors.body.message}</p>}
			</div>

			<div className="flex items-center space-x-2">
				<input
					type="checkbox"
					id="allChildren"
					{...register("allChildren")}
					className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
				/>
				<label htmlFor="allChildren" className="text-sm text-gray-700">
					Send to All Children
				</label>
			</div>
			{/* MVP limitation: Don't implement specific child selection yet. */}

			<div className="pt-2">
				<Button
					type="submit"
					disabled={isSubmitting || sendMutation.isPending}
					className="w-full sm:w-auto"
				>
					{isSubmitting || sendMutation.isPending ? "Sending..." : "Send Message"}
				</Button>
			</div>
		</form>
	);
}
