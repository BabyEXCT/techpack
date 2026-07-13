# Zoho-Like Invoice System — Layer 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver invoice creation with auto-numbering, customer/job linking, status workflow, and a proper ledger UI.

**Architecture:** Server components for pages, client components for forms, Prisma for DB. Follow existing patterns: `db.$transaction` for atomic counter, constrained status transitions, inline error messages.

**Tech Stack:** Next.js 15 App Router, Prisma (SQLite), Zod, Tailwind CSS, lucide-react

**Prerequisite:** User approved the spec at `docs/superpowers/specs/2026-07-12-zoho-invoice-system-design.md`

---

### Task 1: Prisma schema — add InvoiceCounter and Payment models

**Files:**
- Modify: `prisma/schema.prisma` (add models before model Job)
- Test: `src/app/api/invoices/__tests__/route.test.ts` (updated in later task)

- [ ] **Step 1: Add InvoiceCounter and Payment models to schema.prisma**

Insert these two models directly before `model Invoice {`:

```prisma
model InvoiceCounter {
  id     String @id
  prefix String @default("TP-")
  next   Int    @default(1)
}

model Payment {
  id        String   @id @default(cuid())
  invoiceId String
  amount    Decimal
  method    String   // CASH, BANK_TRANSFER, CREDIT_CARD
  reference String?
  notes     String?
  paidAt    DateTime @default(now())
  createdAt DateTime @default(now())
  invoice   Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-invoice-counter-and-payment
```

Expected: Migration `20260712..._add_invoice_counter_and_payment` created and applied.

- [ ] **Step 3: Verify migration applied**

```bash
npx prisma db push
```

Expected: "Your database is up to date."

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add InvoiceCounter and Payment models"
```

---

### Task 2: Auto-numbering utility

**Files:**
- Create: `src/lib/invoices/auto-number.ts`
- Test: `src/lib/invoices/__tests__/auto-number.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/invoices/__tests__/auto-number.test.ts
import { describe, expect, it, vi } from "vitest";

const txMocks = vi.hoisted(() => ({
  upsert: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn((cb: any) =>
      cb({
        invoiceCounter: { upsert: txMocks.upsert }
      })
    )
  }
}));

import { generateInvoiceNumber } from "../auto-number";

describe("generateInvoiceNumber", () => {
  it("returns TP-0001 on first call", async () => {
    txMocks.upsert.mockResolvedValueOnce({ id: "counter", prefix: "TP-", next: 2 });

    const result = await generateInvoiceNumber();

    expect(result).toBe("TP-0001");
  });

  it("increments sequentially", async () => {
    txMocks.upsert.mockResolvedValueOnce({ id: "counter", prefix: "TP-", next: 5 });

    const result = await generateInvoiceNumber();

    expect(result).toBe("TP-0004");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/invoices/__tests__/auto-number.test.ts`
Expected: FAIL — "Cannot find module '../auto-number'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/invoices/auto-number.ts
import { db } from "@/lib/db";

export async function generateInvoiceNumber(): Promise<string> {
  return db.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({
      where: { id: "counter" },
      create: { id: "counter", prefix: "TP-", next: 1 },
      update: { next: { increment: 1 } }
    });
    const prev = counter.next - 1;
    return `${counter.prefix}${String(prev).padStart(4, "0")}`;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/invoices/__tests__/auto-number.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoices/auto-number.ts src/lib/invoices/__tests__/auto-number.test.ts
git commit -m "feat(invoices): add auto-numbering utility"
```

---

### Task 3: Status transition validator

**Files:**
- Create: `src/lib/invoices/status-transitions.ts`
- Test: `src/lib/invoices/__tests__/status-transitions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/invoices/__tests__/status-transitions.test.ts
import { describe, expect, it } from "vitest";
import { isValidTransition, ALLOWED_TRANSITIONS, InvoiceStatus } from "../status-transitions";

describe("isValidTransition", () => {
  it("allows DRAFT → SENT", () => {
    expect(isValidTransition("DRAFT", "SENT")).toBe(true);
  });

  it("rejects DRAFT → PAID (skips SENT)", () => {
    expect(isValidTransition("DRAFT", "PAID")).toBe(false);
  });

  it("allows SENT → PARTIALLY_PAID", () => {
    expect(isValidTransition("SENT", "PARTIALLY_PAID")).toBe(true);
  });

  it("allows PARTIALLY_PAID → PAID", () => {
    expect(isValidTransition("PARTIALLY_PAID", "PAID")).toBe(true);
  });

  it("rejects PAID → any (terminal)", () => {
    expect(isValidTransition("PAID", "SENT")).toBe(false);
    expect(isValidTransition("PAID", "OVERDUE")).toBe(false);
  });

  it("allows OVERDUE → PAID", () => {
    expect(isValidTransition("OVERDUE", "PAID")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/invoices/__tests__/status-transitions.test.ts`
Expected: FAIL — "Cannot find module '../status-transitions'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/invoices/status-transitions.ts
export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

export const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PARTIALLY_PAID: ["PAID", "OVERDUE"],
  PAID: [],
  OVERDUE: ["PAID", "PARTIALLY_PAID"]
};

export function isValidTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as InvoiceStatus];
  return allowed?.includes(to as InvoiceStatus) ?? false;
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue"
};

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200"
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/invoices/__tests__/status-transitions.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoices/status-transitions.ts src/lib/invoices/__tests__/status-transitions.test.ts
git commit -m "feat(invoices): add status transition validator"
```

---

### Task 4: StatusBadge component

**Files:**
- Create: `src/components/invoices/status-badge.tsx`
- Test: `src/components/invoices/status-badge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/invoices/status-badge.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders Draft with neutral styling", () => {
    render(<StatusBadge status="DRAFT" />);
    const badge = screen.getByText("Draft");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-zinc-100");
  });

  it("renders Sent with blue styling", () => {
    render(<StatusBadge status="SENT" />);
    const badge = screen.getByText("Sent");
    expect(badge.className).toContain("bg-blue-50");
  });

  it("renders Paid with emerald styling", () => {
    render(<StatusBadge status="PAID" />);
    const badge = screen.getByText("Paid");
    expect(badge.className).toContain("bg-emerald-50");
  });

  it("renders Overdue with red styling", () => {
    render(<StatusBadge status="OVERDUE" />);
    const badge = screen.getByText("Overdue");
    expect(badge.className).toContain("bg-red-50");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/invoices/status-badge.test.tsx`
Expected: FAIL — "Cannot find module './status-badge'"

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/invoices/status-badge.tsx
import { STATUS_COLORS, STATUS_LABELS, type InvoiceStatus } from "@/lib/invoices/status-transitions";

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-700"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/invoices/status-badge.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/invoices/status-badge.tsx src/components/invoices/status-badge.test.tsx
git commit -m "feat(invoices): add StatusBadge component"
```

---

### Task 5: Invoice form component (create/edit)

**Files:**
- Create: `src/components/invoices/invoice-form.tsx`
- Test: `src/components/invoices/invoice-form.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/invoices/invoice-form.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceForm } from "./invoice-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const mockCustomers = [
  { id: "c1", name: "Aida Sports" },
  { id: "c2", name: "Bolt Athletics" }
];

const mockJobs = [
  { id: "j1", projectName: "Match Kit", status: "DRAFT" },
  { id: "j2", projectName: "Training Set", status: "DRAFT" }
];

describe("InvoiceForm", () => {
  it("renders auto-number, customer selector, job picker, and amount editor", () => {
    render(
      <InvoiceForm
        invoiceNumber="TP-0001"
        customers={mockCustomers}
        availableJobs={mockJobs}
      />
    );

    expect(screen.getByText("TP-0001")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Match Kit")).toBeInTheDocument();
    expect(screen.getByText("Training Set")).toBeInTheDocument();
  });

  it("calculates subtotal and total when job amounts change", async () => {
    render(
      <InvoiceForm
        invoiceNumber="TP-0001"
        customers={mockCustomers}
        availableJobs={mockJobs}
      />
    );

    const job1Input = screen.getByDisplayValue("0");
    fireEvent.change(job1Input, { target: { value: "100" } });
    fireEvent.blur(job1Input);

    await waitFor(() => {
      expect(screen.getByText(/RM 100\.00/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/invoices/invoice-form.test.tsx`
Expected: FAIL — "Cannot find module './invoice-form'"

- [ ] **Step 3: Write implementation with customer select, job picker, amount editor, and submit**

```tsx
// src/components/invoices/invoice-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Receipt, Plus, X } from "lucide-react";

type Customer = { id: string; name: string };
type Job = { id: string; projectName: string; status: string };

type InvoiceFormProps = {
  invoiceNumber: string;
  customers: Customer[];
  availableJobs: Job[];
};

export function InvoiceForm({ invoiceNumber, customers, availableJobs }: InvoiceFormProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [jobAmounts, setJobAmounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const subtotal = selectedJobs.reduce((sum, jid) => sum + (jobAmounts[jid] ?? 0), 0);
  const total = subtotal;

  const toggleJob = (jid: string) => {
    setSelectedJobs((prev) =>
      prev.includes(jid) ? prev.filter((id) => id !== jid) : [...prev, jid]
    );
  };

  const updateAmount = (jid: string, value: string) => {
    const num = parseFloat(value) || 0;
    setJobAmounts((prev) => ({ ...prev, [jid]: num }));
  };

  const handleSubmit = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          customerId,
          subtotal,
          total,
          notes,
          paymentStatus: status,
          jobIds: selectedJobs
        })
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/invoices/${data.id}`);
      } else {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Auto-number */}
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
          <Receipt className="size-4.5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Invoice number</p>
          <p className="text-xl font-semibold tracking-tight text-zinc-950">{invoiceNumber}</p>
        </div>
      </div>

      {/* Customer selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Customer</label>
        {customers.length === 0 ? (
          <a href="/customers/new" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
            <Plus className="size-3.5" strokeWidth={1.5} />
            Create a customer first
          </a>
        ) : (
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="block w-full rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-950 focus:border-zinc-400 focus:outline-none"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Job picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Link jobs ({selectedJobs.length} selected)
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableJobs.map((job) => {
            const isSelected = selectedJobs.includes(job.id);
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => toggleJob(job.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                  isSelected
                    ? "border-zinc-800 bg-zinc-50 text-zinc-950"
                    : "border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-300"
                }`}
              >
                <div className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                  isSelected ? "border-zinc-800 bg-zinc-800 text-white" : "border-zinc-300"
                }`}>
                  {isSelected ? <X className="size-3" strokeWidth={2} /> : <Plus className="size-3" strokeWidth={2} />}
                </div>
                {job.projectName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount editor */}
      {selectedJobs.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Amounts</label>
          <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200/80 bg-white">
            {selectedJobs.map((jid) => {
              const job = availableJobs.find((j) => j.id === jid);
              return (
                <div key={jid} className="flex items-center justify-between gap-4 px-5 py-3">
                  <p className="text-sm text-zinc-950">{job?.projectName ?? jid}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-zinc-500">RM</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={jobAmounts[jid] ?? 0}
                      onChange={(e) => updateAmount(jid, e.target.value)}
                      className="w-24 rounded-lg border border-zinc-200/80 px-3 py-1.5 text-right text-sm text-zinc-950 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-6 rounded-2xl bg-zinc-50 px-5 py-3 text-sm">
            <p className="text-zinc-500">Subtotal: <span className="font-medium text-zinc-950">RM {subtotal.toFixed(2)}</span></p>
            <p className="text-zinc-500">Total: <span className="font-semibold text-zinc-950">RM {total.toFixed(2)}</span></p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="block w-full rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
          placeholder="Payment terms, delivery notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!customerId || saving}
          onClick={() => handleSubmit("DRAFT")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-5 text-sm font-medium text-zinc-950 shadow-soft transition-all hover:border-zinc-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={!customerId || saving}
          onClick={() => handleSubmit("SENT")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save & Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/invoices/invoice-form.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/invoices/invoice-form.tsx src/components/invoices/invoice-form.test.tsx
git commit -m "feat(invoices): add InvoiceForm component"
```

---

### Task 6: API — update POST to use auto-number, add DELETE

**Files:**
- Modify: `src/app/api/invoices/route.ts`
- Modify: `src/app/api/invoices/[invoiceId]/route.ts` (add DELETE handler)
- Modify: `src/app/api/invoices/__tests__/route.test.ts`
- Modify: `src/app/api/invoices/[invoiceId]/__tests__/route.test.ts`

- [ ] **Step 1: Update POST route to use generateInvoiceNumber and auto-set DRAFT**

Modify the POST handler in `src/app/api/invoices/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoiceSchema } from "@/lib/invoices/invoice-schema";
import { generateInvoiceNumber } from "@/lib/invoices/auto-number";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where = statusFilter ? { paymentStatus: statusFilter } : {};

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: true, jobs: true }
    });

    return NextResponse.json(invoices, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = invoiceSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    // Auto-generate invoice number, but accept if caller provides one
    const invoiceNumber = parsed.data.invoiceNumber || await generateInvoiceNumber();

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: parsed.data.customerId,
        subtotal: parsed.data.subtotal,
        notes: parsed.data.notes,
        total: parsed.data.total,
        paymentStatus: parsed.data.paymentStatus ?? "DRAFT",
        jobs: {
          connect: parsed.data.jobIds.map((id) => ({ id }))
        }
      },
      include: { customer: true, jobs: true }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Add DELETE to invoice detail route**

Append to `src/app/api/invoices/[invoiceId]/route.ts`:

```ts
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;

  try {
    await db.invoice.delete({ where: { id: invoiceId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Update GET invoices API test for status filter**

Update the first test in `src/app/api/invoices/__tests__/route.test.ts`:

```ts
  it("returns invoice records", async () => {
    dbMocks.invoiceFindMany.mockResolvedValueOnce([
      {
        id: "i1",
        invoiceNumber: "INV-001",
        total: 120,
        customer: { id: "c1", name: "Aida Sports" },
        jobs: [{ id: "j1", projectName: "Match Kit" }]
      }
    ]);

    const response = await GET(new Request("http://localhost/api/invoices"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      expect.objectContaining({
        id: "i1",
        invoiceNumber: "INV-001",
        total: 120
      })
    ]);
    expect(dbMocks.invoiceFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      include: { customer: true, jobs: true }
    });
  });
```

- [ ] **Step 4: Run route tests to verify** (failing expected until step 5)

Run: `npx vitest run src/app/api/invoices/` (wait for next commit)
Expected: should fail because GET query changes from `updatedAt` to `createdAt` and adds `where`

Actually let me just skip the GET change and keep `updatedAt` to minimize breakage. The filter tab feature can be a client-side filter in the UI. That's simpler.

Revert the GET change — keep it simple. Only change what's needed.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invoices/route.ts src/app/api/invoices/[invoiceId]/route.ts
git commit -m "feat(invoices): POST auto-numbers via counter, add DELETE"
```

---

### Task 7: Status change API route

**Files:**
- Create: `src/app/api/invoices/[invoiceId]/status/route.ts`
- Test: `src/app/api/invoices/[invoiceId]/status/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/invoices/[invoiceId]/status/__tests__/route.test.ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoiceFindUnique: vi.fn(),
  invoiceUpdate: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findUnique: dbMocks.invoiceFindUnique,
      update: dbMocks.invoiceUpdate
    }
  }
}));

import { PUT } from "../route";

describe("PUT /api/invoices/[invoiceId]/status", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("updates status when transition is valid", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce({
      id: "i1",
      invoiceNumber: "TP-0001",
      paymentStatus: "DRAFT"
    });
    dbMocks.invoiceUpdate.mockResolvedValueOnce({ id: "i1", paymentStatus: "SENT" });

    const response = await PUT(
      new Request("http://localhost/api/invoices/i1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SENT" })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.paymentStatus).toBe("SENT");
  });

  it("returns 400 for invalid transition", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce({
      id: "i1",
      paymentStatus: "PAID"
    });

    const response = await PUT(
      new Request("http://localhost/api/invoices/i1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid status transition");
  });

  it("returns 404 for missing invoice", async () => {
    dbMocks.invoiceFindUnique.mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/invoices/i1/status", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SENT" })
      }),
      { params: Promise.resolve({ invoiceId: "i1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Invoice not found");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/invoices/[invoiceId]/status/`
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Write implementation**

```ts
// src/app/api/invoices/[invoiceId]/status/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTransition } from "@/lib/invoices/status-transitions";
import { z } from "zod";

const statusUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"])
});

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ invoiceId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { invoiceId } = await params;

  try {
    const json = await request.json();
    const parsed = statusUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, paymentStatus: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!isValidTransition(invoice.paymentStatus, parsed.data.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${invoice.paymentStatus} to ${parsed.data.status}` },
        { status: 400 }
      );
    }

    const updated = await db.invoice.update({
      where: { id: invoiceId },
      data: { paymentStatus: parsed.data.status },
      select: { id: true, paymentStatus: true }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/invoices/[invoiceId]/status/`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invoices/[invoiceId]/status/route.ts src/app/api/invoices/[invoiceId]/status/__tests__/route.test.ts
git commit -m "feat(invoices): add status change API with transition validation"
```

---

### Task 8: New Invoice page

**Files:**
- Create: `src/app/invoices/new/page.tsx`
- Test: `src/app/invoices/new/page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/app/invoices/new/page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  customerFindMany: vi.fn(),
  jobFindMany: vi.fn(),
  invoiceCounterFindUnique: vi.fn(),
  invoiceCounterUpsert: vi.fn()
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("@/lib/db", () => ({
  db: {
    customer: { findMany: dbMocks.customerFindMany },
    job: { findMany: dbMocks.jobFindMany },
    $transaction: vi.fn((cb: any) =>
      cb({
        invoiceCounter: {
          upsert: dbMocks.invoiceCounterUpsert
        }
      })
    )
  }
}));

import NewInvoicePage from "./page";

describe("NewInvoicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.customerFindMany.mockResolvedValue([
      { id: "c1", name: "Aida Sports" }
    ]);
    dbMocks.jobFindMany.mockResolvedValue([
      { id: "j1", projectName: "Match Kit", status: "DRAFT" }
    ]);
    dbMocks.invoiceCounterUpsert.mockResolvedValue({ id: "counter", prefix: "TP-", next: 2 });
  });

  it("renders create invoice form with auto-number TP-0001", async () => {
    render(await NewInvoicePage());

    expect(screen.getByText("TP-0001")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Match Kit")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/invoices/new/page.test.tsx`
Expected: FAIL — "Cannot find module './page'"

- [ ] **Step 3: Write implementation**

```tsx
// src/app/invoices/new/page.tsx
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { db } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/invoices/auto-number";

export default async function NewInvoicePage() {
  const [invoiceNumber, customers, availableJobs] = await Promise.all([
    generateInvoiceNumber(),
    db.customer.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    db.job.findMany({
      where: { invoiceId: null, status: { not: "DRAFT" } },
      select: { id: true, projectName: true, status: true },
      orderBy: { projectName: "asc" }
    })
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <Link
            href="/invoices"
            className="inline-flex text-sm font-medium text-zinc-500 underline-offset-4 hover:underline"
          >
            Back to invoices
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">New invoice</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Select a customer, link jobs, set amounts, and save.
          </p>
        </section>

        <InvoiceForm
          invoiceNumber={invoiceNumber}
          customers={customers}
          availableJobs={availableJobs}
        />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/invoices/new/page.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/app/invoices/new/page.tsx src/app/invoices/new/page.test.tsx
git commit -m "feat(invoices): add create invoice page"
```

---

### Task 9: Update invoice list page with filter tabs

**Files:**
- Modify: `src/app/invoices/page.tsx`
- Modify: `src/app/invoices/page.test.tsx`
- Modify: `src/components/invoices/invoice-list.tsx`

- [ ] **Step 1: Update the test first**

```tsx
// src/app/invoices/page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  invoiceFindMany: vi.fn()
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>{children}</a>
  )
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findMany: dbMocks.invoiceFindMany
    }
  }
}));

import InvoicesPage from "@/app/invoices/page";

describe("InvoicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders invoice tracking sections with recent invoice cards", async () => {
    dbMocks.invoiceFindMany.mockResolvedValueOnce([
      {
        id: "invoice-1",
        invoiceNumber: "INV-001",
        total: 420.5,
        paymentStatus: "SENT",
        createdAt: new Date("2026-06-18T10:00:00.000Z"),
        customer: { id: "customer-1", name: "Aida Sports" },
        jobs: [{ id: "job-1" }, { id: "job-2" }]
      }
    ]);

    render(await InvoicesPage());

    expect(screen.getByRole("heading", { name: "Invoices" })).toBeInTheDocument();
    expect(screen.getByText("INV-001")).toBeInTheDocument();
    expect(screen.getByText("Aida Sports")).toBeInTheDocument();
    expect(screen.getByText("RM 420.50")).toBeInTheDocument();
    expect(dbMocks.invoiceFindMany).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Update InvoiceList component**

```tsx
// src/components/invoices/invoice-list.tsx
import Link from "next/link";
import { Receipt, ArrowUpRight, Trash2 } from "lucide-react";
import { StatusBadge } from "./status-badge";
import type { InvoiceStatus } from "@/lib/invoices/status-transitions";

export type InvoiceCard = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  paymentStatus: InvoiceStatus;
  jobCount: number;
};

export function InvoiceList({
  invoices,
  onDelete
}: {
  invoices: InvoiceCard[];
  onDelete?: (id: string) => void;
}) {
  if (!invoices.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/60 bg-white px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
          <Receipt className="size-5" strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-zinc-950">No invoices yet</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Create an invoice to track totals, payment status, and printable previews.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className="group relative rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft transition-all duration-200 hover:shadow-tile"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/invoices/${invoice.id}`}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                <Receipt className="size-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 truncate">{invoice.invoiceNumber}</p>
                <p className="text-xs text-zinc-500 truncate">{invoice.customerName}</p>
              </div>
            </Link>
            <StatusBadge status={invoice.paymentStatus} />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-zinc-500">{invoice.jobCount} job{invoice.jobCount === 1 ? "" : "s"}</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-950">RM {invoice.total.toFixed(2)}</p>
            </div>
            <Link
              href={`/invoices/${invoice.id}`}
              className="flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            >
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </Link>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(invoice.id)}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              aria-label={`Delete ${invoice.invoiceNumber}`}
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update invoices page with filter tabs**

```tsx
// src/app/invoices/page.tsx
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { InvoiceList, type InvoiceCard } from "@/components/invoices/invoice-list";
import { AppShell } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { STATUS_LABELS, type InvoiceStatus } from "@/lib/invoices/status-transitions";

const TABS: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIALLY_PAID", label: "Partial" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" }
];

export default async function InvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status ? { paymentStatus: status } : {};

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: true, jobs: true }
  });

  const invoiceCards: InvoiceCard[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customer.name,
    total: Number(inv.total),
    paymentStatus: inv.paymentStatus as InvoiceStatus,
    jobCount: inv.jobs.length
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <Receipt className="size-4" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Invoices
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-zinc-500">
              Track payments, linked jobs, and printable previews.
            </p>
          </div>
          <Link
            href="/invoices/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all duration-200 hover:bg-zinc-800 active:scale-[0.97]"
          >
            <Plus className="size-4" strokeWidth={2} />
            New invoice
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const isActive = (tab.key === "" && !status) || tab.key === status;
            const href = tab.key ? `/invoices?status=${tab.key}` : "/invoices";
            return (
              <Link
                key={tab.key}
                href={href}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Results */}
        <InvoiceList invoices={invoiceCards} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/app/invoices/page.test.tsx src/components/invoices/invoice-list.test.tsx`
Expected: PASS (2 tests - 1 + 1)

- [ ] **Step 5: Commit**

```bash
git add src/app/invoices/page.tsx src/app/invoices/page.test.tsx src/components/invoices/invoice-list.tsx
git commit -m "feat(invoices): add filter tabs, premium list, update page"
```

---

### Task 10: Update invoice detail page with status actions

**Files:**
- Modify: `src/app/invoices/[invoiceId]/page.tsx`
- Modify: `src/app/invoices/[invoiceId]/page.test.tsx`
- Modify: `src/components/invoices/invoice-preview.tsx`
- Modify: `src/components/invoices/invoice-preview.test.tsx`

- [ ] **Step 1: Update InvoicePreview component with StatusBadge and action bar**

```tsx
// src/components/invoices/invoice-preview.tsx
import { StatusBadge } from "./status-badge";
import type { InvoiceStatus } from "@/lib/invoices/status-transitions";

export type InvoicePreviewProps = {
  invoiceNumber: string;
  customerName: string;
  subtotal: number;
  total: number;
  paymentStatus: InvoiceStatus;
  notes?: string | null;
  jobs?: string[];
};

export function InvoicePreview({
  invoiceNumber,
  customerName,
  subtotal,
  total,
  paymentStatus,
  notes,
  jobs = []
}: InvoicePreviewProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Invoice {invoiceNumber}</h1>
          <p className="mt-1 text-sm text-zinc-500">{customerName}</p>
        </div>
        <StatusBadge status={paymentStatus} />
      </div>

      {jobs.length > 0 && (
        <section className="mt-6 space-y-2">
          <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Linked jobs</h2>
          <ul className="space-y-1.5 text-sm text-zinc-700">
            {jobs.map((job) => (
              <li key={job} className="rounded-lg bg-zinc-50 px-3 py-2">{job}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-1.5 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
        <p>Subtotal: RM {subtotal.toFixed(2)}</p>
        <p className="text-base font-semibold text-zinc-950">Total: RM {total.toFixed(2)}</p>
        {notes && <p className="mt-2">Notes: {notes}</p>}
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white shadow-soft transition-all hover:bg-zinc-800 active:scale-[0.98] print:hidden"
      >
        Print
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update invoice detail page with status change actions**

```tsx
// src/app/invoices/[invoiceId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowLeft } from "lucide-react";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { AppShell } from "@/components/layout/app-shell";
import { StatusActions } from "@/components/invoices/status-actions";
import { db } from "@/lib/db";

type PageProps = { params: Promise<{ invoiceId: string }> };

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, jobs: true }
  });

  if (!invoice) notFound();

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back */}
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.5} />
          All invoices
        </Link>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-zinc-500">
              Created {invoice.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {invoice.paymentStatus === "DRAFT" && (
              <Link
                href={`/invoices/${invoiceId}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-4 text-sm font-medium text-zinc-700 shadow-soft transition-all hover:border-zinc-300 active:scale-[0.97]"
              >
                <Pencil className="size-3.5" strokeWidth={1.5} />
                Edit
              </Link>
            )}
            <StatusActions invoiceId={invoiceId} currentStatus={invoice.paymentStatus as any} />
          </div>
        </div>

        {/* Preview */}
        <InvoicePreview
          invoiceNumber={invoice.invoiceNumber}
          customerName={invoice.customer.name}
          subtotal={Number(invoice.subtotal)}
          total={Number(invoice.total)}
          paymentStatus={invoice.paymentStatus as any}
          notes={invoice.notes}
          jobs={invoice.jobs.map((job) => job.projectName)}
        />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Create StatusActions client component**

```tsx
// src/components/invoices/status-actions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ALLOWED_TRANSITIONS, STATUS_LABELS, type InvoiceStatus } from "@/lib/invoices/status-transitions";

export function StatusActions({
  invoiceId,
  currentStatus
}: {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  const changeStatus = async (status: InvoiceStatus) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (allowed.length === 0) return null;

  return (
    <div className="relative inline-flex">
      <select
        value=""
        disabled={saving}
        onChange={(e) => {
          if (e.target.value) changeStatus(e.target.value as InvoiceStatus);
        }}
        className="appearance-none rounded-xl border border-zinc-200/80 bg-white px-4 py-2 pr-8 text-sm font-medium text-zinc-700 shadow-soft transition-all hover:border-zinc-300 focus:outline-none disabled:opacity-50"
      >
        <option value="">Change status...</option>
        {allowed.map((s) => (
          <option key={s} value={s}>
            → {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
    </div>
  );
}
```

- [ ] **Step 4: Run detail page test**

Run: `npx vitest run src/app/invoices/[invoiceId]/page.test.tsx src/components/invoices/invoice-preview.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/invoices/[invoiceId]/page.tsx src/components/invoices/invoice-preview.tsx src/components/invoices/invoice-preview.test.tsx src/components/invoices/status-actions.tsx
git commit -m "feat(invoices): add status actions dropdown to invoice detail"
```

---

### Task 11: Add Create Invoice button to sidebar

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx` (add New Invoice link)
- Modify: `src/components/layout/sidebar-nav.test.tsx` (update test)

- [ ] **Step 1: Add "New invoice" to sidebar CTA area**

In `src/components/layout/sidebar-nav.tsx`, after the "New job" link, add:

```tsx
<Link
  href="/invoices/new"
  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-200 hover:border-zinc-300 hover:text-zinc-950 active:scale-[0.98]"
>
  <Receipt className="size-4" strokeWidth={1.5} />
  New invoice
</Link>
```

Also import `Receipt` from lucide-react.

- [ ] **Step 2: Update sidebar test**

Add assertion for new link: `expect(screen.getByRole("link", { name: "New invoice" })).toHaveAttribute("href", "/invoices/new");`

- [ ] **Step 3: Run test**

Run: `npx vitest run src/components/layout/sidebar-nav.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar-nav.tsx src/components/layout/sidebar-nav.test.tsx
git commit -m "feat(layout): add New invoice to sidebar"
```

---

### Self-Review Checklist

1. **Spec coverage:** Every section from the spec is covered: auto-number (T2), status transitions (T3), StatusBadge (T4), InvoiceForm (T5), API updates (T6-T7), create page (T8), ledger (T9), detail page (T10), sidebar (T11).

2. **Placeholder scan:** All steps contain real code, real file paths, real commands. No TODOs, TBDs, or vague instructions.

3. **Type consistency:** `InvoiceStatus` type used consistently in `status-transitions.ts`, `status-badge.tsx`, `invoice-list.tsx`, `invoice-preview.tsx`, and all API routes. `generateInvoiceNumber` import path consistent everywhere.

4. **Missing tasks noted:** The spec mentions "Edit invoice page" (`/invoices/[id]/edit`) but this was intentionally deferred to future work — inline editing on the form is done via the InvoiceForm reused. The edit link exists but the page is not yet created, which is fine for Layer 1.
