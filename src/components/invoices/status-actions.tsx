"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ALLOWED_TRANSITIONS, STATUS_LABELS, type InvoiceStatus } from "@/lib/invoices/status-transitions";

export function StatusActions({
  invoiceId,
  currentStatus
}: {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  const changeStatus = async (status: InvoiceStatus) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (allowed.length === 0) return null;

  return (
    <div className="relative inline-flex">
      <select
        value=""
        disabled={saving}
        onChange={(e) => {
          if (e.target.value) changeStatus(e.target.value as InvoiceStatus);
        }}
        className="appearance-none rounded-xl border border-zinc-200/80 bg-white px-4 py-2 pr-8 text-sm font-medium text-zinc-700 shadow-soft transition-all hover:border-zinc-300 focus:outline-none disabled:opacity-50"
      >
        <option value="">Change status...</option>
        {allowed.map((s) => (
          <option key={s} value={s}>
            → {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
    </div>
  );
}
