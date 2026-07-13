import Link from "next/link";
import { Plus, LayoutDashboard } from "lucide-react";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { OperationalPanels } from "@/components/dashboard/operational-panels";
import { ReminderList } from "@/components/dashboard/reminder-list";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AppShell } from "@/components/layout/app-shell";
import { buildMonthlyCalendar } from "@/lib/dashboard/calendar";
import { buildDashboardReminders } from "@/lib/dashboard/reminders";

const dashboardSummary = {
  activeJobs: 0,
  waitingApproval: 0,
  inProduction: 0,
  unpaidInvoices: 0,
  outstandingBalance: 0,
  totalCustomers: 0
};

export default function DashboardPage() {
  const reminders = buildDashboardReminders({
    now: new Date("2026-06-19T00:00:00.000Z"),
    jobs: [],
    invoices: []
  });
  const calendar = buildMonthlyCalendar({
    month: 6,
    year: 2026,
    jobs: []
  });

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <LayoutDashboard className="size-4" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Dashboard
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-zinc-500">
              Track jobs, customers, invoices, reminders, and calendar deadlines from one system view.
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all duration-200 hover:bg-zinc-800 active:scale-[0.97]"
          >
            <Plus className="size-4" strokeWidth={2} />
            New job
          </Link>
        </div>

        {/* Metric tiles */}
        <SummaryCards {...dashboardSummary} />

        {/* Two-column: reminders + calendar */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ReminderList reminders={reminders} />
          <MonthlyCalendar
            monthLabel="June 2026"
            today={19}
            events={calendar.events.map((event) => ({
              id: event.id,
              day: event.date.getUTCDate(),
              kind: event.kind,
              label: event.label,
              href: `/jobs/${event.jobId}/review`
            }))}
          />
        </div>

        {/* Operational quick links */}
        <OperationalPanels />
      </div>
    </AppShell>
  );
}
