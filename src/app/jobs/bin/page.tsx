import Link from "next/link";
import { BinList } from "@/components/jobs/bin-list";
import { AppShell } from "@/components/layout/app-shell";

export default function BinPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Bin</h1>
          <Link href="/jobs" className="rounded-md border px-4 py-2">
            Back to jobs
          </Link>
        </div>
        <BinList />
      </div>
    </AppShell>
  );
}
