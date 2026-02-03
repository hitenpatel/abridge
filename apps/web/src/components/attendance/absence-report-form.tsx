"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
	const [showSuccess, setShowSuccess] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<AbsenceFormData>({
		resolver: zodResolver(absenceSchema),
		defaultValues: {
			childId: defaultChildId || (childrenLinks.length > 0 ? childrenLinks[0].childId : ""),
		},
	});

	const mutation = trpc.attendance.reportAbsence.useMutation({
		onSuccess: () => {
			utils.attendance.getAttendanceForChild.invalidate();
			setShowSuccess(true);
			setTimeout(() => {
				setShowSuccess(false);
				reset();
				onSuccess();
			}, 3000);
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

	if (showSuccess) {
		return (
			<div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center animate-in fade-in duration-500">
				<div className="flex justify-center mb-4">
					<div className="bg-green-100 p-3 rounded-full">
						<svg
							className="h-6 w-6 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				</div>
				<h3 className="text-lg font-medium text-green-900">Absence Reported Successfully</h3>
				<p className="mt-2 text-sm text-green-700">The attendance records have been updated.</p>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200"
		>
			<div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
				<h3 className="text-lg font-semibold text-gray-900">Report Future Absence</h3>
				<p className="text-xs text-gray-500 italic">
					Authorised absences will be marked in the records
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="md:col-span-2">
					<label htmlFor="childId" className="block text-sm font-medium text-gray-700 mb-1">
						Child
					</label>
					<select
						id="childId"
						{...register("childId")}
						className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
					>
						<option value="">Select a child...</option>
						{childrenLinks.map((link) => (
							<option key={link.childId} value={link.childId}>
								{link.child.firstName} {link.child.lastName}
							</option>
						))}
					</select>
					{errors.childId && <p className="mt-1 text-sm text-red-600">{errors.childId.message}</p>}
				</div>

				<div>
					<label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
						Start Date
					</label>
					<Input id="startDate" type="date" {...register("startDate")} className="w-full" />
					{errors.startDate && (
						<p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
					)}
				</div>

				<div>
					<label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
						End Date
					</label>
					<Input id="endDate" type="date" {...register("endDate")} className="w-full" />
					{errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
				</div>
			</div>

			<div>
				<label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
					Reason for Absence
				</label>
				<textarea
					id="reason"
					{...register("reason")}
					className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
					rows={3}
					placeholder="e.g. Doctor's appointment, Family emergency, Illness..."
				/>
				{errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>}
			</div>

			{mutation.error && (
				<div className="p-3 bg-red-50 text-red-800 rounded-md text-sm border border-red-100">
					<strong>Error:</strong> {mutation.error.message}
				</div>
			)}

			<div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
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
	);
}
