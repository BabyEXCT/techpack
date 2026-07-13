import { AppShell } from "@/components/layout/app-shell";
import { JobForm } from "@/components/jobs/job-form";

export default async function NewJobPage({
  searchParams
}: {
  searchParams?: Promise<{ jobId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const editJobId = typeof params.jobId === "string" ? params.jobId : undefined;

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{editJobId ? "Edit job" : "New job"}</h1>
        <JobForm editJobId={editJobId} />
      </div>
    </AppShell>
  );
}
