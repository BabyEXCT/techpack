import { StatusBadge } from "./status-badge";
import type { InvoiceStatus } from "@/lib/invoices/status-transitions";

export type InvoicePreviewProps = {
  invoiceNumber: string;
  customerName: string;
  subtotal: number;
  total: number;
  paymentStatus: InvoiceStatus;
  notes?: string | null;
  jobs?: string[];
};

export function InvoicePreview({
  invoiceNumber,
  customerName,
  subtotal,
  total,
  paymentStatus,
  notes,
  jobs = []
}: InvoicePreviewProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Invoice {invoiceNumber}</h1>
          <p className="mt-1 text-sm text-zinc-500">{customerName}</p>
        </div>
        <StatusBadge status={paymentStatus} />
      </div>

      {jobs.length > 0 && (
        <section className="mt-6 space-y-2">
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Linked jobs</h2>
          <ul className="space-y-1.5 text-sm text-zinc-700">
            {jobs.map((job) => (
              <li key={job} className="rounded-lg bg-zinc-50 px-3 py-2">{job}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-1.5 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
        <p>Subtotal: RM {subtotal.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-950">Total: RM {total.toFixed(2)}</p>
        {notes && <p className="mt-2">Notes: {notes}</p>}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all hover:bg-zinc-800 active:scale-[0.98] print:hidden"
      >
        Print
      </button>
    </div>
  );
}
