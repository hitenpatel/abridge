"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AttendanceList } from "@/components/attendance/attendance-list";
import { AbsenceReportForm } from "@/components/attendance/absence-report-form";
import { Button } from "@/components/ui/button";

export default function AttendancePage() {
  const { data: childrenLinks, isLoading } = trpc.user.listChildren.useQuery();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  if (isLoading) {
      return <div className="p-8 text-center">Loading...</div>;
  }

  if (!childrenLinks || childrenLinks.length === 0) {
      return (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No children found</h3>
                  <p className="mt-1 text-sm text-gray-500">You need to have children linked to your account to view attendance.</p>
              </div>
          </div>
      );
  }

  const firstChild = childrenLinks[0];
  if (!firstChild) return null;

  // Select first child by default
  const activeChildId = selectedChildId || firstChild.childId;
  const activeChild = childrenLinks.find(link => link.childId === activeChildId)?.child;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Attendance
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          {!isReporting && (
            <Button onClick={() => setIsReporting(true)}>
              Report Absence
            </Button>
          )}
        </div>
      </div>

      {isReporting && (
        <AbsenceReportForm
          childId={activeChildId}
          onSuccess={() => setIsReporting(false)}
          onCancel={() => setIsReporting(false)}
        />
      )}

      {childrenLinks.length > 1 && (
         <div className="sm:hidden">
            <label htmlFor="tabs" className="sr-only">Select a child</label>
            <select
              id="tabs"
              name="tabs"
              className="block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              value={activeChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {childrenLinks.map((link) => (
                <option key={link.childId} value={link.childId}>{link.child.firstName}</option>
              ))}
            </select>
         </div>
      )}

      {childrenLinks.length > 1 && (
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {childrenLinks.map((link) => {
                  const isCurrent = link.childId === activeChildId;
                  return (
                    <button
                      key={link.childId}
                      onClick={() => setSelectedChildId(link.childId)}
                      className={`
                        whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                        ${isCurrent
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
                      `}
                      aria-current={isCurrent ? 'page' : undefined}
                      type="button"
                    >
                      {link.child.firstName} {link.child.lastName}
                    </button>
                  );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* For single child, maybe show the name as a subtitle? */}
      {childrenLinks.length === 1 && activeChild && (
           <p className="text-sm text-gray-500">Viewing attendance for {activeChild.firstName} {activeChild.lastName}</p>
      )}

      <AttendanceList childId={activeChildId} />
    </div>
  );
}
