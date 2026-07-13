import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { AppShell } from "@/components/layout/app-shell";
import { StatusActions } from "@/components/invoices/status-actions";
import { db } from "@/lib/db";
import type { InvoiceStatus } from "@/lib/invoices/status-transitions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ invoiceId: string }> };

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, jobs: true }
  });

  if (!invoice) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.5} />
          All invoices
        </Link>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-zinc-500">
              Created {invoice.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {invoice.paymentStatus === "DRAFT" && (
              <Link
                href={`/invoices/${invoiceId}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-4 text-sm font-medium text-zinc-700 shadow-soft transition-all hover:border-zinc-300 active:scale-[0.97]"
              >
                <Pencil className="size-3.5" strokeWidth={1.5} />
                Edit
              </Link>
            )}
            <StatusActions invoiceId={invoiceId} currentStatus={invoice.paymentStatus as InvoiceStatus} />
          </div>
        </div>

        <InvoicePreview
          invoiceNumber={invoice.invoiceNumber}
          customerName={invoice.customer.name}
          subtotal={Number(invoice.subtotal)}
          total={Number(invoice.total)}
          paymentStatus={invoice.paymentStatus as InvoiceStatus}
          notes={invoice.notes}
          jobs={invoice.jobs.map((job) => job.projectName)}
        />
      </div>
    </AppShell>
  );
}
