import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  Receipt,
  FileText,
  Plus,
  ChevronRight
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/templates", label: "Templates", icon: FileText }
] as const;

export function SidebarNav() {
  return (
    <aside className="hidden min-h-dvh w-[260px] shrink-0 border-r border-zinc-200/70 bg-white lg:block">
      <div className="sticky top-0 flex min-h-dvh flex-col px-4 py-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 pb-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold tracking-tight text-white">
            T
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-zinc-950">
              Tech Pack
            </p>
            <p className="text-xs text-zinc-500">Operations</p>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Sidebar" className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
              <ChevronRight className="ml-auto size-3.5 text-zinc-300 opacity-0 transition-all group-hover:opacity-100" strokeWidth={1.5} />
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <Link
          href="/jobs/new"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-zinc-800 active:scale-[0.98]"
        >
          <Plus className="size-4" strokeWidth={2} />
          New job
        </Link>
        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-200 hover:border-zinc-300 hover:text-zinc-950 active:scale-[0.98]"
        >
          <Receipt className="size-4" strokeWidth={1.5} />
          New invoice
        </Link>
      </div>
    </aside>
  );
}
