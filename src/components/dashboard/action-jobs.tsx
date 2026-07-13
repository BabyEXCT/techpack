import Link from "next/link";

type ActionJob = {
  id: string;
  title: string;
  stage: string;
  priority: string;
  href: string;
  actionLabel: string;
};

const actionJobs: ActionJob[] = [
  {
    id: "design-review",
    title: "Review active jobs",
    stage: "Design",
    priority: "Urgent",
    href: "/jobs",
    actionLabel: "Open jobs"
  },
  {
    id: "generate-export",
    title: "Continue generation flow",
    stage: "Production",
    priority: "Normal",
    href: "/jobs/new",
    actionLabel: "New job"
  }
];

export function ActionJobs() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {actionJobs.map((job) => (
        <article
          key={job.id}
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-2 py-1">{job.stage}</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              {job.priority}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-neutral-950">{job.title}</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Keep the main production flow reachable from the dashboard on desktop and phone.
          </p>
          <Link
            href={job.href}
            className="mt-4 inline-flex min-h-10 items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
          >
            {job.actionLabel}
          </Link>
        </article>
      ))}
    </div>
  );
}
