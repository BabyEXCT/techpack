# Zoho-Like Invoice System — Design Spec

**Date:** 2026-07-12  
**Status:** Draft  
**Scope:** Layer 1 — Invoice creation, auto-numbering, customer/job linking, status workflow, ledger UI  
**Future scope:** Layer 2 — Payment tracking (multiple methods), Layer 3 — Professional PDF export

---

## 1. Problem Statement

The app can read invoices from the database and show a basic preview, but there is no way to **create** invoices from the UI, no auto-numbering, no professional PDF output, and no payment tracking. The user needs a Zoho-like invoice system to manage billing for their sublimation order business.

---

## 2. User Workflow

```
Jobs page → "Create Invoice" button
       ↓
   New Invoice page (/invoices/new)
       ↓
   Step 1: Auto-number shown, select customer
   Step 2: Pick jobs to include
   Step 3: Review/edit amounts, add notes
       ↓
   "Save as Draft" or "Mark as Sent"
       ↓
   Invoice listing shows new invoice
       ↓
   Detail page: view, edit (if draft), change status, print
```

---

## 3. Database Changes

### New: InvoiceCounter model

```prisma
model InvoiceCounter {
  id     String @id
  prefix String @default("TP-")
  next   Int    @default(1)
}
```

- Singleton record (id = `counter`)
- On create: `invoiceNumber = "${prefix}${String(next).padStart(4, "0")}"`
- Counter is atomically incremented

### New: Payment model (Layer 2 prep, table created now)

```prisma
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

### Invoice model — no changes needed

The existing `Invoice` model already has:
- `invoiceNumber`, `customerId`, `subtotal`, `total`, `notes`, `paymentStatus`, `createdAt`

Status enum: `DRAFT`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`

---

## 4. API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/invoices` | List invoices, supports `?status=` and `?sort=` query params |
| `POST` | `/api/invoices` | Create invoice (auto-number, set DRAFT) |
| `GET` | `/api/invoices/[id]` | Get single invoice with customer + jobs |
| `PATCH` | `/api/invoices/[id]` | Update invoice fields (only when DRAFT) |
| `PUT` | `/api/invoices/[id]/status` | Change status (with validation of allowed transitions) |
| `DELETE` | `/api/invoices/[id]` | Delete invoice |

### Status transitions

```
DRAFT → SENT
SENT  → PARTIALLY_PAID | PAID | OVERDUE
PARTIALLY_PAID → PAID | OVERDUE
PAID  → (terminal)
OVERDUE → PAID | PARTIALLY_PAID
```

Invalid transitions return 400.

### Status badge colors

| Status          | Color scheme               |
|-----------------|----------------------------|
| DRAFT           | Neutral/gray (bg-zinc-100 text-zinc-700) |
| SENT            | Blue (bg-blue-50 text-blue-700)          |
| PARTIALLY_PAID  | Amber (bg-amber-50 text-amber-700)       |
| PAID            | Emerald (bg-emerald-50 text-emerald-700) |
| OVERDUE         | Red (bg-red-50 text-red-700)             |

---

## 5. Pages

### `/invoices/new` — Create invoice

- **Auto-number** shown first (read-only, generated from counter)
- **Customer selector**: dropdown of existing customers, link to `/customers/new`
- **Job selector**: multi-select list of active jobs where `invoiceId` is null. Jobs already linked to an invoice are excluded.
- **Amount editor**: editable price field per job (defaults to 0 if job has no stored price). Subtotal and total auto-calculate on change.
- **Notes**: optional textarea
- **Actions**: "Save as Draft" (POST, status DRAFT) / "Save & Send" (POST, status SENT)
- On success: redirect to `/invoices/[id]`

### `/invoices` — Invoice ledger

- **Tabs**: All / Draft / Sent / Partially Paid / Paid / Overdue
- **Sort**: by date (default desc), by total
- **Invoice cards**: styled with icon, invoice number, customer, amount, colored status badge
- **Actions**: View, Edit (if draft), Delete
- **Empty state**: "No invoices yet"

### `/invoices/[id]` — Invoice detail

- **Header**: invoice number, customer name, created date
- **Status badge** with dropdown action (change status)
- **Job list**: linked jobs with amounts
- **Totals**: subtotal, total
- **Notes**
- **Action bar**: Edit (if DRAFT), Delete, Print (window.print for now)
- **Payment history placeholder** (for Layer 2)

---

## 6. UI Components

| Component | Path | Purpose |
|-----------|------|---------|
| `InvoiceForm` | `src/components/invoices/invoice-form.tsx` | Create/edit form with customer select, job picker, amount editor |
| `InvoiceLedger` | `src/components/invoices/invoice-ledger.tsx` | Filtered list with tabs + actions |
| `InvoiceDetail` | `src/components/invoices/invoice-detail.tsx` | Full invoice view with status actions |
| `StatusBadge` | `src/components/invoices/status-badge.tsx` | Colored badge per status (reusable) |

---

## 7. Auto-Numbering Logic

```ts
// lib/invoices/auto-number.ts
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

---

## 8. Error Handling

- **Create fails**: Show inline error (e.g. "Invoice number already taken" — retry with new number)
- **Edit when not DRAFT**: Return 400, disable edit button
- **Status transition invalid**: Return 400 with explanation
- **Delete when invoice has payments**: Block with message (Layer 2)

---

## 9. Testing

- Unit tests for auto-number logic (race condition simulated)
- Unit tests for status transition validations
- Integration test for create → list → view → edit → status change flow
- Component tests for InvoiceForm (customer select, job picker, amount calc)
- Component tests for StatusBadge (renders correct color per status)

---

## 10. Non-Goals (Layer 1)

- Payment tracking (Layer 2)
- Professional PDF generation (Layer 2/3)
- Email sending to customers
- Invoice templates/branding
- Recurring invoices
- Tax/GST calculations
