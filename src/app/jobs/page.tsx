import Link from "next/link";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { JobsList } from "@/components/jobs/jobs-list";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const WORKFLOW_STAGES = ["NEW", "DESIGN", "WAITING_APPROVAL", "PRODUCTION", "DONE"] as const;
const PRIORITIES = ["URGENT", "RUSH", "NORMAL"] as const;

const workflowLabels: Record<string, string> = {
  NEW: "New",
  DESIGN: "Design",
  WAITING_APPROVAL: "Waiting approval",
  PRODUCTION: "Production",
  DONE: "Done"
};

const priorityLabels: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  RUSH: "Rush"
};

const priorityTone: Record<string, string> = {
  URGENT: "text-rose-600",
  RUSH: "text-amber-600",
  NORMAL: "text-zinc-950"
};

async function getJobMetrics() {
  const [total, byStage, byPriority] = await Promise.all([
    db.job.count({ where: { deletedAt: null } }),
    db.job.groupBy({
      by: ["workflowStage"],
      where: { deletedAt: null },
      _count: { _all: true }
    }),
    db.job.groupBy({
      by: ["priority"],
      where: { deletedAt: null },
      _count: { _all: true }
    })
  ]);

  const stageCounts = Object.fromEntries(
    byStage.map((row) => [row.workflowStage, row._count._all])
  );
  const priorityCounts = Object.fromEntries(
    byPriority.map((row) => [row.priority, row._count._all])
  );

  return { total, stageCounts, priorityCounts };
}

export default async function JobsPage() {
  const { total, stageCounts, priorityCounts } = await getJobMetrics();

  const stageMetrics = WORKFLOW_STAGES.map((stage) => ({
    key: stage,
    label: workflowLabels[stage],
    count: stageCounts[stage] ?? 0
  }));

  const priorityMetrics = PRIORITIES.map((priority) => ({
    key: priority,
    label: priorityLabels[priority],
    count: priorityCounts[priority] ?? 0,
    tone: priorityTone[priority]
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <Briefcase className="size-4" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Jobs
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-zinc-500">
              Monitor production pipeline, priority load, and active job counts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/jobs/bin"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 text-sm font-medium text-zinc-700 shadow-soft transition-all hover:border-zinc-300 active:scale-[0.97]"
            >
              <Trash2 className="size-4" strokeWidth={1.5} />
              Bin
            </Link>
            <Link
              href="/jobs/new"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all duration-200 hover:bg-zinc-800 active:scale-[0.97]"
            >
              <Plus className="size-4" strokeWidth={2} />
              New job
            </Link>
          </div>
        </div>

        {/* Metrics dashboard */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total jobs</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">{total}</p>
          </div>
          {priorityMetrics.map((metric) => (
            <div key={metric.key} className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {metric.label}
              </p>
              <p className={`mt-1 text-xl font-semibold tracking-tight ${metric.tone}`}>
                {metric.count}
              </p>
            </div>
          ))}
        </div>

        {/* By workflow stage */}
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft">
          <p className="text-sm font-semibold text-zinc-950">Pipeline by stage</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stageMetrics.map((metric) => (
              <div key={metric.key} className="rounded-xl bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-500">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">
                  {metric.count}
                </p>
              </div>
            ))}
          </div>
        </div>

        <JobsList />
      </div>
    </AppShell>
  );
}
