import Link from "next/link";
import { Receipt, ArrowUpRight, Trash2 } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { InvoiceStatus } from "@/lib/invoices/status-transitions";

export type InvoiceCard = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  paymentStatus: InvoiceStatus;
  jobCount: number;
};

export function InvoiceList({
  invoices,
  onDelete
}: {
  invoices: InvoiceCard[];
  onDelete?: (id: string) => void;
}) {
  if (!invoices.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/60 bg-white px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
          <Receipt className="size-5" strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-zinc-950">No invoices yet</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Create an invoice to track totals, payment status, and printable previews.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="group relative rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft transition-all duration-200 hover:shadow-tile"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/invoices/${invoice.id}`}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                <Receipt className="size-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 truncate">{invoice.invoiceNumber}</p>
                <p className="text-xs text-zinc-500 truncate">{invoice.customerName}</p>
              </div>
            </Link>
            <StatusBadge status={invoice.paymentStatus} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-zinc-500">{invoice.jobCount} job{invoice.jobCount === 1 ? "" : "s"}</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-950">RM {invoice.total.toFixed(2)}</p>
            </div>
            <Link
              href={`/invoices/${invoice.id}`}
              className="flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            >
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </Link>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(invoice.id)}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              aria-label={`Delete ${invoice.invoiceNumber}`}
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
