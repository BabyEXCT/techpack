import { AppShell } from "@/components/layout/app-shell";
import { GenerationPanel } from "@/components/jobs/generation-panel";

export default async function GenerateJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Generate job package</h1>
        <GenerationPanel jobId={jobId} />
      </div>
    </AppShell>
  );
}

