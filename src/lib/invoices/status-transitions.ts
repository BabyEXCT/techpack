export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

export const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PARTIALLY_PAID: ["PAID", "OVERDUE"],
  PAID: [],
  OVERDUE: ["PAID", "PARTIALLY_PAID"]
};

export function isValidTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as InvoiceStatus];
  return allowed?.includes(to as InvoiceStatus) ?? false;
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue"
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200"
};
