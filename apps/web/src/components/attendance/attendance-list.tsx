"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceListProps {
  childId: string;
}

export function AttendanceList({ childId }: AttendanceListProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  const { data: attendance, isLoading } = trpc.attendance.getAttendanceForChild.useQuery({
    childId,
    startDate,
    endDate,
  });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getStatusColor = (mark: string) => {
    switch (mark) {
      case "PRESENT":
        return "bg-green-100 text-green-800";
      case "LATE":
        return "bg-yellow-100 text-yellow-800";
      case "ABSENT_UNAUTHORISED":
        return "bg-red-100 text-red-800";
      case "ABSENT_AUTHORISED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (mark: string) => {
      return mark.replace(/_/g, " ");
  };

  const handlePreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  if (isLoading) {
    return <div className="p-4 text-center">Loading attendance...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button
          onClick={handlePreviousMonth}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          type="button"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          type="button"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {days.map((day) => {
           const dayRecords = attendance?.filter(record => isSameDay(new Date(record.date), day)) || [];
           const isWeekend = day.getDay() === 0 || day.getDay() === 6;

           // Skip weekends if no records
           if (dayRecords.length === 0 && isWeekend) {
               return null;
           }
           
           if (dayRecords.length === 0) {
               return (
                   <div key={day.toISOString()} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                       <div className="flex flex-col">
                           <span className="text-sm font-medium text-gray-900">{format(day, "EEEE, d MMM")}</span>
                       </div>
                       <span className="text-sm text-gray-400 italic">No record</span>
                   </div>
               );
           }

           return (
            <div key={day.toISOString()} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-sm font-medium text-gray-900">{format(day, "EEEE, d MMM")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dayRecords.map(record => (
                    <div key={record.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.mark)}`}>
                        <span className="mr-1 font-bold">{record.session}:</span>
                        {getStatusLabel(record.mark)}
                    </div>
                ))}
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
}
