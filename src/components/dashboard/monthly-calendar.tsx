import Link from "next/link";
import { CalendarDays } from "lucide-react";

export type CalendarDayEvent = {
  id: string;
  day: number;
  kind: "approval" | "delivery";
  label: string;
  href: string;
};

export function MonthlyCalendar(props: {
  monthLabel: string;
  today: number;
  events: CalendarDayEvent[];
}) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <section className="tile-base overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Calendar</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{props.monthLabel}</p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            <CalendarDays className="size-4" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Weekday header */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
            <div key={label} className="px-1 py-1.5 text-center">
              {label}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayEvents = props.events.filter((event) => event.day === day);
            const isToday = props.today === day;

            return (
              <div
                key={day}
                className={`min-h-[68px] rounded-xl border p-1.5 transition-colors ${
                  isToday
                    ? "border-zinc-800 bg-zinc-50"
                    : "border-zinc-100 bg-white"
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    isToday ? "text-zinc-950" : "text-zinc-500"
                  }`}
                >
                  {day}
                </p>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={event.href}
                      className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-4 transition-opacity hover:opacity-80 ${
                        event.kind === "approval"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {event.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
