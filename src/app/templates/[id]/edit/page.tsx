"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/templates/${id}`).then((r) => r.json()).then((t) => {
      setName(t.name); setLabel(t.label); setBody(t.body);
    });
  }, [id]);

  async function save() {
    setError("");
    const res = await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, label, body })
    });
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    router.push("/templates");
  }

  async function remove() {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    router.push("/templates");
  }

  return (
    <AppShell>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Edit template</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full rounded-xl border px-3 py-2" />
        <p className="text-xs text-zinc-500">Placeholders: {"{{customerName}} {{projectName}} {{category}} {{sizeLabel}} {{dateLabel}} {{cuttingType}} {{material}} {{collarType}} {{workflowStage}} {{priority}}"}</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">Save</button>
          <button onClick={remove} className="rounded-xl border px-4 py-2 text-sm">Delete</button>
        </div>
      </div>
    </AppShell>
  );
}
