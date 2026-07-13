import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerProfile } from "@/components/customers/customer-profile";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ customerId: string }>;
};

const workflowStageLabels: Record<string, string> = {
  NEW: "New",
  DESIGN: "Design",
  WAITING_APPROVAL: "Waiting approval",
  PRODUCTION: "Production",
  DONE: "Done"
};

const priorityLabels: Record<string, string> = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  RUSH: "Rush"
};

const paymentStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue"
};

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

export default async function CustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params;

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      jobs: {
        orderBy: { updatedAt: "desc" }
      },
      invoices: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!customer) {
    notFound();
    return null;
  }

  const outstandingBalance = getOutstandingBalance(customer.invoices);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <Link href="/customers" className="text-sm font-medium text-neutral-600 underline-offset-4 hover:underline">
            Back to customers
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-950">Customer details</h1>
          <p className="text-sm text-neutral-600">View profile details, linked jobs, and invoice history in one place.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-950">Profile</h2>
          <CustomerProfile
            customer={customer}
            jobCount={customer.jobs.length}
            invoiceCount={customer.invoices.length}
            outstandingBalance={outstandingBalance}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-950">Jobs</h2>
          {customer.jobs.length ? (
            <div className="space-y-3">
              {customer.jobs.map((job) => (
                <article key={job.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <Link
                        href={`/jobs/${job.id}/review`}
                        className="text-base font-semibold text-neutral-950 underline-offset-4 hover:underline"
                      >
                        {job.projectName}
                      </Link>
                      <p className="text-sm text-neutral-500">
                        Updated {new Date(job.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-neutral-100 px-2 py-1">
                        {workflowStageLabels[job.workflowStage] ?? job.workflowStage}
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                        {priorityLabels[job.priority] ?? job.priority}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No jobs linked yet"
              description="Jobs connected to this customer will appear here once they are created."
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-950">Invoices</h2>
          {customer.invoices.length ? (
            <div className="space-y-3">
              {customer.invoices.map((invoice) => (
                <article key={invoice.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-base font-semibold text-neutral-950 underline-offset-4 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-sm text-neutral-500">
                        Created {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-sm font-semibold text-neutral-950">RM {Number(invoice.total).toFixed(2)}</p>
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {paymentStatusLabels[invoice.paymentStatus] ?? invoice.paymentStatus}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No invoices yet"
              description="Invoice history will appear here after the customer is billed."
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}
