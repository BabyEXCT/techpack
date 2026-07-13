import { Briefcase, Clock, ClipboardCheck, Receipt, CircleDollarSign, Users } from "lucide-react";

type SummaryCardsProps = {
  activeJobs: number;
  waitingApproval: number;
  inProduction: number;
  unpaidInvoices: number;
  outstandingBalance: number;
  totalCustomers: number;
};

const icons = [
  Briefcase,
  Clock,
  ClipboardCheck,
  Receipt,
  CircleDollarSign,
  Users
];

export function SummaryCards(props: SummaryCardsProps) {
  const cards = [
    { label: "Active jobs", value: props.activeJobs },
    { label: "Waiting approval", value: props.waitingApproval },
    { label: "In production", value: props.inProduction },
    { label: "Unpaid invoices", value: props.unpaidInvoices },
    { label: "Outstanding balance", value: `RM ${props.outstandingBalance.toFixed(2)}` },
    { label: "Customers", value: props.totalCustomers }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card, idx) => {
        const Icon = icons[idx];
        return (
          <div
            key={card.label}
            className="group tile-hoverable flex items-start gap-4 p-5"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-200/80">
              <Icon className="size-4.5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="label-sm">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
