import Link from "next/link";
import { Users, Briefcase, Receipt, ArrowRight } from "lucide-react";

const panels = [
  {
    title: "Recent customers",
    desc: "Customer records will appear here.",
    href: "/customers",
    icon: Users,
    color: "bg-emerald-50 text-emerald-600"
  },
  {
    title: "Active jobs",
    desc: "Open jobs and current stage will appear here.",
    href: "/jobs",
    icon: Briefcase,
    color: "bg-blue-50 text-blue-600"
  },
  {
    title: "Unpaid invoices",
    desc: "Outstanding invoices will appear here.",
    href: "/invoices",
    icon: Receipt,
    color: "bg-violet-50 text-violet-600"
  }
] as const;

export function OperationalPanels() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {panels.map((panel) => {
        const Icon = panel.icon;
        return (
          <Link
            key={panel.title}
            href={panel.href}
            className="group tile-hoverable p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl ${panel.color}`}>
                  <Icon className="size-4.5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">{panel.title}</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">{panel.desc}</p>
                </div>
              </div>
              <ArrowRight
                className="mt-1.5 size-4 shrink-0 text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-600"
                strokeWidth={1.5}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
