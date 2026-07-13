import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export type CustomerCard = {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  outstandingBalance: number;
  jobCount: number;
  invoiceCount: number;
};

export function CustomerList({ customers }: { customers: CustomerCard[] }) {
  if (!customers.length) {
    return (
      <EmptyState
        title="No customers yet"
        description="Create a customer to track repeat orders, jobs, and invoices."
      />
    );
  }

  return (
    <div className="space-y-3">
      {customers.map((customer) => (
        <article key={customer.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <Link
                href={`/customers/${customer.id}`}
                className="text-base font-semibold text-neutral-950 underline-offset-4 hover:underline"
              >
                {customer.name}
              </Link>
              <p className="text-sm text-neutral-500">{customer.companyName || customer.phone || "No contact yet"}</p>
            </div>
            <div className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              RM {customer.outstandingBalance.toFixed(2)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-700">
            <span className="rounded-full bg-neutral-100 px-2 py-1">{customer.jobCount} jobs</span>
            <span className="rounded-full bg-neutral-100 px-2 py-1">{customer.invoiceCount} invoices</span>
          </div>
        </article>
      ))}
    </div>
  );
}
