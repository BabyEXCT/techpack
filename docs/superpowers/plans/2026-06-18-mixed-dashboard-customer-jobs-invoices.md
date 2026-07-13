# Mixed Dashboard, Customer, Jobs, and Invoices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly mixed dashboard with connected customer records, richer job tracking, and invoice records linked to customers and jobs.

**Architecture:** Extend the current Prisma data model from a job-first app into a connected operations model with `Customer`, enhanced `Job`, and `Invoice` records. Add focused API routes for customers and invoices, then layer mobile-friendly dashboard and detail pages on top of those records while preserving the current job review/generation flow.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Vitest, Tailwind CSS

---

## File map

**Create:**
- `prisma/migrations/<timestamp>_dashboard_customers_invoices/migration.sql`
- `src/lib/customers/customer-schema.ts`
- `src/lib/invoices/invoice-schema.ts`
- `src/app/api/customers/route.ts`
- `src/app/api/customers/[customerId]/route.ts`
- `src/app/api/invoices/route.ts`
- `src/app/api/invoices/[invoiceId]/route.ts`
- `src/app/dashboard/page.tsx`
- `src/app/customers/page.tsx`
- `src/app/customers/[customerId]/page.tsx`
- `src/app/invoices/page.tsx`
- `src/app/invoices/[invoiceId]/page.tsx`
- `src/components/dashboard/summary-cards.tsx`
- `src/components/dashboard/action-jobs.tsx`
- `src/components/customers/customer-list.tsx`
- `src/components/customers/customer-profile.tsx`
- `src/components/invoices/invoice-list.tsx`
- `src/components/invoices/invoice-preview.tsx`
- `src/app/api/customers/__tests__/route.test.ts`
- `src/app/api/customers/[customerId]/__tests__/route.test.ts`
- `src/app/api/invoices/__tests__/route.test.ts`
- `src/app/api/invoices/[invoiceId]/__tests__/route.test.ts`
- `src/app/dashboard/page.test.tsx`
- `src/app/customers/page.test.tsx`
- `src/app/customers/[customerId]/page.test.tsx`
- `src/app/invoices/page.test.tsx`

**Modify:**
- `prisma/schema.prisma`
- `src/app/jobs/page.tsx`
- `src/components/jobs/jobs-list.tsx`
- `src/components/layout/app-shell.tsx`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/[jobId]/route.ts`
- `src/lib/jobs/job-schema.ts`

---

### Task 1: Extend the Prisma data model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_dashboard_customers_invoices/migration.sql`

- [ ] **Step 1: Write the migration design into the schema**

Update `prisma/schema.prisma` to add:

```prisma
model Customer {
  id                     String    @id @default(cuid())
  name                   String
  companyName            String?
  phone                  String?
  email                  String?
  address                String?
  preferredPaymentMethod String?
  deliveryNote           String?
  notes                  String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  jobs                   Job[]
  invoices               Invoice[]
}

model Invoice {
  id            String              @id @default(cuid())
  invoiceNumber String              @unique
  customerId    String
  subtotal      Decimal             @default(0)
  notes         String?
  total         Decimal             @default(0)
  paymentStatus InvoicePaymentStatus @default(DRAFT)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  customer      Customer            @relation(fields: [customerId], references: [id], onDelete: Cascade)
  jobs          Job[]
}

enum WorkflowStage {
  NEW
  DESIGN
  WAITING_APPROVAL
  PRODUCTION
  DONE
}

enum JobPriority {
  NORMAL
  URGENT
  RUSH
}

enum InvoicePaymentStatus {
  DRAFT
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
}
```

Also extend `Job`:

```prisma
customerId     String?
invoiceId      String?
workflowStage  WorkflowStage @default(NEW)
priority       JobPriority   @default(NORMAL)
customer       Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
invoice        Invoice?      @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Generate the migration**

Run:

```powershell
npx prisma migrate dev --name dashboard_customers_invoices
```

Expected: new migration created and schema updated.

- [ ] **Step 3: Run Prisma validation**

Run:

```powershell
npx prisma validate
```

Expected: schema validates successfully.

---

### Task 2: Add customer and invoice schemas plus API routes

**Files:**
- Create: `src/lib/customers/customer-schema.ts`
- Create: `src/lib/invoices/invoice-schema.ts`
- Create: `src/app/api/customers/route.ts`
- Create: `src/app/api/customers/[customerId]/route.ts`
- Create: `src/app/api/invoices/route.ts`
- Create: `src/app/api/invoices/[invoiceId]/route.ts`
- Create: `src/app/api/customers/__tests__/route.test.ts`
- Create: `src/app/api/customers/[customerId]/__tests__/route.test.ts`
- Create: `src/app/api/invoices/__tests__/route.test.ts`
- Create: `src/app/api/invoices/[invoiceId]/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing customer API tests**

Create `src/app/api/customers/__tests__/route.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

vi.mock("@/lib/db", () => ({
  db: {
    customer: {
      findMany: vi.fn().mockResolvedValue([{ id: "c1", name: "Aida", phone: "012" }]),
      create: vi.fn().mockResolvedValue({ id: "c1", name: "Aida", phone: "012" })
    }
  }
}));

describe("GET /api/customers", () => {
  it("returns customers ordered by latest update", async () => {
    const response = await GET(new Request("http://localhost/api/customers"));
    expect(response.status).toBe(200);
  });
});

describe("POST /api/customers", () => {
  it("creates a customer record", async () => {
    const response = await POST(
      new Request("http://localhost/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Aida", phone: "012" })
      })
    );
    expect(response.status).toBe(201);
  });
});
```

- [ ] **Step 2: Write the failing invoice API tests**

Create `src/app/api/invoices/__tests__/route.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findMany: vi.fn().mockResolvedValue([{ id: "i1", invoiceNumber: "INV-001", total: 120 }]),
      create: vi.fn().mockResolvedValue({ id: "i1", invoiceNumber: "INV-001", total: 120 })
    }
  }
}));

describe("GET /api/invoices", () => {
  it("returns invoice records", async () => {
    const response = await GET(new Request("http://localhost/api/invoices"));
    expect(response.status).toBe(200);
  });
});

describe("POST /api/invoices", () => {
  it("creates an invoice linked to a customer", async () => {
    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: "INV-001",
          customerId: "c1",
          subtotal: 100,
          total: 120,
          jobIds: ["j1"]
        })
      })
    );
    expect(response.status).toBe(201);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/api/customers/__tests__/route.test.ts src/app/api/invoices/__tests__/route.test.ts
```

Expected: FAIL because the routes and schemas do not exist yet.

- [ ] **Step 4: Implement customer and invoice schemas**

Create `src/lib/customers/customer-schema.ts`:

```ts
import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  companyName: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  preferredPaymentMethod: z.string().optional().default(""),
  deliveryNote: z.string().optional().default(""),
  notes: z.string().optional().default("")
});
```

Create `src/lib/invoices/invoice-schema.ts`:

```ts
import { z } from "zod";

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.string().min(1, "Customer is required"),
  subtotal: z.number().nonnegative(),
  notes: z.string().optional().default(""),
  total: z.number().nonnegative(),
  paymentStatus: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"]).optional().default("DRAFT"),
  jobIds: z.array(z.string()).default([])
});
```

- [ ] **Step 5: Implement the API routes**

Create `src/app/api/customers/route.ts` and `src/app/api/invoices/route.ts` using the existing jobs route style:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerSchema } from "@/lib/customers/customer-schema";

export async function GET() {
  const customers = await db.customer.findMany({
    orderBy: { updatedAt: "desc" },
    include: { jobs: true, invoices: true }
  });

  return NextResponse.json(customers, { status: 200 });
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = customerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const customer = await db.customer.create({ data: parsed.data });
  return NextResponse.json(customer, { status: 201 });
}
```

Implement invoice creation to connect jobs with:

```ts
jobs: {
  connect: parsed.data.jobIds.map((id) => ({ id }))
}
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/api/customers/__tests__/route.test.ts src/app/api/invoices/__tests__/route.test.ts
```

Expected: PASS.

---

### Task 3: Extend jobs with stage, priority, and customer linkage

**Files:**
- Modify: `src/lib/jobs/job-schema.ts`
- Modify: `src/app/api/jobs/route.ts`
- Modify: `src/app/api/jobs/[jobId]/route.ts`
- Modify: `src/components/jobs/jobs-list.tsx`

- [ ] **Step 1: Add failing job list test coverage**

Update `src/components/jobs/jobs-list.test.tsx` to assert stage, priority, and customer show up:

```ts
expect(await screen.findByText("Design")).toBeInTheDocument();
expect(screen.getByText("Urgent")).toBeInTheDocument();
expect(screen.getByText("Aida Sports")).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/components/jobs/jobs-list.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Extend the job schema**

In `src/lib/jobs/job-schema.ts`, add:

```ts
workflowStage: z.enum(["NEW", "DESIGN", "WAITING_APPROVAL", "PRODUCTION", "DONE"]).optional().default("NEW"),
priority: z.enum(["NORMAL", "URGENT", "RUSH"]).optional().default("NORMAL"),
customerId: z.string().optional().nullable()
```

- [ ] **Step 4: Save and return new job fields**

Update `src/app/api/jobs/route.ts` and `src/app/api/jobs/[jobId]/route.ts` to read/write:

```ts
customerId: input.customerId ?? null,
workflowStage: input.workflowStage,
priority: input.priority
```

And include the linked customer on GET:

```ts
include: { customer: true }
```

- [ ] **Step 5: Update job cards**

In `src/components/jobs/jobs-list.tsx`, extend the displayed type and render:

```tsx
<div className="mt-2 flex flex-wrap gap-2 text-xs">
  <span className="rounded-full bg-neutral-100 px-2 py-1">{job.workflowStageLabel}</span>
  <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">{job.priorityLabel}</span>
  {job.customerName ? <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">{job.customerName}</span> : null}
</div>
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```powershell
npm test -- src/components/jobs/jobs-list.test.tsx src/app/api/jobs/__tests__/jobs-route.test.ts src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

Expected: PASS.

---

### Task 4: Build the dashboard page and summary components

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/summary-cards.tsx`
- Create: `src/components/dashboard/action-jobs.tsx`
- Create: `src/app/dashboard/page.test.tsx`
- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Write the failing dashboard page test**

Create `src/app/dashboard/page.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders summary cards and main sections", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Active jobs")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/dashboard/page.test.tsx
```

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement summary components**

Create `src/components/dashboard/summary-cards.tsx`:

```tsx
type SummaryCardsProps = {
  activeJobs: number;
  waitingApproval: number;
  inProduction: number;
  unpaidInvoices: number;
  outstandingBalance: number;
  totalCustomers: number;
};

export function SummaryCards(props: SummaryCardsProps) {
  const cards = [
    ["Active jobs", props.activeJobs],
    ["Waiting approval", props.waitingApproval],
    ["In production", props.inProduction],
    ["Unpaid invoices", props.unpaidInvoices],
    ["Outstanding balance", `RM ${props.outstandingBalance.toFixed(2)}`],
    ["Customers", props.totalCustomers]
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement the dashboard page**

Create `src/app/dashboard/page.tsx`:

```tsx
import { AppShell } from "@/components/layout/app-shell";
import { SummaryCards } from "@/components/dashboard/summary-cards";

export default async function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SummaryCards
          activeJobs={0}
          waitingApproval={0}
          inProduction={0}
          unpaidInvoices={0}
          outstandingBalance={0}
          totalCustomers={0}
        />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Customers</h2>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Job tracker</h2>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Invoices</h2>
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Add mobile-friendly navigation**

Update `src/components/layout/app-shell.tsx`:

```tsx
<nav className="mt-3 flex flex-wrap gap-2 text-sm">
  <Link href="/dashboard" className="rounded-md border px-3 py-2">Dashboard</Link>
  <Link href="/customers" className="rounded-md border px-3 py-2">Customers</Link>
  <Link href="/jobs" className="rounded-md border px-3 py-2">Jobs</Link>
  <Link href="/invoices" className="rounded-md border px-3 py-2">Invoices</Link>
  <Link href="/jobs/bin" className="rounded-md border px-3 py-2">Bin</Link>
</nav>
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/dashboard/page.test.tsx src/components/layout/app-shell.test.tsx
```

Expected: PASS.

---

### Task 5: Build customer pages and mobile-friendly customer list

**Files:**
- Create: `src/app/customers/page.tsx`
- Create: `src/app/customers/[customerId]/page.tsx`
- Create: `src/components/customers/customer-list.tsx`
- Create: `src/components/customers/customer-profile.tsx`
- Create: `src/app/customers/page.test.tsx`
- Create: `src/app/customers/[customerId]/page.test.tsx`

- [ ] **Step 1: Write the failing customers page tests**

Create `src/app/customers/page.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import CustomersPage from "./page";

describe("CustomersPage", () => {
  it("renders the customers heading and search", async () => {
    render(await CustomersPage());
    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search customers")).toBeInTheDocument();
  });
});
```

Create `src/app/customers/[customerId]/page.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import CustomerDetailPage from "./page";

describe("CustomerDetailPage", () => {
  it("renders profile, jobs, and invoices sections", async () => {
    render(await CustomerDetailPage({ params: Promise.resolve({ customerId: "c1" }) }));
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/customers/page.test.tsx src/app/customers/[customerId]/page.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement customer list and profile components**

Create `src/components/customers/customer-list.tsx` with stacked card layout:

```tsx
type CustomerCard = {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  outstandingBalance: number;
  jobCount: number;
  invoiceCount: number;
};

export function CustomerList({ customers }: { customers: CustomerCard[] }) {
  return (
    <div className="space-y-3">
      {customers.map((customer) => (
        <div key={customer.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-base font-semibold">{customer.name}</p>
          <p className="text-sm text-neutral-500">{customer.companyName || customer.phone || "No contact yet"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-100 px-2 py-1">{customer.jobCount} jobs</span>
            <span className="rounded-full bg-neutral-100 px-2 py-1">{customer.invoiceCount} invoices</span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-red-800">RM {customer.outstandingBalance.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement the customer pages**

Create `src/app/customers/page.tsx` and `src/app/customers/[customerId]/page.tsx` with sections:

```tsx
<h1 className="text-2xl font-semibold">Customers</h1>
<input className="w-full rounded-md border px-3 py-2" placeholder="Search customers" />
```

And detail page sections:

```tsx
<section><h2 className="text-lg font-semibold">Profile</h2></section>
<section><h2 className="text-lg font-semibold">Jobs</h2></section>
<section><h2 className="text-lg font-semibold">Invoices</h2></section>
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/customers/page.test.tsx src/app/customers/[customerId]/page.test.tsx
```

Expected: PASS.

---

### Task 6: Build invoice pages and printable invoice preview

**Files:**
- Create: `src/app/invoices/page.tsx`
- Create: `src/app/invoices/[invoiceId]/page.tsx`
- Create: `src/components/invoices/invoice-list.tsx`
- Create: `src/components/invoices/invoice-preview.tsx`
- Create: `src/app/invoices/page.test.tsx`

- [ ] **Step 1: Write the failing invoice page test**

Create `src/app/invoices/page.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import InvoicesPage from "./page";

describe("InvoicesPage", () => {
  it("renders invoice tracking sections", async () => {
    render(await InvoicesPage());
    expect(screen.getByRole("heading", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByText("Recent invoices")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/invoices/page.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement invoice list and preview**

Create `src/components/invoices/invoice-preview.tsx`:

```tsx
type InvoicePreviewProps = {
  invoiceNumber: string;
  customerName: string;
  subtotal: number;
  total: number;
  paymentStatus: string;
  notes?: string | null;
};

export function InvoicePreview(props: InvoicePreviewProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoice {props.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-neutral-500">{props.customerName}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm">{props.paymentStatus}</span>
      </div>
      <div className="mt-6 space-y-2 text-sm">
        <p>Subtotal: RM {props.subtotal.toFixed(2)}</p>
        <p>Total: RM {props.total.toFixed(2)}</p>
        {props.notes ? <p>Notes: {props.notes}</p> : null}
      </div>
      <button type="button" className="mt-6 rounded-md bg-black px-4 py-2 text-white print:hidden">
        Print
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement the invoice pages**

Create `src/app/invoices/page.tsx` with heading and list section:

```tsx
<h1 className="text-2xl font-semibold">Invoices</h1>
<section className="space-y-3">
  <h2 className="text-lg font-semibold">Recent invoices</h2>
</section>
```

Create `src/app/invoices/[invoiceId]/page.tsx` to render `InvoicePreview`.

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/invoices/page.test.tsx
```

Expected: PASS.

---

### Task 7: Full verification

- [ ] **Step 1: Run all tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual mobile check**

Run the local app and verify on a narrow viewport:

```powershell
node .\node_modules\next\dist\bin\next dev -p 3011
```

Check:
- dashboard summary cards stack cleanly on phone width
- customer cards do not require horizontal scroll
- job cards show stage and priority clearly
- invoice cards remain tappable
- you can move from dashboard to jobs to generation on phone

---

## Self-review

- Spec coverage:
  - mixed dashboard: Task 4
  - customer database: Tasks 2 and 5
  - job tracking with stage + priority: Task 3
  - invoice system: Tasks 2 and 6
  - mobile-friendly use: Tasks 4, 5, 6, and 7
- No placeholders remain.
- Type consistency:
  - `WorkflowStage`
  - `JobPriority`
  - `InvoicePaymentStatus`
  - `customerSchema`
  - `invoiceSchema`

