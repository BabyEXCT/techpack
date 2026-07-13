"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

type JobListItem = {
  id: string;
  projectName: string;
  createdAt: string;
  deletedAt: string | null;
};

export function BinList() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      const response = await fetch("/api/jobs?scope=bin", { cache: "no-store" });
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

  async function restore(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}/trash`, { method: "PATCH" });

    if (!response.ok) {
      return;
    }

    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  async function removePermanently(jobId: string) {
    const confirmed = window.confirm("Delete permanently?");

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/jobs/${jobId}/trash`, { method: "POST" });

    if (!response.ok) {
      return;
    }

    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  if (!jobs.length) {
    return <EmptyState title="Bin is empty" description="Deleted jobs will appear here." />;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-base font-semibold">{job.projectName}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(job.deletedAt ?? job.createdAt).toLocaleString()}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void restore(job.id)} className="rounded-md border px-3 py-2 text-sm">
              Restore
            </button>
            <button
              type="button"
              onClick={() => void removePermanently(job.id)}
              className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
            >
              Delete permanently
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
