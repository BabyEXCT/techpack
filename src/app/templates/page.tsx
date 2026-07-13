import Link from "next/link";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await db.messageTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Templates</h1>
          <Link href="/templates/new" className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">
            New template
          </Link>
        </div>
        <div className="grid gap-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}/edit`}
              className="block rounded-2xl border border-zinc-200 p-4 shadow-soft"
            >
              <p className="font-medium">{t.label}</p>
              <p className="text-sm text-zinc-500">{t.name}</p>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{t.body}</p>
            </Link>
          ))}
          {!templates.length && <p className="text-sm text-zinc-500">No templates yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
