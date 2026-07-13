import { CustomerForm } from "@/components/customers/customer-form";
import { AppShell } from "@/components/layout/app-shell";

export default function NewCustomerPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Customer registration
          </p>
          <h1 className="text-2xl font-semibold text-neutral-950">New customer</h1>
          <p className="max-w-2xl text-sm text-neutral-600">
            Register a customer first, then link jobs and invoices to the same record.
          </p>
        </section>

        <CustomerForm />
      </div>
    </AppShell>
  );
}
