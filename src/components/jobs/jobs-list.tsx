"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

type JobListItem = {
  id: string;
  projectName: string;
  createdAt: string;
  workflowStage: "NEW" | "DESIGN" | "WAITING_APPROVAL" | "PRODUCTION" | "DONE";
  priority: "NORMAL" | "URGENT" | "RUSH";
  customerName?: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
};

const workflowStageLabels: Record<JobListItem["workflowStage"], string> = {
  NEW: "New",
  DESIGN: "Design",
  WAITING_APPROVAL: "Waiting Approval",
  PRODUCTION: "Production",
  DONE: "Done"
};

const priorityLabels: Record<JobListItem["priority"], string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  RUSH: "Rush"
};

export function JobsList() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const body = response.ok ? ((await response.json()) as JobListItem[]) : [];

      if (isMounted) {
        setJobs(body);
      }
    }

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  async function moveToBin(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}/trash`, { method: "DELETE" });

    if (!response.ok) {
      return;
    }

    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  if (!jobs.length) {
    return (
      <EmptyState title="No jobs yet" description="Create your first job to start generating tech packs." />
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-base font-semibold">{job.projectName}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(job.createdAt).toLocaleString()}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-2 py-1">
              {workflowStageLabels[job.workflowStage] ?? job.workflowStage}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              {priorityLabels[job.priority] ?? job.priority}
            </span>
            {job.customer?.name ?? job.customerName ? (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                {job.customer?.name ?? job.customerName}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/jobs/${job.id}/review`} className="rounded-md border px-3 py-2 text-sm">
              View
            </Link>
            <Link href={`/jobs/${job.id}/review`} className="rounded-md border px-3 py-2 text-sm">
              Edit
            </Link>
            <button
              type="button"
              onClick={() => void moveToBin(job.id)}
              className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
