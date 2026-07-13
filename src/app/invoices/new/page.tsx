import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { db } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/invoices/auto-number";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [invoiceNumber, customers, availableJobs] = await Promise.all([
    generateInvoiceNumber(),
    db.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    db.job.findMany({
      where: { invoiceId: null, status: { not: "DRAFT" } },
      select: { id: true, projectName: true, status: true },
      orderBy: { projectName: "asc" }
    })
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <Link
            href="/invoices"
            className="inline-flex text-sm font-medium text-zinc-500 underline-offset-4 hover:underline"
          >
            Back to invoices
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">New invoice</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Select a customer, link jobs, set amounts, and save.
          </p>
        </section>

        <InvoiceForm
          invoiceNumber={invoiceNumber}
          customers={customers}
          availableJobs={availableJobs}
        />
      </div>
    </AppShell>
  );
}
