"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const absenceSchema = z
	.object({
		childId: z.string().min(1, "Child is required"),
		startDate: z.string().min(1, "Start date is required"),
		endDate: z.string().min(1, "End date is required"),
		reason: z.string().min(1, "Reason is required"),
	})
	.refine(
		(data) => {
			if (!data.startDate || !data.endDate) return true;
			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			return start <= end;
		},
		{
			message: "Start date must be before or equal to end date",
			path: ["startDate"],
		},
	);

type AbsenceFormData = z.infer<typeof absenceSchema>;

interface AbsenceReportFormProps {
	childrenLinks: { childId: string; child: { firstName: string; lastName: string } }[];
	defaultChildId?: string;
	onSuccess: () => void;
	onCancel?: () => void;
}

export function AbsenceReportForm({
	childrenLinks,
	defaultChildId,
	onSuccess,
	onCancel,
}: AbsenceReportFormProps) {
	const utils = trpc.useUtils();
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		control,
	} = useForm<AbsenceFormData>({
		resolver: zodResolver(absenceSchema),
		defaultValues: {
			childId:
				defaultChildId || (childrenLinks.length > 0 ? (childrenLinks[0]?.childId ?? "") : ""),
		},
	});

	const mutation = trpc.attendance.reportAbsence.useMutation({
		onSuccess: () => {
			utils.attendance.getAttendanceForChild.invalidate();
			toast.success("Absence reported successfully. The attendance records have been updated.");
			reset();
			onSuccess();
		},
	});

	const onSubmit = (data: AbsenceFormData) => {
		mutation.mutate({
			childId: data.childId,
			startDate: new Date(data.startDate),
			endDate: new Date(data.endDate),
			reason: data.reason,
		});
	};

	return (
		<Card>
			<CardHeader className="border-b border-border pb-4">
				<CardTitle>Report Future Absence</CardTitle>
				<CardDescription>Authorised absences will be marked in the records</CardDescription>
			</CardHeader>
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="md:col-span-2">
							<Label htmlFor="childId">Child</Label>
							<Controller
								control={control}
								name="childId"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full mt-1">
											<SelectValue placeholder="Select a child..." />
										</SelectTrigger>
										<SelectContent>
											{childrenLinks.map((link) => (
												<SelectItem key={link.childId} value={link.childId}>
													{link.child.firstName} {link.child.lastName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.childId && (
								<p className="mt-1 text-sm text-destructive">{errors.childId.message}</p>
							)}
						</div>

						<div>
							<Label htmlFor="startDate">Start Date</Label>
							<Input
								id="startDate"
								type="date"
								{...register("startDate")}
								className="w-full mt-1"
							/>
							{errors.startDate && (
								<p className="mt-1 text-sm text-destructive">{errors.startDate.message}</p>
							)}
						</div>

						<div>
							<Label htmlFor="endDate">End Date</Label>
							<Input id="endDate" type="date" {...register("endDate")} className="w-full mt-1" />
							{errors.endDate && (
								<p className="mt-1 text-sm text-destructive">{errors.endDate.message}</p>
							)}
						</div>
					</div>

					<div>
						<Label htmlFor="reason">Reason for Absence</Label>
						<Textarea
							id="reason"
							{...register("reason")}
							className="w-full mt-1"
							rows={3}
							placeholder="e.g. Doctor's appointment, Family emergency, Illness..."
						/>
						{errors.reason && (
							<p className="mt-1 text-sm text-destructive">{errors.reason.message}</p>
						)}
					</div>

					{mutation.error && (
						<Alert variant="destructive">
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{mutation.error.message}</AlertDescription>
						</Alert>
					)}

					<div className="flex justify-end gap-3 pt-4 border-t border-border">
						{onCancel && (
							<Button type="button" variant="ghost" onClick={onCancel}>
								Cancel
							</Button>
						)}
						<Button type="submit" disabled={mutation.isPending} className="px-6">
							{mutation.isPending ? "Submitting..." : "Submit Absence Report"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
