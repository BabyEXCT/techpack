import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { AppShell } from "@/components/layout/app-shell";
import { buildMonthlyCalendar } from "@/lib/dashboard/calendar";

export default function CalendarPage() {
  const calendar = buildMonthlyCalendar({
    month: 6,
    year: 2026,
    jobs: []
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Monthly view
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Calendar</h1>
          <p className="text-sm text-neutral-600">
            Track approval and delivery deadlines across the month.
          </p>
        </section>

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
    </AppShell>
  );
}
