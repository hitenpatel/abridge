"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const absenceSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: "Start date must be before or equal to end date",
  path: ["startDate"],
});

type AbsenceFormData = z.infer<typeof absenceSchema>;

interface AbsenceReportFormProps {
  childId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AbsenceReportForm({ childId, onSuccess, onCancel }: AbsenceReportFormProps) {
  const utils = trpc.useUtils();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
  });

  const mutation = trpc.attendance.reportAbsence.useMutation({
    onSuccess: () => {
      utils.attendance.getAttendanceForChild.invalidate();
      reset();
      onSuccess();
    },
  });

  const onSubmit = (data: AbsenceFormData) => {
    mutation.mutate({
      childId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-lg shadow-md border border-gray-100">
      <h3 className="text-lg font-medium text-gray-900">Report Absence</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <Input
            id="startDate"
            type="date"
            {...register("startDate")}
            className="w-full"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <Input
            id="endDate"
            type="date"
            {...register("endDate")}
            className="w-full"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
          Reason
        </label>
        <textarea
          id="reason"
          {...register("reason")}
          className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          placeholder="Please explain the reason for absence..."
        />
        {errors.reason && (
          <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
        )}
      </div>

      {mutation.error && (
        <div className="p-3 bg-red-50 text-red-800 rounded text-sm">
          Error: {mutation.error.message}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Submitting..." : "Submit Report"}
        </Button>
      </div>
    </form>
  );
}
