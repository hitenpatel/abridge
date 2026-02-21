"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
			toast("Message sent successfully");
			router.push("/dashboard/messages");
		},
		onError: (err) => {
			setError(err.message);
			toast("Failed to send message");
		},
	});

	const onSubmit = (data: MessageFormData) => {
		setError(null);
		sendMutation.mutate(data);
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					{error && (
						<div className="bg-destructive/10 text-destructive p-3 rounded text-sm border border-destructive/20">
							{error}
						</div>
					)}

					<div>
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							data-testid="message-subject-input"
							placeholder="Enter subject"
							{...register("subject")}
							className={errors.subject ? "border-destructive" : ""}
						/>
						{errors.subject && (
							<p className="text-destructive text-xs mt-1">{errors.subject.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="category">Category</Label>
						<select
							id="category"
							data-testid="message-category-select"
							{...register("category")}
							className="w-full border border-border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ring bg-card"
						>
							<option value="STANDARD">Standard</option>
							<option value="URGENT">Urgent</option>
							<option value="FYI">FYI</option>
						</select>
						{errors.category && (
							<p className="text-destructive text-xs mt-1">{errors.category.message}</p>
						)}
					</div>

					<div>
						<Label htmlFor="body">Message Body</Label>
						<Textarea
							id="body"
							data-testid="message-body-input"
							rows={6}
							{...register("body")}
							className={errors.body ? "border-destructive" : ""}
							placeholder="Type your message here..."
						/>
						{errors.body && <p className="text-destructive text-xs mt-1">{errors.body.message}</p>}
					</div>

					<div className="flex items-center space-x-2">
						<input
							type="checkbox"
							id="allChildren"
							{...register("allChildren")}
							className="h-4 w-4 text-primary focus:ring-ring border-border rounded"
						/>
						<Label htmlFor="allChildren" className="text-sm font-normal">
							Send to All Children
						</Label>
					</div>
					{/* MVP limitation: Don't implement specific child selection yet. */}

					<div className="pt-2">
						<Button
							type="submit"
							data-testid="message-send-button"
							disabled={isSubmitting || sendMutation.isPending}
							className="w-full sm:w-auto"
						>
							{isSubmitting || sendMutation.isPending ? "Sending..." : "Send Message"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
