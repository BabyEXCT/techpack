# Section-Based Single PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one combined supplier PDF that is split into clear internal sections, each with its own filtered roster, totals, optional section mockup, section artwork cut pieces, and section color confirmation.

**Architecture:** Keep one job and one combined PDF, but enrich each parsed item section so it can hold section-level visual assets. Generation then resolves visuals per section using a fallback order: section mockup first, shared mockup second, while artwork cut pieces and color confirmation remain section-only assets.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest, pdf-lib

---

## File map

**Modify:**
- `src/lib/jobs/local-jobs.ts`
- `src/lib/jobs/editable-job.ts`
- `src/lib/jobs/job-draft-service.ts`
- `src/lib/jobs/__tests__/job-draft-service.test.ts`
- `src/components/jobs/item-section-card.tsx`
- `src/components/jobs/review-job-client.tsx`
- `src/app/api/jobs/[jobId]/generate/route.ts`
- `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- `src/lib/pdf/techpack-template.ts`
- `src/lib/pdf/order-sheet-template.ts`

**Create:**
- `src/lib/jobs/item-assets.ts`
- `src/lib/jobs/__tests__/item-assets.test.ts`

---

### Task 1: Add section-level asset types and helpers

**Files:**
- Create: `src/lib/jobs/item-assets.ts`
- Test: `src/lib/jobs/__tests__/item-assets.test.ts`
- Modify: `src/lib/jobs/local-jobs.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/lib/jobs/__tests__/item-assets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveItemMockup } from "../item-assets";

describe("resolveItemMockup", () => {
  it("prefers a section mockup over the shared mockup", () => {
    const shared = [{ name: "shared.png", dataUrl: "data:image/png;base64,AAA" }];
    const section = [{ name: "polo.png", dataUrl: "data:image/png;base64,BBB" }];

    expect(resolveItemMockup(section, shared)).toEqual(section);
  });

  it("falls back to the shared mockup when a section mockup is missing", () => {
    const shared = [{ name: "shared.png", dataUrl: "data:image/png;base64,AAA" }];

    expect(resolveItemMockup([], shared)).toEqual(shared);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/item-assets.test.ts
```

Expected: FAIL because helper file does not exist.

- [ ] **Step 3: Implement item asset helpers**

Create `src/lib/jobs/item-assets.ts`:

```ts
import type { LocalAssetFile } from "./local-jobs";

export type ItemAssetSet = {
  mockupFiles?: LocalAssetFile[];
  artworkCutPieces?: LocalAssetFile[];
  colorConfirmationFiles?: LocalAssetFile[];
};

export function resolveItemMockup(
  sectionMockupFiles: LocalAssetFile[] = [],
  sharedMockupFiles: LocalAssetFile[] = []
) {
  return sectionMockupFiles.length ? sectionMockupFiles : sharedMockupFiles;
}
```

- [ ] **Step 4: Extend local draft types**

Update `src/lib/jobs/local-jobs.ts`:

```ts
export type LocalJobItem = {
  name: string;
  cuttingType?: string;
  collarType?: string;
  material?: string;
  roster: ParsedRosterRow[];
  sizeTotals: SizeTotals;
  mockupFiles?: LocalAssetFile[];
  artworkCutPieces?: LocalAssetFile[];
  colorConfirmationFiles?: LocalAssetFile[];
};
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/item-assets.test.ts
```

Expected: PASS.

---

### Task 2: Persist section-level assets through drafts

**Files:**
- Modify: `src/lib/jobs/editable-job.ts`
- Modify: `src/lib/jobs/job-draft-service.ts`
- Modify: `src/lib/jobs/__tests__/job-draft-service.test.ts`

- [ ] **Step 1: Add a failing draft-service test**

Extend `job-draft-service.test.ts`:

```ts
expect(result.items).toEqual([
  expect.objectContaining({
    name: "Polo",
    mockupFiles: [expect.objectContaining({ name: "polo-mockup.png" })],
    artworkCutPieces: [expect.objectContaining({ name: "polo-cut-piece.png" })],
    colorConfirmationFiles: [expect.objectContaining({ name: "polo-color.png" })]
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
const editableAssetFileSchema = z.object({
  name: z.string(),
  dataUrl: z.string(),
  role: z.enum(["front", "back", "unassigned"]).optional().nullable()
});

export const editableJobItemSchema = z.object({
  name: z.string().optional().nullable().default(""),
  cuttingType: z.string().optional().nullable().default(""),
  collarType: z.string().optional().nullable().default(""),
  material: z.string().optional().nullable().default(""),
  roster: z.array(editableRosterRowSchema).default([]),
  mockupFiles: z.array(editableAssetFileSchema).default([]),
  artworkCutPieces: z.array(editableAssetFileSchema).default([]),
  colorConfirmationFiles: z.array(editableAssetFileSchema).default([])
});
```

- [ ] **Step 4: Thread assets through draft service**

In `src/lib/jobs/job-draft-service.ts`, preserve these arrays when item groups are serialized/deserialized.

Example stable return shape:

```ts
return {
  id: job.id,
  projectName: job.projectName,
  items: normalizeJobItems(parsedItems).map((item) => ({
    ...item,
    mockupFiles: item.mockupFiles ?? [],
    artworkCutPieces: item.artworkCutPieces ?? [],
    colorConfirmationFiles: item.colorConfirmationFiles ?? []
  })),
  // existing fields...
};
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts
```

Expected: PASS.

---

### Task 3: Add section-level upload areas in review

**Files:**
- Modify: `src/components/jobs/item-section-card.tsx`
- Modify: `src/components/jobs/review-job-client.tsx`

- [ ] **Step 1: Extend item section UI**

Update `item-section-card.tsx` so each section shows:

```tsx
<div className="mt-4 space-y-4">
  <div>
    <p className="text-sm font-medium">Section mockup</p>
    <p className="text-xs text-neutral-500">Uses shared mockup if none is uploaded here.</p>
  </div>

  <div>
    <p className="text-sm font-medium">Artwork cut pieces</p>
  </div>

  <div>
    <p className="text-sm font-medium">Color confirmation</p>
  </div>
</div>
```

For the first version, if full upload wiring is not yet implemented, render the section asset lists and placeholders clearly so the review layout is ready for the later wiring in the same task.

- [ ] **Step 2: Show fallback status in review**

In `review-job-client.tsx`, add explanatory text:

```tsx
<p className="text-xs text-neutral-500">
  Section mockups override the shared mockup. Artwork cut pieces and color confirmation are section-only.
</p>
```

- [ ] **Step 3: Add or update UI test**

Extend `review-job-client.test.tsx`:

```ts
expect(screen.getByText("Section mockup")).toBeInTheDocument();
expect(screen.getByText("Artwork cut pieces")).toBeInTheDocument();
expect(screen.getByText("Color confirmation")).toBeInTheDocument();
```

- [ ] **Step 4: Run tests**

Run:

```powershell
npm test -- src/components/jobs/review-job-client.test.tsx
```

Expected: PASS.

---

### Task 4: Make generation resolve visuals per section

**Files:**
- Modify: `src/app/api/jobs/[jobId]/generate/route.ts`
- Modify: `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- Modify: `src/lib/pdf/techpack-template.ts`
- Modify: `src/lib/pdf/order-sheet-template.ts`

- [ ] **Step 1: Write failing generation test**

Extend `generate-route.test.ts`:

```ts
it("uses section mockup when available and falls back to the shared mockup otherwise", async () => {
  const request = new Request("http://localhost/api/jobs/job_section/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      projectName: "Section Job",
      mockupFiles: [{ name: "shared.png", dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}` }],
      items: [
        {
          name: "Polo",
          mockupFiles: [{ name: "polo.png", dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}` }],
          artworkCutPieces: [{ name: "polo-cut.png", dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}` }],
          colorConfirmationFiles: [{ name: "polo-color.png", dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}` }],
          roster: [{ rowNumber: 1, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }]
        }
      ],
      roster: []
    })
  });

  const response = await POST(request, { params: Promise.resolve({ jobId: "job_section" }) });
  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

Expected: FAIL or missing expected behavior.

- [ ] **Step 3: Resolve section assets in generation**

Update the generation route schema for item groups:

```ts
const jobItemSchema = z.object({
  name: z.string().optional().nullable(),
  cuttingType: z.string().optional().nullable(),
  collarType: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  roster: z.array(rosterRowSchema).optional().default([]),
  mockupFiles: z.array(mockupFileSchema).optional().default([]),
  artworkCutPieces: z.array(mockupFileSchema).optional().default([]),
  colorConfirmationFiles: z.array(mockupFileSchema).optional().default([])
});
```

When generating each section:

```ts
const resolvedMockups = resolveItemMockup(item.mockupFiles ?? [], job.mockupFiles ?? []);

const itemTechpack = await buildTechpackPdf({
  projectName: job.projectName,
  itemName,
  mockupFiles: resolvedMockups,
  artworkCutPieces: item.artworkCutPieces ?? [],
  colorConfirmationFiles: item.colorConfirmationFiles ?? [],
  // existing fields...
});
```

- [ ] **Step 4: Render section artwork/color confirmation pages**

Update `src/lib/pdf/techpack-template.ts` so each item section can render:

```ts
artworkCutPieces?: MockupFileInput[];
colorConfirmationFiles?: MockupFileInput[];
```

And add new section pages after the main mockup page:

```ts
if (job.artworkCutPieces?.length) {
  // add artwork cut pieces page for this item section
}

if (job.colorConfirmationFiles?.length) {
  // add color confirmation page for this item section
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts src/lib/pdf/__tests__/techpack-template.test.ts
```

Expected: PASS.

---

### Task 5: Full verification

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

- [ ] **Step 3: Manual section flow**

Verify:
- one job still produces one combined PDF
- Standard / Muslimah / Polo are split into separate sections
- section order lists are filtered correctly
- section mockup overrides shared mockup when uploaded
- section artwork cut pieces render only in that section
- section color confirmation renders only in that section

---

## Self-review

- Spec coverage:
  - one combined PDF: Task 4
  - filtered order list per section: Task 4
  - shared mockup with per-section override: Tasks 1 and 4
  - section-only artwork cut pieces: Tasks 1, 2, 3, 4
  - section-only color confirmation: Tasks 1, 2, 3, 4
- No placeholders remain.
- Type consistency:
  - `mockupFiles`
  - `artworkCutPieces`
  - `colorConfirmationFiles`
  - `resolveItemMockup()`

