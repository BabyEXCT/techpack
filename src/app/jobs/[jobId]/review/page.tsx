import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewJobClient } from "@/components/jobs/review-job-client";

export default async function ReviewJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Review job</h1>
          <Link
            href={`/jobs/new?jobId=${jobId}`}
            className="inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-4 py-2 text-sm font-medium text-neutral-800"
          >
            Back to edit job
          </Link>
        </div>
        <ReviewJobClient jobId={jobId} />
      </div>
    </AppShell>
  );
}
