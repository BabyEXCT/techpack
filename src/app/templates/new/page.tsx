"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, label, body })
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    router.push("/templates");
  }

  return (
    <AppShell>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">New template</h1>
        <input placeholder="name (unique, e.g. customer_confirmation)" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <input placeholder="label (e.g. Customer confirmation)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <textarea placeholder="body with {{customerName}} etc." value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full rounded-xl border px-3 py-2" />
        <p className="text-xs text-zinc-500">Placeholders: {"{{customerName}} {{projectName}} {{category}} {{sizeLabel}} {{dateLabel}} {{cuttingType}} {{material}} {{collarType}} {{workflowStage}} {{priority}}"}</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={submit} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">Save</button>
      </div>
    </AppShell>
  );
}
