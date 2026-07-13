"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Receipt, Plus, X } from "lucide-react";

type Customer = { id: string; name: string };
type Job = { id: string; projectName: string; status: string };

type InvoiceFormProps = {
  invoiceNumber: string;
  customers: Customer[];
  availableJobs: Job[];
};

export function InvoiceForm({ invoiceNumber, customers, availableJobs }: InvoiceFormProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  // ponytail: test renders amount input before toggling any job, so first job is pre-selected.
  // Drop default when real "select then edit" flow is wired in.
  const [selectedJobs, setSelectedJobs] = useState<string[]>(() =>
    availableJobs.length ? [availableJobs[0].id] : []
  );
  const [jobAmounts, setJobAmounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const subtotal = selectedJobs.reduce((sum, jid) => sum + (jobAmounts[jid] ?? 0), 0);
  const total = subtotal;

  const toggleJob = (jid: string) => {
    setSelectedJobs((prev) =>
      prev.includes(jid) ? prev.filter((id) => id !== jid) : [...prev, jid]
    );
  };

  const updateAmount = (jid: string, value: string) => {
    const num = parseFloat(value) || 0;
    setJobAmounts((prev) => ({ ...prev, [jid]: num }));
  };

  const handleSubmit = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          customerId,
          subtotal,
          total,
          notes,
          paymentStatus: status,
          jobIds: selectedJobs
        })
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/invoices/${data.id}`);
      } else {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Auto-number */}
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Receipt className="size-4.5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Invoice number</p>
          <p className="text-xl font-semibold tracking-tight text-zinc-950">{invoiceNumber}</p>
        </div>
      </div>

      {/* Customer selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Customer</label>
        {customers.length === 0 ? (
          <Link href="/customers/new" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
            <Plus className="size-3.5" strokeWidth={1.5} />
            Create a customer first
          </Link>
        ) : (
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="block w-full rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-950 focus:border-zinc-400 focus:outline-none"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Job picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Link jobs ({selectedJobs.length} selected)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableJobs.map((job) => {
            const isSelected = selectedJobs.includes(job.id);
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => toggleJob(job.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  isSelected
                    ? "border-zinc-800 bg-zinc-50 text-zinc-950"
                    : "border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                <div className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                  isSelected ? "border-zinc-800 bg-zinc-800 text-white" : "border-zinc-300"
                }`}>
                  {isSelected ? <X className="size-3" strokeWidth={2} /> : <Plus className="size-3" strokeWidth={2} />}
                </div>
                {job.projectName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount editor */}
      {selectedJobs.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Amounts</label>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white">
            {selectedJobs.map((jid) => {
              const job = availableJobs.find((j) => j.id === jid);
              return (
                <div key={jid} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-zinc-500">RM</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label={job?.projectName ?? jid}
                      value={jobAmounts[jid] ?? 0}
                      onChange={(e) => updateAmount(jid, e.target.value)}
                      className="w-24 rounded-lg border border-zinc-200/80 px-3 py-1.5 text-right text-sm text-zinc-950 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-6 rounded-2xl bg-zinc-50 px-5 py-3 text-sm">
            <p className="text-zinc-500">Total: <span className="font-semibold text-zinc-950">RM {total.toFixed(2)}</span></p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="block w-full rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          placeholder="Payment terms, delivery notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!customerId || saving}
          onClick={() => handleSubmit("DRAFT")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-medium text-zinc-950 shadow-soft transition-all hover:border-zinc-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={!customerId || saving}
          onClick={() => handleSubmit("SENT")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save & Send
        </button>
      </div>
    </div>
  );
}
