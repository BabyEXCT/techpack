import Link from "next/link";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import type { DashboardReminder } from "@/lib/dashboard/reminders";

const badgeStyles: Record<DashboardReminder["type"], string> = {
  approval: "bg-amber-50 text-amber-700 border border-amber-200/60",
  delivery: "bg-red-50 text-red-700 border border-red-200/60",
  invoice: "bg-blue-50 text-blue-700 border border-blue-200/60"
};

const typeLabel: Record<DashboardReminder["type"], string> = {
  approval: "Approval",
  delivery: "Delivery",
  invoice: "Invoice"
};

export function ReminderList({ reminders }: { reminders: DashboardReminder[] }) {
  return (
    <section className="tile-base overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">To-do reminders</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              System-generated work that needs attention.
            </p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle className="size-4" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 px-5 py-3">
        {reminders.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400">No pending reminders — everything is up to date.</p>
        )}
        {reminders.map((reminder) => (
          <Link
            key={reminder.id}
            href={reminder.actionHref}
            className="group flex items-start justify-between gap-3 py-3 transition-all duration-200 hover:translate-x-0.5"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-zinc-950">{reminder.title}</p>
              <p className="text-sm text-zinc-500">{reminder.subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 ${badgeStyles[reminder.type]}`}
              >
                {typeLabel[reminder.type]}
              </span>
              <ArrowUpRight className="size-3.5 text-zinc-300 opacity-0 transition-all group-hover:opacity-100" strokeWidth={1.5} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
