import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-zinc-50 lg:flex">
      <SidebarNav />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl lg:hidden">
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-semibold text-white">
                  T
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold tracking-tight text-zinc-950">
                    Tech Pack
                  </p>
                  <p className="text-[11px] text-zinc-500">Operations</p>
                </div>
              </div>
            </div>
            <MobileNav />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
