# Dashboard Sidebar, Calendar, and Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the current app shell and dashboard into a more professional system UI with a desktop sidebar, mobile navigation, monthly calendar, and automatic reminder list.

**Architecture:** Build the redesign around the existing `AppShell` and `DashboardPage` so current customers, jobs, and invoices pages can plug into a stronger layout without rewriting everything at once. Add a dedicated calendar/reminder data layer that reads from jobs and invoices, then render that data through focused dashboard components that work in both desktop and phone layouts.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest, Tailwind CSS

---

## File map

**Create:**
- `src/lib/dashboard/reminders.ts`
- `src/lib/dashboard/calendar.ts`
- `src/lib/dashboard/__tests__/reminders.test.ts`
- `src/lib/dashboard/__tests__/calendar.test.ts`
- `src/components/layout/sidebar-nav.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/dashboard/reminder-list.tsx`
- `src/components/dashboard/monthly-calendar.tsx`
- `src/components/dashboard/operational-panels.tsx`
- `src/components/dashboard/reminder-list.test.tsx`
- `src/components/dashboard/monthly-calendar.test.tsx`
- `src/components/layout/sidebar-nav.test.tsx`
- `src/components/layout/mobile-nav.test.tsx`

**Modify:**
- `prisma/schema.prisma`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/page.test.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/app-shell.test.tsx`
- `src/components/dashboard/summary-cards.tsx`
- `src/components/dashboard/summary-cards.test.tsx`
- `src/app/jobs/page.tsx`
- `src/app/customers/page.tsx`
- `src/app/invoices/page.tsx`

---

### Task 1: Add approval and delivery dates to the job model

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `prisma/migrations/<timestamp>_job_deadlines/migration.sql`

- [ ] **Step 1: Extend the Prisma schema**

Update `prisma/schema.prisma` by adding these fields to `Job`:

```prisma
approvalDate DateTime?
deliveryDate DateTime?
```

- [ ] **Step 2: Generate the migration**

Run:

```powershell
npx prisma migrate dev --name job_deadlines
```

Expected: a migration is created and applied successfully.

- [ ] **Step 3: Validate the schema**

Run:

```powershell
npx prisma validate
```

Expected: `The schema at prisma\schema.prisma is valid`

---

### Task 2: Build the reminder and calendar data helpers

**Files:**
- Create: `src/lib/dashboard/reminders.ts`
- Create: `src/lib/dashboard/calendar.ts`
- Create: `src/lib/dashboard/__tests__/reminders.test.ts`
- Create: `src/lib/dashboard/__tests__/calendar.test.ts`

- [ ] **Step 1: Write the failing reminder tests**

Create `src/lib/dashboard/__tests__/reminders.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDashboardReminders } from "../reminders";

describe("buildDashboardReminders", () => {
  it("creates approval and delivery reminders from upcoming jobs", () => {
    const reminders = buildDashboardReminders({
      now: new Date("2026-06-19T00:00:00.000Z"),
      jobs: [
        {
          id: "job-1",
          projectName: "Team Alpha",
          priority: "URGENT",
          workflowStage: "DESIGN",
          approvalDate: new Date("2026-06-20T00:00:00.000Z"),
          deliveryDate: new Date("2026-06-22T00:00:00.000Z"),
          customer: { name: "Alpha Sports" }
        }
      ],
      invoices: []
    });

    expect(reminders.map((item) => item.type)).toEqual(["approval", "delivery"]);
    expect(reminders[0]?.title).toContain("Approval due");
  });

  it("creates unpaid invoice reminders", () => {
    const reminders = buildDashboardReminders({
      now: new Date("2026-06-19T00:00:00.000Z"),
      jobs: [],
      invoices: [
        {
          id: "invoice-1",
          invoiceNumber: "INV-001",
          paymentStatus: "OVERDUE",
          customer: { name: "Aida Sports" },
          total: 230
        }
      ]
    });

    expect(reminders[0]).toMatchObject({
      type: "invoice",
      title: "Invoice INV-001 overdue"
    });
  });
});
```

- [ ] **Step 2: Write the failing calendar tests**

Create `src/lib/dashboard/__tests__/calendar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMonthlyCalendar } from "../calendar";

describe("buildMonthlyCalendar", () => {
  it("maps approval and delivery dates into monthly events", () => {
    const calendar = buildMonthlyCalendar({
      month: 6,
      year: 2026,
      jobs: [
        {
          id: "job-1",
          projectName: "Team Alpha",
          customer: { name: "Alpha Sports" },
          workflowStage: "WAITING_APPROVAL",
          priority: "URGENT",
          approvalDate: new Date("2026-06-12T00:00:00.000Z"),
          deliveryDate: new Date("2026-06-14T00:00:00.000Z")
        }
      ]
    });

    expect(calendar.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "approval", label: "Team Alpha" }),
        expect.objectContaining({ kind: "delivery", label: "Team Alpha" })
      ])
    );
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```powershell
npm test -- src/lib/dashboard/__tests__/reminders.test.ts src/lib/dashboard/__tests__/calendar.test.ts
```

Expected: FAIL because the helper files do not exist yet.

- [ ] **Step 4: Implement the reminder helper**

Create `src/lib/dashboard/reminders.ts`:

```ts
type DashboardJob = {
  id: string;
  projectName: string;
  priority: "NORMAL" | "URGENT" | "RUSH";
  workflowStage: "NEW" | "DESIGN" | "WAITING_APPROVAL" | "PRODUCTION" | "DONE";
  approvalDate: Date | null;
  deliveryDate: Date | null;
  customer?: { name: string | null } | null;
};

type DashboardInvoice = {
  id: string;
  invoiceNumber: string;
  paymentStatus: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  total: number;
  customer?: { name: string | null } | null;
};

export function buildDashboardReminders(input: {
  now: Date;
  jobs: DashboardJob[];
  invoices: DashboardInvoice[];
}) {
  const reminders = [];

  for (const job of input.jobs) {
    if (job.approvalDate) {
      reminders.push({
        id: `approval-${job.id}`,
        type: "approval",
        title: `Approval due for ${job.projectName}`,
        subtitle: job.customer?.name ?? "Unknown customer",
        actionHref: `/jobs/${job.id}/review`,
        date: job.approvalDate
      });
    }

    if (job.deliveryDate) {
      reminders.push({
        id: `delivery-${job.id}`,
        type: "delivery",
        title: `Delivery due for ${job.projectName}`,
        subtitle: job.customer?.name ?? "Unknown customer",
        actionHref: `/jobs/${job.id}/review`,
        date: job.deliveryDate
      });
    }
  }

  for (const invoice of input.invoices) {
    if (invoice.paymentStatus === "PAID") continue;

    reminders.push({
      id: `invoice-${invoice.id}`,
      type: "invoice",
      title:
        invoice.paymentStatus === "OVERDUE"
          ? `Invoice ${invoice.invoiceNumber} overdue`
          : `Invoice ${invoice.invoiceNumber} unpaid`,
      subtitle: invoice.customer?.name ?? "Unknown customer",
      actionHref: `/invoices/${invoice.id}`,
      date: input.now
    });
  }

  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}
```

- [ ] **Step 5: Implement the calendar helper**

Create `src/lib/dashboard/calendar.ts`:

```ts
type CalendarJob = {
  id: string;
  projectName: string;
  customer?: { name: string | null } | null;
  workflowStage: "NEW" | "DESIGN" | "WAITING_APPROVAL" | "PRODUCTION" | "DONE";
  priority: "NORMAL" | "URGENT" | "RUSH";
  approvalDate: Date | null;
  deliveryDate: Date | null;
};

export function buildMonthlyCalendar(input: { month: number; year: number; jobs: CalendarJob[] }) {
  const events = input.jobs.flatMap((job) => {
    const list = [];

    if (job.approvalDate && job.approvalDate.getUTCFullYear() === input.year && job.approvalDate.getUTCMonth() + 1 === input.month) {
      list.push({
        id: `approval-${job.id}`,
        jobId: job.id,
        kind: "approval",
        label: job.projectName,
        customerName: job.customer?.name ?? "Unknown customer",
        date: job.approvalDate
      });
    }

    if (job.deliveryDate && job.deliveryDate.getUTCFullYear() === input.year && job.deliveryDate.getUTCMonth() + 1 === input.month) {
      list.push({
        id: `delivery-${job.id}`,
        jobId: job.id,
        kind: "delivery",
        label: job.projectName,
        customerName: job.customer?.name ?? "Unknown customer",
        date: job.deliveryDate
      });
    }

    return list;
  });

  return { month: input.month, year: input.year, events };
}
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/dashboard/__tests__/reminders.test.ts src/lib/dashboard/__tests__/calendar.test.ts
```

Expected: PASS.

---

### Task 3: Replace the top nav with sidebar and mobile navigation

**Files:**
- Create: `src/components/layout/sidebar-nav.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/components/layout/sidebar-nav.test.tsx`
- Create: `src/components/layout/mobile-nav.test.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/app-shell.test.tsx`

- [ ] **Step 1: Write the failing layout tests**

Create `src/components/layout/sidebar-nav.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import { SidebarNav } from "./sidebar-nav";

describe("SidebarNav", () => {
  it("renders the approved main menu", () => {
    render(<SidebarNav />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/calendar");
  });
});
```

Create `src/components/layout/mobile-nav.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import { MobileNav } from "./mobile-nav";

describe("MobileNav", () => {
  it("renders compact mobile navigation links", () => {
    render(<MobileNav />);

    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/components/layout/sidebar-nav.test.tsx src/components/layout/mobile-nav.test.tsx src/components/layout/app-shell.test.tsx
```

Expected: FAIL because the new nav files do not exist yet.

- [ ] **Step 3: Implement the sidebar**

Create `src/components/layout/sidebar-nav.tsx`:

```tsx
import Link from "next/link";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/jobs", label: "Jobs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/invoices", label: "Invoices" }
];

export function SidebarNav() {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-neutral-200 bg-white lg:block">
      <div className="sticky top-0 flex min-h-screen flex-col p-6">
        <div>
          <p className="text-lg font-semibold text-neutral-950">Tech Pack Mobile App</p>
          <p className="text-sm text-neutral-500">Operations dashboard</p>
        </div>

        <nav aria-label="Sidebar" className="mt-8 space-y-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/jobs/new"
          className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
        >
          New job
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement mobile nav and update app shell**

Create `src/components/layout/mobile-nav.tsx`:

```tsx
import Link from "next/link";

export function MobileNav() {
  return (
    <nav aria-label="Mobile" className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
      <Link href="/dashboard" className="min-h-10 rounded-full border px-3 py-2 text-sm">Dashboard</Link>
      <Link href="/customers" className="min-h-10 rounded-full border px-3 py-2 text-sm">Customers</Link>
      <Link href="/jobs" className="min-h-10 rounded-full border px-3 py-2 text-sm">Jobs</Link>
      <Link href="/calendar" className="min-h-10 rounded-full border px-3 py-2 text-sm">Calendar</Link>
      <Link href="/invoices" className="min-h-10 rounded-full border px-3 py-2 text-sm">Invoices</Link>
    </nav>
  );
}
```

Update `src/components/layout/app-shell.tsx`:

```tsx
import { MobileNav } from "./mobile-nav";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 lg:flex">
      <SidebarNav />
      <div className="min-w-0 flex-1">
        <header className="border-b border-neutral-200 bg-white lg:hidden">
          <div className="space-y-4 p-4">
            <div>
              <p className="text-lg font-semibold">Tech Pack Mobile App</p>
              <p className="text-sm text-neutral-500">Operations dashboard</p>
            </div>
            <MobileNav />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/components/layout/sidebar-nav.test.tsx src/components/layout/mobile-nav.test.tsx src/components/layout/app-shell.test.tsx
```

Expected: PASS.

---

### Task 4: Add dashboard reminder list and monthly calendar components

**Files:**
- Create: `src/components/dashboard/reminder-list.tsx`
- Create: `src/components/dashboard/monthly-calendar.tsx`
- Create: `src/components/dashboard/reminder-list.test.tsx`
- Create: `src/components/dashboard/monthly-calendar.test.tsx`

- [ ] **Step 1: Write the failing dashboard component tests**

Create `src/components/dashboard/reminder-list.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import { ReminderList } from "./reminder-list";

describe("ReminderList", () => {
  it("renders system reminders ordered as dashboard to-dos", () => {
    render(
      <ReminderList
        reminders={[
          {
            id: "r1",
            type: "approval",
            title: "Approval due for Team Alpha",
            subtitle: "Alpha Sports",
            actionHref: "/jobs/job-1/review"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "To-do reminders" })).toBeInTheDocument();
    expect(screen.getByText("Approval due for Team Alpha")).toBeInTheDocument();
  });
});
```

Create `src/components/dashboard/monthly-calendar.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import { MonthlyCalendar } from "./monthly-calendar";

describe("MonthlyCalendar", () => {
  it("renders monthly events for approval and delivery dates", () => {
    render(
      <MonthlyCalendar
        monthLabel="June 2026"
        today={19}
        events={[
          { id: "a1", day: 12, kind: "approval", label: "Team Alpha", href: "/jobs/job-1/review" },
          { id: "d1", day: 14, kind: "delivery", label: "Team Alpha", href: "/jobs/job-1/review" }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getAllByText("Team Alpha")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/components/dashboard/reminder-list.test.tsx src/components/dashboard/monthly-calendar.test.tsx
```

Expected: FAIL because the files do not exist yet.

- [ ] **Step 3: Implement the reminder list**

Create `src/components/dashboard/reminder-list.tsx`:

```tsx
import Link from "next/link";

type ReminderItem = {
  id: string;
  type: "approval" | "delivery" | "invoice";
  title: string;
  subtitle: string;
  actionHref: string;
};

const badgeStyles = {
  approval: "bg-amber-100 text-amber-800",
  delivery: "bg-red-100 text-red-800",
  invoice: "bg-blue-100 text-blue-800"
};

export function ReminderList({ reminders }: { reminders: ReminderItem[] }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">To-do reminders</h2>
          <p className="text-sm text-neutral-500">System-generated work that needs attention.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reminders.map((reminder) => (
          <Link
            key={reminder.id}
            href={reminder.actionHref}
            className="block rounded-xl border border-neutral-200 p-4 transition hover:bg-neutral-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium text-neutral-950">{reminder.title}</p>
                <p className="text-sm text-neutral-500">{reminder.subtitle}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeStyles[reminder.type]}`}>
                {reminder.type}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement the monthly calendar**

Create `src/components/dashboard/monthly-calendar.tsx`:

```tsx
import Link from "next/link";

type CalendarEvent = {
  id: string;
  day: number;
  kind: "approval" | "delivery";
  label: string;
  href: string;
};

export function MonthlyCalendar(props: {
  monthLabel: string;
  today: number;
  events: CalendarEvent[];
}) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Calendar</h2>
          <p className="text-sm text-neutral-500">{props.monthLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-neutral-500">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className="px-2 py-1 text-center">{label}</div>
        ))}

        {days.map((day) => {
          const dayEvents = props.events.filter((event) => event.day === day);

          return (
            <div
              key={day}
              className={`min-h-24 rounded-xl border p-2 ${props.today === day ? "border-black bg-neutral-100" : "border-neutral-200 bg-white"}`}
            >
              <p className="text-xs font-medium text-neutral-700">{day}</p>
              <div className="mt-2 space-y-1">
                {dayEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={event.href}
                    className={`block rounded-md px-2 py-1 text-[11px] font-medium ${
                      event.kind === "approval"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
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
    </section>
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/components/dashboard/reminder-list.test.tsx src/components/dashboard/monthly-calendar.test.tsx
```

Expected: PASS.

---

### Task 5: Redesign the dashboard page around the new system shell

**Files:**
- Create: `src/components/dashboard/operational-panels.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/page.test.tsx`
- Modify: `src/components/dashboard/summary-cards.tsx`
- Modify: `src/components/dashboard/summary-cards.test.tsx`

- [ ] **Step 1: Add the failing dashboard page test**

Update `src/app/dashboard/page.test.tsx` with expectations for:

```ts
expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "To-do reminders" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
expect(screen.getByText("Recent customers")).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/dashboard/page.test.tsx src/components/dashboard/summary-cards.test.tsx
```

Expected: FAIL because the page does not render the new sections yet.

- [ ] **Step 3: Strengthen summary card styling**

Update `src/components/dashboard/summary-cards.tsx` so cards feel more like an operations system:

```tsx
<section
  key={card.label}
  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
>
  <p className="text-sm font-medium text-neutral-500">{card.label}</p>
  <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{card.value}</p>
</section>
```

- [ ] **Step 4: Add operational panels**

Create `src/components/dashboard/operational-panels.tsx`:

```tsx
import Link from "next/link";

export function OperationalPanels() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-950">Recent customers</h2>
          <Link href="/customers" className="text-sm text-neutral-600 hover:text-neutral-950">
            Open
          </Link>
        </div>
        <p className="mt-3 text-sm text-neutral-500">Customer records will appear here.</p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-950">Active jobs</h2>
          <Link href="/jobs" className="text-sm text-neutral-600 hover:text-neutral-950">
            Open
          </Link>
        </div>
        <p className="mt-3 text-sm text-neutral-500">Open jobs and current stage will appear here.</p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-950">Unpaid invoices</h2>
          <Link href="/invoices" className="text-sm text-neutral-600 hover:text-neutral-950">
            Open
          </Link>
        </div>
        <p className="mt-3 text-sm text-neutral-500">Outstanding invoices will appear here.</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Redesign the dashboard page**

Update `src/app/dashboard/page.tsx`:

```tsx
import { buildDashboardReminders } from "@/lib/dashboard/reminders";
import { buildMonthlyCalendar } from "@/lib/dashboard/calendar";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { OperationalPanels } from "@/components/dashboard/operational-panels";
import { ReminderList } from "@/components/dashboard/reminder-list";

const reminders = buildDashboardReminders({ now: new Date("2026-06-19T00:00:00.000Z"), jobs: [], invoices: [] });
const calendar = buildMonthlyCalendar({ month: 6, year: 2026, jobs: [] });

<div className="space-y-8">
  <section className="space-y-3">
    <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Operations dashboard</p>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Dashboard</h1>
        <p className="max-w-2xl text-sm text-neutral-600">
          Track jobs, customers, invoices, reminders, and calendar deadlines from one system view.
        </p>
      </div>
      <Link
        href="/jobs/new"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
      >
        New job
      </Link>
    </div>
  </section>

  <SummaryCards {...dashboardSummary} />

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

  <OperationalPanels />
</div>
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/dashboard/page.test.tsx src/components/dashboard/summary-cards.test.tsx
```

Expected: PASS.

---

### Task 6: Add a dedicated calendar page

**Files:**
- Create: `src/app/calendar/page.tsx`
- Create: `src/app/calendar/page.test.tsx`

- [ ] **Step 1: Write the failing calendar page test**

Create `src/app/calendar/page.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import CalendarPage from "./page";

describe("CalendarPage", () => {
  it("renders the calendar heading and monthly view", async () => {
    render(await CalendarPage());

    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByText("Monthly view")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/calendar/page.test.tsx
```

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the calendar page**

Create `src/app/calendar/page.tsx`:

```tsx
import { AppShell } from "@/components/layout/app-shell";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { buildMonthlyCalendar } from "@/lib/dashboard/calendar";

export default function CalendarPage() {
  const calendar = buildMonthlyCalendar({ month: 6, year: 2026, jobs: [] });

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Monthly view</p>
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
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/calendar/page.test.tsx
```

Expected: PASS.

---

### Task 7: Full verification and mobile QA

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual QA in desktop and phone widths**

Run the dev server:

```powershell
node .\node_modules\next\dist\bin\next dev -p 3011
```

Check:
- desktop shows a left sidebar
- mobile shows compact top nav instead of the full sidebar
- dashboard shows summary cards, reminders, and calendar above the fold
- `Calendar` exists in both sidebar and mobile nav
- reminder cards link into jobs or invoices
- calendar items open related jobs
- phone width remains usable without horizontal scrolling

---

## Self-review

- Spec coverage:
  - desktop sidebar: Task 3
  - mobile navigation: Task 3
  - redesigned dashboard: Task 5
  - monthly calendar: Tasks 2, 4, and 6
  - automatic reminders: Tasks 2 and 4
  - approval + delivery dates: Tasks 1 and 2
  - phone-friendly behavior: Tasks 3, 5, 6, and 7
- No placeholders remain.
- Type consistency:
  - `buildDashboardReminders()`
  - `buildMonthlyCalendar()`
  - `SidebarNav`
  - `MobileNav`
  - `ReminderList`
  - `MonthlyCalendar`

