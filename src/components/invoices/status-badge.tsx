import { STATUS_COLORS, STATUS_LABELS, type InvoiceStatus } from "@/lib/invoices/status-transitions";

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
