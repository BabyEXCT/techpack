import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  Receipt
} from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/invoices", label: "Invoices", icon: Receipt }
] as const;

export function MobileNav() {
  return (
    <nav aria-label="Mobile" className="flex gap-2 overflow-x-auto pb-1 lg:hidden [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex shrink-0 items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-soft transition-all duration-200 hover:border-zinc-300 hover:text-zinc-950 active:scale-[0.97]"
        >
          <item.icon className="size-3.5" strokeWidth={1.5} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
