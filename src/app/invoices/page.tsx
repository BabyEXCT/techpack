import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
type PrismaInvoiceWhereInput = { paymentStatus?: string };
import { InvoiceList, type InvoiceCard } from "@/components/invoices/invoice-list";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { type InvoiceStatus } from "@/lib/invoices/status-transitions";

const TABS: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIALLY_PAID", label: "Partial" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" }
];

export default async function InvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where: PrismaInvoiceWhereInput = status
    ? { paymentStatus: status as string }
    : {};

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true, jobs: true }
  });

  const invoiceCards: InvoiceCard[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customer.name,
    total: Number(inv.total),
    paymentStatus: inv.paymentStatus as InvoiceStatus,
    jobCount: inv.jobs.length
  }));

  // Aggregate metrics across ALL invoices (not just filtered tab)
  const allInvoices = status
    ? await db.invoice.findMany({ select: { total: true, paymentStatus: true } })
    : invoices;

  const paidTotal = allInvoices
    .filter((inv) => inv.paymentStatus === "PAID")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const partialTotal = allInvoices
    .filter((inv) => inv.paymentStatus === "PARTIALLY_PAID")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const outstandingTotal = allInvoices
    .filter((inv) => inv.paymentStatus !== "PAID" && inv.paymentStatus !== "DRAFT")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const overdueCount = allInvoices.filter((inv) => inv.paymentStatus === "OVERDUE").length;
  const paidCount = allInvoices.filter((inv) => inv.paymentStatus === "PAID").length;

  const metrics = [
    { label: "Total paid", value: `RM ${paidTotal.toFixed(2)}`, tone: "emerald" as const },
    { label: "Partially paid", value: `RM ${partialTotal.toFixed(2)}`, tone: "amber" as const },
    { label: "Outstanding", value: `RM ${outstandingTotal.toFixed(2)}`, tone: "rose" as const },
    { label: "Overdue", value: String(overdueCount), tone: "rose" as const },
    { label: "Paid invoices", value: String(paidCount), tone: "emerald" as const },
    { label: "All invoices", value: String(allInvoices.length), tone: "zinc" as const }
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <Receipt className="size-4" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Invoices
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-zinc-500">
              Track payments, linked jobs, and printable previews.
            </p>
          </div>
          <Link
            href="/invoices/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all duration-200 hover:bg-zinc-800 active:scale-[0.97]"
          >
            <Plus className="size-4" strokeWidth={2} />
            New invoice
          </Link>
        </div>

        {/* Metrics dashboard */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {metric.label}
              </p>
              <p
                className={`mt-1 text-xl font-semibold tracking-tight ${
                  metric.tone === "emerald"
                    ? "text-emerald-600"
                    : metric.tone === "amber"
                      ? "text-amber-600"
                      : metric.tone === "rose"
                        ? "text-rose-600"
                        : "text-zinc-950"
                }`}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const isActive = (tab.key === "" && !status) || tab.key === status;
            const href = tab.key ? `/invoices?status=${tab.key}` : "/invoices";
            return (
              <Link
                key={tab.key}
                href={href}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <InvoiceList invoices={invoiceCards} />
      </div>
    </AppShell>
  );
}
