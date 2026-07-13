import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CustomerList, type CustomerCard } from "@/components/customers/customer-list";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getOutstandingBalance(
  invoices: Array<{
    total: number | string | { toString(): string };
    paymentStatus: string;
  }>
) {
  return invoices.reduce((sum, invoice) => {
    if (invoice.paymentStatus === "PAID") {
      return sum;
    }

    return sum + Number(invoice.total);
  }, 0);
}

async function getCustomerMetrics() {
  const [total, jobCount, invoiceAgg] = await Promise.all([
    db.customer.count(),
    db.job.count({ where: { deletedAt: null } }),
    db.invoice.findMany({
      select: { total: true, paymentStatus: true }
    })
  ]);

  const outstanding = invoiceAgg
    .filter((inv) => inv.paymentStatus !== "PAID")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const paid = invoiceAgg
    .filter((inv) => inv.paymentStatus === "PAID")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const customersWithUnpaid = new Set(
    (
      await db.invoice.findMany({
        where: { paymentStatus: { not: "PAID" } },
        select: { customerId: true }
      })
    ).map((inv) => inv.customerId)
  ).size;

  return { total, jobCount, invoiceTotal: invoiceAgg.length, outstanding, paid, customersWithUnpaid };
}

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: { updatedAt: "desc" },
    include: { jobs: true, invoices: true }
  });

  const customerCards: CustomerCard[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    companyName: customer.companyName,
    phone: customer.phone,
    outstandingBalance: getOutstandingBalance(customer.invoices),
    jobCount: customer.jobs.length,
    invoiceCount: customer.invoices.length
  }));

  const metrics = await getCustomerMetrics();

  const metricCards = [
    { label: "Total customers", value: String(metrics.total), tone: "text-zinc-950" },
    { label: "Outstanding balance", value: `RM ${metrics.outstanding.toFixed(2)}`, tone: "text-rose-600" },
    { label: "Customers w/ unpaid", value: String(metrics.customersWithUnpaid), tone: "text-amber-600" },
    { label: "Total jobs", value: String(metrics.jobCount), tone: "text-zinc-950" },
    { label: "Total paid", value: `RM ${metrics.paid.toFixed(2)}`, tone: "text-emerald-600" },
    { label: "All invoices", value: String(metrics.invoiceTotal), tone: "text-zinc-950" }
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Customer database
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  <Users className="size-4" strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
                  Customers
                </h1>
              </div>
              <p className="max-w-2xl text-sm text-neutral-600">
                Search repeat customers, review outstanding balances, and open their linked work.
              </p>
            </div>
            <Link
              href="/customers/new"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-soft transition-all hover:bg-zinc-800 active:scale-[0.97]"
            >
              <Plus className="size-4" strokeWidth={2} />
              New customer
            </Link>
          </div>
        </section>

        {/* Metrics dashboard */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metricCards.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-soft"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {metric.label}
              </p>
              <p className={`mt-1 text-xl font-semibold tracking-tight ${metric.tone}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <input
          className="w-full rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-sm shadow-soft focus:border-zinc-300 focus:outline-none"
          placeholder="Search customers"
          type="search"
        />

        <CustomerList customers={customerCards} />
      </div>
    </AppShell>
  );
}
