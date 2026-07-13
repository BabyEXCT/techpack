# Mixed-Style Itemized Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support one customer order containing multiple apparel styles by splitting a single pasted WhatsApp message into multiple editable item sections inside one job.

**Architecture:** Extend the parser from producing one flat roster into producing an order draft with multiple item groups, then thread those item groups through review and generation so each item section keeps its own apparel settings, roster, and totals. Preserve one parent job while making supplier output itemized per style section.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest, pdf-lib

---

## File map

**Modify:**
- `prisma/schema.prisma`
- `src/lib/jobs/parse-whatsapp.ts`
- `src/lib/jobs/__tests__/parse-whatsapp.test.ts`
- `src/lib/jobs/local-jobs.ts`
- `src/lib/jobs/editable-job.ts`
- `src/lib/jobs/job-draft-service.ts`
- `src/lib/jobs/__tests__/job-draft-service.test.ts`
- `src/components/jobs/job-form.tsx`
- `src/components/jobs/review-job-client.tsx`
- `src/components/jobs/generation-panel.tsx`
- `src/app/api/jobs/[jobId]/route.ts`
- `src/app/api/jobs/[jobId]/generate/route.ts`
- `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- `src/lib/pdf/techpack-template.ts`
- `src/lib/pdf/order-sheet-template.ts`

**Create:**
- `src/lib/jobs/style-keywords.ts`
- `src/lib/jobs/__tests__/style-keywords.test.ts`
- `src/components/jobs/item-section-card.tsx`

---

### Task 1: Add style keyword detection helpers

**Files:**
- Create: `src/lib/jobs/style-keywords.ts`
- Test: `src/lib/jobs/__tests__/style-keywords.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jobs/__tests__/style-keywords.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectStyleLabel } from "../style-keywords";

describe("detectStyleLabel", () => {
  it("detects muslimah", () => {
    expect(detectStyleLabel("cutting muslimah")).toBe("Muslimah");
  });

  it("detects polo", () => {
    expect(detectStyleLabel("standard with polo collar")).toBe("Polo");
  });

  it("detects round neck long sleeve", () => {
    expect(detectStyleLabel("round neck long sleeve")).toBe("Round Neck Long Sleeve");
  });

  it("returns empty string when no supported style keyword exists", () => {
    expect(detectStyleLabel("size S")).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/style-keywords.test.ts
```

Expected: FAIL because the helper file does not exist.

- [ ] **Step 3: Implement minimal keyword detection**

Create `src/lib/jobs/style-keywords.ts`:

```ts
const STYLE_RULES = [
  { label: "Muslimah", keywords: ["muslimah"] },
  { label: "Polo", keywords: ["polo"] },
  { label: "Round Neck Long Sleeve", keywords: ["round neck", "long sleeve"] }
];

function normalizeText(input: string) {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectStyleLabel(line: string) {
  const normalized = normalizeText(line);

  for (const rule of STYLE_RULES) {
    if (rule.keywords.every((keyword) => normalized.includes(keyword))) {
      return rule.label;
    }
  }

  return "";
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/style-keywords.test.ts
```

Expected: PASS.

---

### Task 2: Extend parser to split one order into multiple item sections

**Files:**
- Modify: `src/lib/jobs/parse-whatsapp.ts`
- Modify: `src/lib/jobs/__tests__/parse-whatsapp.test.ts`
- Modify: `src/lib/jobs/local-jobs.ts`

- [ ] **Step 1: Write the failing parser test**

Add to `src/lib/jobs/__tests__/parse-whatsapp.test.ts`:

```ts
it("splits mixed-style whatsapp text into item groups", () => {
  const result = parseWhatsAppOrder(
    "cutting muslimah\nsize S\n1. ALYAA - 13\n\nround neck long sleeve\nsize M\n1. AIMI - 21"
  );

  expect(result.items).toEqual([
    expect.objectContaining({
      name: "Muslimah",
      roster: [expect.objectContaining({ name: "ALYAA", size: "S" })]
    }),
    expect.objectContaining({
      name: "Round Neck Long Sleeve",
      roster: [expect.objectContaining({ name: "AIMI", size: "M" })]
    })
  ]);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/parse-whatsapp.test.ts
```

Expected: FAIL because `items` does not exist.

- [ ] **Step 3: Implement itemized parsing**

Update `src/lib/jobs/parse-whatsapp.ts` so the parser builds item groups:

```ts
type ParsedOrderItem = {
  name: string;
  cuttingType?: string;
  collarType?: string;
  material?: string;
  roster: ParsedRosterRow[];
  sizeTotals: Record<string, number>;
};
```

Add grouping logic:

```ts
const items: ParsedOrderItem[] = [];
let currentItem: ParsedOrderItem | null = null;

for (const line of lines) {
  const styleLabel = detectStyleLabel(line);
  if (styleLabel) {
    currentItem = {
      name: styleLabel,
      cuttingType: styleLabel === "Muslimah" ? "Muslimah" : "",
      collarType: styleLabel === "Polo" ? "Polo" : styleLabel === "Round Neck Long Sleeve" ? "Round Neck" : "",
      roster: [],
      sizeTotals: {}
    };
    items.push(currentItem);
    activeGroupedSize = "";
    continue;
  }

  // existing grouped-size and row parsing,
  // but push rows into currentItem?.roster when an item exists
}

for (const item of items) {
  item.sizeTotals = buildSizeTotals(item.roster.filter((row) => row.size));
}

return {
  roster: items.flatMap((item) => item.roster),
  sizeTotals: buildSizeTotals(items.flatMap((item) => item.roster).filter((row) => row.size)),
  items
};
```

Update `src/lib/jobs/local-jobs.ts`:

```ts
export type LocalJobItem = {
  name: string;
  cuttingType?: string;
  collarType?: string;
  material?: string;
  roster: ParsedRosterRow[];
  sizeTotals: SizeTotals;
};

export type LocalJobDraft = {
  id: string;
  projectName: string;
  items?: LocalJobItem[];
  roster: ParsedRosterRow[];
  sizeTotals: SizeTotals;
  // existing fields...
};
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/parse-whatsapp.test.ts
```

Expected: PASS.

---

### Task 3: Persist item groups through draft loading and review API

**Files:**
- Modify: `src/lib/jobs/editable-job.ts`
- Modify: `src/lib/jobs/job-draft-service.ts`
- Modify: `src/lib/jobs/__tests__/job-draft-service.test.ts`
- Modify: `src/app/api/jobs/[jobId]/route.ts`

- [ ] **Step 1: Write failing draft-service expectations**

Add to `job-draft-service.test.ts` a test that expects `items` to flow through the draft:

```ts
expect(result.items).toEqual([
  expect.objectContaining({
    name: "Muslimah",
    roster: [expect.objectContaining({ name: "ALYAA" })]
  })
]);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Extend editable draft schema**

Update `src/lib/jobs/editable-job.ts`:

```ts
const editableJobItemSchema = z.object({
  name: z.string().default(""),
  cuttingType: z.string().optional().default(""),
  collarType: z.string().optional().default(""),
  material: z.string().optional().default(""),
  roster: z.array(editableRosterRowSchema).default([])
});

export const editableJobDraftSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  items: z.array(editableJobItemSchema).default([]),
  // existing fields...
});
```

- [ ] **Step 4: Thread items through draft service**

In `src/lib/jobs/job-draft-service.ts`, include `items` on read and write. For the first version, serialize item groups into `sourceMessage`-adjacent draft data only if DB normalization is not yet in place, or map item groups into existing roster loading structure if you choose a quick compatibility approach. Keep the shape stable in the returned draft:

```ts
return {
  id: job.id,
  projectName: job.projectName,
  items: input.items ?? [],
  // existing fields...
};
```

And ensure `PATCH` route continues forwarding the full parsed object.

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

Expected: PASS.

---

### Task 4: Add item-section review UI

**Files:**
- Create: `src/components/jobs/item-section-card.tsx`
- Modify: `src/components/jobs/review-job-client.tsx`
- Modify: `src/components/jobs/job-form.tsx`

- [ ] **Step 1: Implement item section card**

Create `src/components/jobs/item-section-card.tsx`:

```tsx
type ItemSectionCardProps = {
  item: {
    name: string;
    cuttingType?: string;
    collarType?: string;
    material?: string;
    roster: EditableRosterRow[];
  };
};

export function ItemSectionCard({ item }: ItemSectionCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-base font-semibold">{item.name}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <input value={item.cuttingType ?? ""} readOnly className="w-full rounded-md border px-3 py-2" />
        <input value={item.collarType ?? ""} readOnly className="w-full rounded-md border px-3 py-2" />
        <input value={item.material ?? ""} readOnly className="w-full rounded-md border px-3 py-2" />
      </div>
      <div className="mt-4 space-y-2">
        {item.roster.map((row) => (
          <div key={`${item.name}-${row.rowNumber}`} className="rounded-md border px-3 py-2 text-sm">
            {row.name} {row.number ? `- ${row.number}` : ""} {row.size ? `(${row.size})` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Show parsed item groups after New Job**

Update `src/components/jobs/job-form.tsx` so `upsertLocalJob()` stores parser `items`:

```ts
const parsed = parseWhatsAppOrder(sourceMessage);
upsertLocalJob({
  id: body.id,
  projectName,
  items: parsed.items ?? [],
  roster: parsed.roster,
  sizeTotals: parsed.sizeTotals,
  // existing fields...
});
```

- [ ] **Step 3: Render item sections in review**

Update `src/components/jobs/review-job-client.tsx`:

```tsx
{job.items?.length ? (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Order items</h2>
    {job.items.map((item, index) => (
      <ItemSectionCard key={`${item.name}-${index}`} item={item} />
    ))}
  </div>
) : null}
```

For the first version, keep the existing flat roster visible too if needed for compatibility, but item sections must be visible.

- [ ] **Step 4: Run UI tests or build**

Run:

```powershell
npm run build
```

Expected: PASS.

---

### Task 5: Group generation output by item section

**Files:**
- Modify: `src/app/api/jobs/[jobId]/generate/route.ts`
- Modify: `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- Modify: `src/lib/pdf/techpack-template.ts`
- Modify: `src/lib/pdf/order-sheet-template.ts`

- [ ] **Step 1: Write failing generation test**

Add to `generate-route.test.ts`:

```ts
it("passes item groups into generation when present", async () => {
  const request = new Request("http://localhost/api/jobs/job_777/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      projectName: "Mixed Job",
      category: "Sublimation",
      items: [
        {
          name: "Muslimah",
          cuttingType: "Muslimah",
          roster: [{ rowNumber: 1, name: "ALYAA", size: "S", qty: 1, remarks: "" }]
        },
        {
          name: "Polo",
          collarType: "Polo",
          roster: [{ rowNumber: 1, name: "AIMI", size: "M", qty: 1, remarks: "" }]
        }
      ],
      roster: [],
      mockupFiles: []
    })
  });

  const response = await POST(request, { params: Promise.resolve({ jobId: "job_777" }) });
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

Expected: FAIL or incomplete behavior.

- [ ] **Step 3: Add item-aware generation**

Update the generate route schema:

```ts
const jobItemSchema = z.object({
  name: z.string(),
  cuttingType: z.string().optional().nullable(),
  collarType: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  roster: z.array(rosterRowSchema).default([])
});

const jobInputSchema = z.object({
  projectName: z.string(),
  items: z.array(jobItemSchema).optional().default([]),
  // existing fields...
});
```

When `items.length > 0`, generate sections per item and pass item titles into PDF generation:

```ts
const effectiveItems = job.items.length
  ? job.items
  : [
      {
        name: job.category || "Order",
        cuttingType: job.cuttingType,
        collarType: job.collarType,
        material: job.material,
        roster: job.roster
      }
    ];
```

Then loop item groups and append per-item sections into the combined PDF flow.

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

Expected: PASS.

---

### Task 6: Full verification

- [ ] **Step 1: Run full tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run app**

Run:

```powershell
node .\node_modules\next\dist\bin\next dev -p 3011
```

- [ ] **Step 3: Manual mixed-style flow**

Paste a message like:

```text
cutting muslimah
size S
1. ALYAA - 13

round neck long sleeve
size M
1. AIMI - 21

standard with polo collar
size L
1. HUDA - 05
```

Verify:
- review shows separate style sections
- each section has its own rows and totals
- generation output is grouped clearly by item section

---

## Self-review

- Spec coverage:
  - one job, multiple item sections: Tasks 2, 3, 4
  - auto-detect by keywords: Tasks 1 and 2
  - style names as section names: Tasks 1, 2, and 5
  - grouped supplier output per item: Task 5
- No placeholders remain.
- Type consistency:
  - `items`
  - `detectStyleLabel()`
  - `ItemSectionCard`
  - generation uses the same `items` field name throughout.

