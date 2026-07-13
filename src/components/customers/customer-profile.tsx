type CustomerProfileRecord = {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  preferredPaymentMethod?: string | null;
  deliveryNote?: string | null;
  notes?: string | null;
};

type CustomerProfileProps = {
  customer: CustomerProfileRecord;
  jobCount: number;
  invoiceCount: number;
  outstandingBalance: number;
};

function getValue(value?: string | null) {
  return value && value.trim().length > 0 ? value : "Not provided";
}

export function CustomerProfile({
  customer,
  jobCount,
  invoiceCount,
  outstandingBalance
}: CustomerProfileProps) {
  const detailRows = [
    { label: "Company", value: getValue(customer.companyName) },
    { label: "Phone", value: getValue(customer.phone) },
    { label: "Email", value: getValue(customer.email) },
    { label: "Address", value: getValue(customer.address) },
    { label: "Preferred payment", value: getValue(customer.preferredPaymentMethod) },
    { label: "Delivery note", value: getValue(customer.deliveryNote) },
    { label: "Notes", value: getValue(customer.notes) }
  ];

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-neutral-950">{customer.name}</h2>
        <p className="text-sm text-neutral-500">{getValue(customer.companyName)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-neutral-100 p-3">
          <p className="text-sm text-neutral-500">Jobs</p>
          <p className="mt-1 text-base font-semibold text-neutral-950">{jobCount} linked jobs</p>
        </div>
        <div className="rounded-xl bg-neutral-100 p-3">
          <p className="text-sm text-neutral-500">Invoices</p>
          <p className="mt-1 text-base font-semibold text-neutral-950">{invoiceCount} invoices</p>
        </div>
        <div className="rounded-xl bg-neutral-100 p-3">
          <p className="text-sm text-neutral-500">Outstanding</p>
          <p className="mt-1 text-base font-semibold text-neutral-950">RM {outstandingBalance.toFixed(2)}</p>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {detailRows.map((detail) => (
          <div key={detail.label} className="rounded-xl border border-neutral-200 p-3">
            <dt className="text-sm text-neutral-500">{detail.label}</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export type { CustomerProfileRecord };
