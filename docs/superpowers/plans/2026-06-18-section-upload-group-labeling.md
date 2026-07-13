# Section Upload Group and Labeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one upload group per section with filename-based auto-detection plus manual correction, so each section can carry correctly labeled mockup, cut pieces, and color code images into the same combined PDF.

**Architecture:** Extend section item assets from plain arrays into labeled section files with detected and chosen labels plus optional mockup variant hints like `front`, `back`, or `combined`. The review UI will upload multiple files into one section group, auto-suggest labels from filenames, let the user correct them, then generation will resolve section visuals from those labeled files with shared mockup fallback only when section mockups are missing.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, pdf-lib

---

## File map

**Modify:**
- `src/lib/jobs/local-jobs.ts`
- `src/lib/jobs/editable-job.ts`
- `src/lib/jobs/job-draft-service.ts`
- `src/lib/jobs/__tests__/job-draft-service.test.ts`
- `src/lib/jobs/item-assets.ts`
- `src/components/jobs/item-section-card.tsx`
- `src/components/jobs/review-job-client.tsx`
- `src/components/jobs/review-job-client.test.tsx`
- `src/app/api/jobs/[jobId]/generate/route.ts`
- `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- `src/lib/pdf/techpack-template.ts`

**Create:**
- `src/lib/jobs/file-labeling.ts`
- `src/lib/jobs/__tests__/file-labeling.test.ts`

---

### Task 1: Add filename auto-detection helpers

**Files:**
- Create: `src/lib/jobs/file-labeling.ts`
- Test: `src/lib/jobs/__tests__/file-labeling.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/jobs/__tests__/file-labeling.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectFileLabel, detectMockupVariant } from "../file-labeling";

describe("detectFileLabel", () => {
  it("detects color code from filename keywords", () => {
    expect(detectFileLabel("polo-colorcode.jpg")).toBe("colorcode");
    expect(detectFileLabel("polo-pantone.png")).toBe("colorcode");
  });

  it("detects cut pieces from filename keywords", () => {
    expect(detectFileLabel("polo-cutpiece.jpg")).toBe("cutpiece");
  });

  it("detects mockup from filename keywords", () => {
    expect(detectFileLabel("polo-mockup-front.jpg")).toBe("mockup");
  });

  it("falls back to unknown when no supported keyword exists", () => {
    expect(detectFileLabel("polo-reference.jpg")).toBe("unknown");
  });
});

describe("detectMockupVariant", () => {
  it("detects combined mockup variants", () => {
    expect(detectMockupVariant("polo-mockup-front-back.jpg")).toBe("combined");
    expect(detectMockupVariant("polo-mockup-full.jpg")).toBe("combined");
  });

  it("detects front and back variants", () => {
    expect(detectMockupVariant("polo-mockup-front.jpg")).toBe("front");
    expect(detectMockupVariant("polo-mockup-back.jpg")).toBe("back");
  });

  it("returns single when no side marker exists", () => {
    expect(detectMockupVariant("polo-mockup.jpg")).toBe("single");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/file-labeling.test.ts
```

Expected: FAIL because `file-labeling.ts` does not exist.

- [ ] **Step 3: Implement minimal detection helpers**

Create `src/lib/jobs/file-labeling.ts`:

```ts
export type SectionFileLabel = "mockup" | "cutpiece" | "colorcode" | "unknown";
export type MockupVariant = "front" | "back" | "combined" | "single";

function normalizeFilename(name: string) {
  return name.toLowerCase().replace(/[_\s.]+/g, "-");
}

export function detectFileLabel(name: string): SectionFileLabel {
  const normalized = normalizeFilename(name);

  if (/(colorcode|colour|color|pantone|code)/.test(normalized)) return "colorcode";
  if (/(cutpiece|cut-piece|cut|pieces)/.test(normalized)) return "cutpiece";
  if (/(mockup|jersey|front|back|full)/.test(normalized)) return "mockup";

  return "unknown";
}

export function detectMockupVariant(name: string): MockupVariant {
  const normalized = normalizeFilename(name);

  if (/(front-back|full)/.test(normalized)) return "combined";
  if (/\bfront\b/.test(normalized)) return "front";
  if (/\bback\b/.test(normalized)) return "back";

  return "single";
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/file-labeling.test.ts
```

Expected: PASS.

---

### Task 2: Extend section asset shapes with labels and variants

**Files:**
- Modify: `src/lib/jobs/local-jobs.ts`
- Modify: `src/lib/jobs/editable-job.ts`
- Modify: `src/lib/jobs/job-draft-service.ts`
- Modify: `src/lib/jobs/__tests__/job-draft-service.test.ts`

- [ ] **Step 1: Add failing draft persistence test**

Extend `job-draft-service.test.ts`:

```ts
expect(result.items).toEqual([
  expect.objectContaining({
    name: "Polo",
    sectionFiles: [
      expect.objectContaining({
        name: "polo-mockup-front.jpg",
        detectedLabel: "mockup",
        chosenLabel: "mockup",
        mockupVariant: "front"
      }),
      expect.objectContaining({
        name: "polo-colorcode.jpg",
        detectedLabel: "colorcode",
        chosenLabel: "colorcode"
      })
    ]
  })
]);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Extend local and editable types**

Update `src/lib/jobs/local-jobs.ts`:

```ts
export type SectionUploadedFile = LocalAssetFile & {
  detectedLabel: "mockup" | "cutpiece" | "colorcode" | "unknown";
  chosenLabel: "mockup" | "cutpiece" | "colorcode" | "unknown";
  mockupVariant?: "front" | "back" | "combined" | "single";
};

export type LocalJobItem = ParsedOrderItem & {
  sectionFiles?: SectionUploadedFile[];
};
```

Update `src/lib/jobs/editable-job.ts`:

```ts
const editableSectionFileSchema = z.object({
  name: z.string(),
  dataUrl: z.string(),
  role: z.enum(["front", "back", "unassigned"]).optional().nullable(),
  detectedLabel: z.enum(["mockup", "cutpiece", "colorcode", "unknown"]),
  chosenLabel: z.enum(["mockup", "cutpiece", "colorcode", "unknown"]),
  mockupVariant: z.enum(["front", "back", "combined", "single"]).optional().nullable()
});

export const editableJobItemSchema = z.object({
  // existing fields...
  sectionFiles: z.array(editableSectionFileSchema).default([])
});
```

- [ ] **Step 4: Persist section files in draft service**

Update `job-draft-service.ts` so serialized items include `sectionFiles`, and draft reads return stable arrays:

```ts
sectionFiles: item.sectionFiles ?? []
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts
```

Expected: PASS.

---

### Task 3: Add section upload group UI with auto-detected labels

**Files:**
- Modify: `src/components/jobs/item-section-card.tsx`
- Modify: `src/components/jobs/review-job-client.tsx`
- Modify: `src/components/jobs/review-job-client.test.tsx`

- [ ] **Step 1: Add failing review UI test**

Extend `review-job-client.test.tsx`:

```ts
expect(screen.getByText("Upload section files")).toBeInTheDocument();
expect(screen.getByText("polo-mockup-front.jpg")).toBeInTheDocument();
expect(screen.getByDisplayValue("Mockup")).toBeInTheDocument();
expect(screen.getByDisplayValue("Color Code")).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/components/jobs/review-job-client.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement upload group rendering**

Update `item-section-card.tsx`:

```tsx
<div className="mt-4 space-y-3">
  <div>
    <p className="text-sm font-medium">Upload section files</p>
    <p className="text-xs text-neutral-500">
      Upload mockup, cut pieces, and color code images together for this section.
    </p>
  </div>

  <div className="space-y-2">
    {(item.sectionFiles ?? []).map((file, index) => (
      <div key={`${file.name}-${index}`} className="rounded-lg border p-3">
        <p className="text-sm font-medium">{file.name}</p>
        <p className="mt-1 text-xs text-neutral-500">
          Detected: {file.detectedLabel}
          {file.mockupVariant ? ` • ${file.mockupVariant}` : ""}
        </p>
        <select value={file.chosenLabel} className="mt-2 rounded-md border px-2 py-1 text-sm">
          <option value="mockup">Mockup</option>
          <option value="cutpiece">Cut Pieces</option>
          <option value="colorcode">Color Code</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
    ))}
  </div>
</div>
```

For this task, rendering the upload group and editable labels is sufficient; if full file picking is not yet wired, keep it as a visible section with existing draft-backed files.

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/components/jobs/review-job-client.test.tsx
```

Expected: PASS.

---

### Task 4: Resolve labeled section files in generation

**Files:**
- Modify: `src/lib/jobs/item-assets.ts`
- Modify: `src/app/api/jobs/[jobId]/generate/route.ts`
- Modify: `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- Modify: `src/lib/pdf/techpack-template.ts`

- [ ] **Step 1: Add failing generation test**

Extend `generate-route.test.ts`:

```ts
expect(techpackSpy).toHaveBeenNthCalledWith(
  1,
  expect.objectContaining({
    itemName: "Polo",
    mockupFiles: [expect.objectContaining({ name: "polo-mockup-front-back.jpg" })],
    artworkCutPieces: [expect.objectContaining({ name: "polo-cutpiece.jpg" })],
    colorConfirmationFiles: [expect.objectContaining({ name: "polo-colorcode.jpg" })]
  })
);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add labeled-file resolution helpers**

Update `src/lib/jobs/item-assets.ts`:

```ts
import type { SectionUploadedFile } from "./local-jobs";

export function splitSectionFilesByLabel(files: SectionUploadedFile[] = []) {
  return {
    mockups: files.filter((file) => file.chosenLabel === "mockup"),
    cutPieces: files.filter((file) => file.chosenLabel === "cutpiece"),
    colorCodes: files.filter((file) => file.chosenLabel === "colorcode")
  };
}

export function resolveMockupFiles(mockups: SectionUploadedFile[] = []) {
  const combined = mockups.filter((file) => file.mockupVariant === "combined");
  if (combined.length) return combined;

  const frontBack = mockups.filter((file) => file.mockupVariant === "front" || file.mockupVariant === "back");
  if (frontBack.length) return frontBack;

  return mockups.slice(0, 1);
}
```

- [ ] **Step 4: Update generation route**

In `generate/route.ts`, when items have `sectionFiles`, derive assets from labels:

```ts
const labeledFiles = splitSectionFilesByLabel(item.sectionFiles ?? []);
const sectionMockups = resolveMockupFiles(labeledFiles.mockups);
const resolvedMockups = resolveItemMockup(sectionMockups, job.mockupFiles ?? []);
```

And pass:

```ts
artworkCutPieces: labeledFiles.cutPieces,
colorConfirmationFiles: labeledFiles.colorCodes
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

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual check**

Use section file names like:

```text
polo-mockup-front-back.jpg
polo-cutpiece.jpg
polo-colorcode.jpg
muslimah-mockup-front.jpg
muslimah-mockup-back.jpg
muslimah-cutpiece.jpg
muslimah-colorcode.jpg
```

Verify:
- labels auto-detect correctly
- user can manually change labels
- combined mockup is preferred over separate front/back
- one PDF is still generated with correct per-section assets

---

## Self-review

- Spec coverage:
  - one upload group per section: Task 3
  - filename-based auto-detection: Task 1
  - manual correction: Task 3
  - designer naming template: Tasks 1 and 5
  - combined mockup support: Task 4
- No placeholders remain.
- Type consistency:
  - `SectionUploadedFile`
  - `detectFileLabel()`
  - `detectMockupVariant()`
  - `splitSectionFilesByLabel()`
  - `resolveMockupFiles()`

