# WhatsApp Intake Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make pasted WhatsApp orders parse reliably from natural customer formats, surface low-confidence rows in review, auto-label mockups from filenames, capture one placement note, and preview the final combined PDF before download.

**Architecture:** Extend the existing parser with grouped-size heading support and safer fallback behavior, then thread parser confidence, placement notes, and asset roles through the local draft, DB-backed review flow, and PDF generation path. Keep generation server-side and add a preview endpoint that returns the same combined PDF used for download so preview and download stay identical.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Vitest, pdf-lib, existing local storage/upload services

---

## File map

### Existing files to modify

- `src/lib/jobs/parse-whatsapp.ts`
  - Extend parser to understand grouped size headings like `size S`, numbered rows under those headings, and unresolved fallback rows.
- `src/lib/jobs/__tests__/parse-whatsapp.test.ts`
  - Add regression tests for grouped headings, inherited sizes, and fallback behavior.
- `src/lib/jobs/local-jobs.ts`
  - Store placement note plus file role metadata for mockups.
- `src/lib/jobs/editable-job.ts`
  - Add placement note and file role metadata to the editable draft shape and merge logic.
- `src/lib/jobs/job-draft-service.ts`
  - Load persisted file metadata and placement note into the DB-backed editable draft.
- `src/lib/jobs/__tests__/job-draft-service.test.ts`
  - Cover new placement note persistence shape.
- `src/app/api/jobs/[jobId]/route.ts`
  - Validate and save placement note in review updates.
- `src/app/api/jobs/[jobId]/__tests__/job-route.test.ts`
  - Add placement note to PATCH route expectations.
- `src/components/jobs/job-form.tsx`
  - Accept placement note on intake and preserve it in local draft creation.
- `src/components/jobs/review-job-client.tsx`
  - Show unresolved parser rows, placement note editor, and grouped Front/Back/Unassigned mockup sections.
- `src/components/jobs/generation-panel.tsx`
  - Add `Preview PDF` action, pass placement note and asset role data into generation, and open preview in-browser.
- `src/app/api/jobs/[jobId]/generate/route.ts`
  - Include placement note, parsed file roles, and preview mode response support.
- `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
  - Verify preview response and combined PDF still includes all expected sections.
- `src/lib/pdf/techpack-template.ts`
  - Render placement note and front/back/unassigned labels in the tech pack and artwork confirmation page.
- `src/lib/pdf/combine-pdfs.ts`
  - Keep wrapper stable for preview/download parity.

### New files to create

- `src/lib/jobs/mockup-role.ts`
  - Pure helpers for `front/back/unassigned` detection from filenames.
- `src/lib/jobs/__tests__/mockup-role.test.ts`
  - Unit tests for filename role detection.
- `src/app/api/jobs/[jobId]/preview/route.ts`
  - Return the generated combined PDF for inline browser preview.
- `src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts`
  - Route test for preview PDF generation.

---

### Task 1: Add grouped-size parsing with safer fallback rows

**Files:**
- Modify: `src/lib/jobs/parse-whatsapp.ts`
- Test: `src/lib/jobs/__tests__/parse-whatsapp.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Add these cases to `src/lib/jobs/__tests__/parse-whatsapp.test.ts`:

```ts
  it("inherits grouped size headings for numbered rows", () => {
    const result = parseWhatsAppOrder(
      "size S\n1. ALYAA - 13\n2. TIKAH - 04\n\nsize M\n1. AIMI - 21"
    );

    expect(result.roster).toEqual([
      { rowNumber: 1, name: "ALYAA", number: "13", size: "S", qty: 1, remarks: "" },
      { rowNumber: 2, name: "TIKAH", number: "04", size: "S", qty: 1, remarks: "" },
      { rowNumber: 3, name: "AIMI", number: "21", size: "M", qty: 1, remarks: "" }
    ]);

    expect(result.sizeTotals).toEqual({ S: 2, M: 1 });
  });

  it("marks grouped rows without a usable size as needing review", () => {
    const result = parseWhatsAppOrder("1. ALYAA - 13\n2. TIKAH - 04");

    expect(result.roster).toEqual([
      { rowNumber: 1, name: "ALYAA", number: "13", size: "", qty: 1, remarks: "needs_review" },
      { rowNumber: 2, name: "TIKAH", number: "04", size: "", qty: 1, remarks: "needs_review" }
    ]);

    expect(result.sizeTotals).toEqual({});
  });
```

- [ ] **Step 2: Run the parser tests to verify they fail**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/parse-whatsapp.test.ts
```

Expected:

```text
FAIL  src/lib/jobs/__tests__/parse-whatsapp.test.ts
```

- [ ] **Step 3: Implement grouped-size heading detection and fallback rows**

Update `src/lib/jobs/parse-whatsapp.ts` with logic like:

```ts
const GROUP_SIZE_PATTERN = /^size\s+(3XS|2XS|XS|S|M|L|XL|2XL|3XL|4XL|5XL)$/i;
const NUMBERED_ROW_PATTERN = /^\d+\.\s*(.+?)(?:\s*-\s*(\d{1,3}))?$/;

function normalizeHeadingSize(line: string) {
  const match = line.match(GROUP_SIZE_PATTERN);
  return match?.[1]?.replace(/\s+/g, "").toUpperCase() ?? "";
}

function markNeedsReview(remarks: string) {
  return [remarks, "needs_review"].filter(Boolean).join(" ; ");
}

export function parseWhatsAppOrder(message: string) {
  const lines = message
    .split(/\r?\n/)
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const roster: ParsedRosterRow[] = [];
  let activeGroupedSize = "";

  for (const line of lines) {
    const groupedSize = normalizeHeadingSize(line);
    if (groupedSize) {
      activeGroupedSize = groupedSize;
      continue;
    }

    const numbered = line.match(NUMBERED_ROW_PATTERN);
    if (numbered) {
      const name = (numbered[1] ?? "").trim();
      const number = (numbered[2] ?? "").trim();
      const size = activeGroupedSize;

      roster.push({
        rowNumber: roster.length + 1,
        name,
        number,
        size,
        qty: 1,
        remarks: size ? "" : "needs_review"
      });
      continue;
    }

    // existing inline-size parsing continues here
  }

  const sizeTotals = buildSizeTotals(roster.filter((row) => row.size));
  return { roster, sizeTotals };
}
```

- [ ] **Step 4: Run the parser tests to verify they pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/parse-whatsapp.test.ts
```

Expected:

```text
PASS  src/lib/jobs/__tests__/parse-whatsapp.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/lib/jobs/parse-whatsapp.ts src/lib/jobs/__tests__/parse-whatsapp.test.ts
git commit -m "feat: support grouped whatsapp size headings"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 2: Add filename-based mockup role detection

**Files:**
- Create: `src/lib/jobs/mockup-role.ts`
- Test: `src/lib/jobs/__tests__/mockup-role.test.ts`

- [ ] **Step 1: Write the failing role-detection tests**

Create `src/lib/jobs/__tests__/mockup-role.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectMockupRole } from "../mockup-role";

describe("detectMockupRole", () => {
  it("detects front keywords", () => {
    expect(detectMockupRole("jersey-front.png")).toBe("front");
    expect(detectMockupRole("design-depan.jpg")).toBe("front");
  });

  it("detects back keywords", () => {
    expect(detectMockupRole("jersey-back.png")).toBe("back");
    expect(detectMockupRole("design-belakang.jpg")).toBe("back");
  });

  it("leaves unclear filenames unassigned", () => {
    expect(detectMockupRole("mockup-final.png")).toBe("unassigned");
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/mockup-role.test.ts
```

Expected:

```text
FAIL  src/lib/jobs/__tests__/mockup-role.test.ts
```

- [ ] **Step 3: Implement the role detection helper**

Create `src/lib/jobs/mockup-role.ts`:

```ts
export type MockupRole = "front" | "back" | "unassigned";

const FRONT_KEYWORDS = ["front", "depan"];
const BACK_KEYWORDS = ["back", "belakang"];

function normalizeFilename(name: string) {
  return name.toLowerCase().replace(/[_\-.]+/g, " ");
}

export function detectMockupRole(name: string): MockupRole {
  const normalized = normalizeFilename(name);

  if (FRONT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "front";
  }

  if (BACK_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "back";
  }

  return "unassigned";
}
```

- [ ] **Step 4: Run the role tests to verify they pass**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/mockup-role.test.ts
```

Expected:

```text
PASS  src/lib/jobs/__tests__/mockup-role.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/lib/jobs/mockup-role.ts src/lib/jobs/__tests__/mockup-role.test.ts
git commit -m "feat: infer front and back mockup roles"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 3: Thread placement note and mockup role metadata through draft models

**Files:**
- Modify: `src/lib/jobs/local-jobs.ts`
- Modify: `src/lib/jobs/editable-job.ts`
- Modify: `src/lib/jobs/job-draft-service.ts`
- Test: `src/lib/jobs/__tests__/job-draft-service.test.ts`

- [ ] **Step 1: Write the failing draft-service expectation**

Add this assertion to `src/lib/jobs/__tests__/job-draft-service.test.ts`:

```ts
    expect(dbMocks.jobUpdate).toHaveBeenCalledWith({
      where: { id: "job_123" },
      data: expect.objectContaining({
        productionNotes: "Use gold thread",
        placementNote: "left chest logo, sponsor center",
        status: "REVIEW_READY"
      })
    });
```

And update the test input:

```ts
      placementNote: "left chest logo, sponsor center",
```

- [ ] **Step 2: Run the draft-service test to verify it fails**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts
```

Expected:

```text
FAIL  src/lib/jobs/__tests__/job-draft-service.test.ts
```

- [ ] **Step 3: Extend the draft models and service**

Update `src/lib/jobs/local-jobs.ts`:

```ts
export type LocalAssetFile = {
  name: string;
  dataUrl: string;
  role?: "front" | "back" | "unassigned";
};

export type LocalJobDraft = {
  id: string;
  projectName: string;
  placementNote?: string;
  mockupFiles: LocalAssetFile[];
  // existing fields stay in place
};
```

Update `src/lib/jobs/editable-job.ts`:

```ts
export const editableJobDraftSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  placementNote: z.string().optional().default(""),
  // existing fields...
});
```

Update `src/lib/jobs/job-draft-service.ts`:

```ts
  return {
    id: job.id,
    projectName: job.projectName,
    placementNote: job.colorNotes ?? "",
    mockupFiles: mockupFiles.map((file) => ({
      ...file,
      role: detectMockupRole(file.name)
    })),
    // existing fields...
  };
```

and:

```ts
  await db.job.update({
    where: { id: jobId },
    data: {
      projectName: input.projectName,
      colorNotes: input.placementNote,
      productionNotes: input.productionNotes,
      status: "REVIEW_READY"
    }
  });
```

- [ ] **Step 4: Run the draft-service test to verify it passes**

Run:

```powershell
npm test -- src/lib/jobs/__tests__/job-draft-service.test.ts
```

Expected:

```text
PASS  src/lib/jobs/__tests__/job-draft-service.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/lib/jobs/local-jobs.ts src/lib/jobs/editable-job.ts src/lib/jobs/job-draft-service.ts src/lib/jobs/__tests__/job-draft-service.test.ts
git commit -m "feat: add placement note and mockup role draft data"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 4: Save placement note through the review API

**Files:**
- Modify: `src/app/api/jobs/[jobId]/route.ts`
- Test: `src/app/api/jobs/[jobId]/__tests__/job-route.test.ts`

- [ ] **Step 1: Write the failing PATCH route expectation**

Update `src/app/api/jobs/[jobId]/__tests__/job-route.test.ts`:

```ts
      body: JSON.stringify({
        projectName: "Kraxtom FC",
        placementNote: "left chest logo, sponsor center",
        category: "Sublimation",
        roster: [{ rowNumber: 1, name: "Azlan", number: "14", size: "M", qty: 2, remarks: "Captain" }]
      })
```

and:

```ts
        placementNote: "left chest logo, sponsor center",
```

- [ ] **Step 2: Run the PATCH route test to verify it fails**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

Expected:

```text
FAIL  src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

- [ ] **Step 3: Ensure the route accepts and forwards placement note**

Update `src/app/api/jobs/[jobId]/route.ts` if needed so it still parses the schema and forwards the new field:

```ts
    await updateJobDraft(jobId, {
      ...parsed.data,
      placementNote: parsed.data.placementNote ?? ""
    });
```

If the current route already forwards the full parsed object, keep it unchanged and only confirm the schema includes `placementNote`.

- [ ] **Step 4: Run the PATCH route test to verify it passes**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

Expected:

```text
PASS  src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/app/api/jobs/[jobId]/route.ts src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
git commit -m "feat: save placement note in review api"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 5: Surface parser warnings and placement note in the review UI

**Files:**
- Modify: `src/components/jobs/review-job-client.tsx`

- [ ] **Step 1: Write a small UI expectation test or snapshot if the project already uses component tests**

If the project keeps UI testing light, add a simple component test in `src/components/jobs/review-job-client.test.tsx`:

```ts
it("shows needs review rows and placement note field", () => {
  render(<ReviewJobClient jobId="job_123" />);
  expect(screen.getByLabelText("Placement note")).toBeInTheDocument();
});
```

If adding a new UI test would be noisy in this codebase, document this task as manual verification and continue.

- [ ] **Step 2: Implement review UI changes**

Update `src/components/jobs/review-job-client.tsx`:

```tsx
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">Placement note</span>
            <textarea
              value={job.placementNote ?? ""}
              onChange={(event) => updateField("placementNote", event.target.value)}
              className="min-h-24 w-full rounded-md border px-3 py-2"
            />
          </label>
```

Add warning styling for unresolved rows:

```tsx
            <div
              key={row.rowNumber}
              className={`grid gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                row.remarks?.includes("needs_review") ? "border-amber-300 bg-amber-50" : ""
              }`}
            >
```

Add grouped mockup display:

```tsx
const frontMockups = (job.mockupFiles ?? []).filter((file) => file.role === "front");
const backMockups = (job.mockupFiles ?? []).filter((file) => file.role === "back");
const unassignedMockups = (job.mockupFiles ?? []).filter((file) => file.role === "unassigned");
```

Render those groups in separate sections with headings `Front`, `Back`, and `Unassigned`.

- [ ] **Step 3: Ensure save sends placement note**

Keep the PATCH body in `onSave()` aligned:

```ts
          placementNote: localDraft.placementNote ?? "",
```

- [ ] **Step 4: Run the relevant tests**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/__tests__/job-route.test.ts
```

If you added a component test, run it too:

```powershell
npm test -- src/components/jobs/review-job-client.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/components/jobs/review-job-client.tsx
git commit -m "feat: show placement note and parser review warnings"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 6: Add preview endpoint for the final combined PDF

**Files:**
- Create: `src/app/api/jobs/[jobId]/preview/route.ts`
- Create: `src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts`
- Modify: `src/app/api/jobs/[jobId]/generate/route.ts`

- [ ] **Step 1: Write the failing preview route test**

Create `src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateMocks = vi.hoisted(() => ({
  POST: vi.fn()
}));

vi.mock("../../generate/route", () => ({
  POST: generateMocks.POST
}));

import { GET } from "../route";

describe("GET /api/jobs/[jobId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMocks.POST.mockResolvedValue(
      Response.json({
        files: [
          {
            key: "combined",
            name: "supplier-techpack-order-sheet.pdf",
            mimeType: "application/pdf",
            size: 4,
            base64: Buffer.from("%PDF-").toString("base64")
          }
        ]
      })
    );
  });

  it("returns the combined PDF for inline preview", async () => {
    const response = await GET(new Request("http://localhost/api/jobs/job_123/preview"), {
      params: Promise.resolve({ jobId: "job_123" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });
});
```

- [ ] **Step 2: Run the preview route test to verify it fails**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts
```

Expected:

```text
FAIL  src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts
```

- [ ] **Step 3: Implement the preview route**

Create `src/app/api/jobs/[jobId]/preview/route.ts`:

```ts
import { GET as unsupported } from "http";
import { POST as generatePdf } from "../../generate/route";

function decodeBase64(base64: string) {
  return Buffer.from(base64, "base64");
}

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const generationResponse = await generatePdf(request, { params });
  const body = await generationResponse.json();

  const combined = (body.files ?? []).find((file: { key: string }) => file.key === "combined");
  if (!combined) {
    return Response.json({ error: "Combined PDF not found" }, { status: 404 });
  }

  return new Response(decodeBase64(combined.base64), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${combined.name}"`
    }
  });
}
```

Remove the accidental `unsupported` import if your editor adds it; the final file should import only the generate route helper.

- [ ] **Step 4: Run the preview route test to verify it passes**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts
```

Expected:

```text
PASS  src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/app/api/jobs/[jobId]/preview/route.ts src/app/api/jobs/[jobId]/preview/__tests__/route.test.ts
git commit -m "feat: add inline preview route for combined pdf"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 7: Add preview UI and pass placement note through generation

**Files:**
- Modify: `src/components/jobs/generation-panel.tsx`
- Modify: `src/app/api/jobs/[jobId]/generate/route.ts`
- Test: `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`

- [ ] **Step 1: Write the failing generation test for preview-ready fields**

Extend `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`:

```ts
    const request = new Request("http://localhost/api/jobs/job_457/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectName: "Mockup Job",
        placementNote: "left chest logo, sponsor center",
        brandName: "Broskyy Sports",
        category: "Sublimation",
        roster: [{ name: "Abu", size: "L", qty: 1 }],
        artworkFiles: [],
        mockupFiles: [
          {
            name: "front.png",
            dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
            role: "front"
          }
        ]
      })
    });
```

and keep asserting the combined PDF page count and success status.

- [ ] **Step 2: Run the generation route test to verify it fails**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

Expected:

```text
FAIL  src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

- [ ] **Step 3: Pass placement note and preview action through generation**

Update `src/app/api/jobs/[jobId]/generate/route.ts`:

```ts
const jobInputSchema = z.object({
  projectName: z.string(),
  placementNote: z.string().optional().nullable(),
  // existing fields...
});
```

and thread it through:

```ts
    placementNote: preferString(primary.placementNote, fallback.placementNote),
```

and into `buildTechpackPdf()`:

```ts
      placementNote: job.placementNote,
```

Update `src/components/jobs/generation-panel.tsx`:

```tsx
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
```

Add preview action:

```tsx
  async function onPreview() {
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/preview`, {
      method: "GET"
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? `Preview failed (${response.status})`);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
  }
```

Render the preview:

```tsx
        <button
          type="button"
          onClick={onPreview}
          className="w-full rounded-md border px-4 py-3"
        >
          Preview PDF
        </button>
```

and:

```tsx
      {previewUrl ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold">PDF preview</h3>
          <iframe src={previewUrl} className="mt-3 h-[720px] w-full rounded-md border" title="Combined PDF preview" />
        </div>
      ) : null}
```

- [ ] **Step 4: Run the generation test to verify it passes**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

Expected:

```text
PASS  src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/components/jobs/generation-panel.tsx src/app/api/jobs/[jobId]/generate/route.ts src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
git commit -m "feat: preview final combined supplier pdf"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 8: Render placement note and labeled mockups in the supplier PDF

**Files:**
- Modify: `src/lib/pdf/techpack-template.ts`
- Test: `src/lib/pdf/__tests__/techpack-template.test.ts`

- [ ] **Step 1: Write the failing PDF test**

Extend `src/lib/pdf/__tests__/techpack-template.test.ts`:

```ts
  it("adds artwork confirmation content and keeps placement note visible", async () => {
    const pdfBytes = await buildTechpackPdf({
      projectName: "Golden BC",
      brandName: "Broskyy Sports",
      category: "Sublimation",
      placementNote: "left chest logo, sponsor center",
      mockupFiles: [
        {
          name: "front.png",
          dataUrl: `data:image/png;base64,${SAMPLE_PNG_BASE64}`,
          role: "front"
        }
      ]
    });

    const pdf = await PDFDocument.load(new Uint8Array(pdfBytes));
    expect(pdf.getPageCount()).toBe(2);
  });
```

- [ ] **Step 2: Run the PDF test to verify it fails**

Run:

```powershell
npm test -- src/lib/pdf/__tests__/techpack-template.test.ts
```

Expected:

```text
FAIL  src/lib/pdf/__tests__/techpack-template.test.ts
```

- [ ] **Step 3: Implement placement note and label rendering**

Update the tech pack input type in `src/lib/pdf/techpack-template.ts`:

```ts
type MockupFileInput = {
  name: string;
  dataUrl: string;
  role?: "front" | "back" | "unassigned";
};

export type TechpackJobInput = {
  projectName: string;
  brandName?: string | null;
  placementNote?: string | null;
  mockupFiles?: MockupFileInput[];
  logoFiles?: MockupFileInput[];
  // existing fields...
};
```

Render placement note on the main page:

```ts
    page.drawText("PLACEMENT NOTE :", {
      x: 18,
      y: 94,
      size: 12,
      font: titleFont
    });
    page.drawText(toPdfSafeText(job.placementNote ?? "", 90) || "-", {
      x: 160,
      y: 94,
      size: 11,
      font: bodyFont,
      maxWidth: 400
    });
```

Render role-based slot labels on artwork confirmation page:

```ts
      const label =
        file.role === "front" ? "FRONT" : file.role === "back" ? "BACK" : "UNASSIGNED";
```

and use:

```ts
      artworkPage.drawText(label, {
        x: slot.x + 12,
        y: slot.y + slot.height - 18,
        size: 10,
        font: titleFont
      });
```

- [ ] **Step 4: Run the PDF test to verify it passes**

Run:

```powershell
npm test -- src/lib/pdf/__tests__/techpack-template.test.ts
```

Expected:

```text
PASS  src/lib/pdf/__tests__/techpack-template.test.ts
```

- [ ] **Step 5: Record progress**

If git is available:

```powershell
git add src/lib/pdf/techpack-template.ts src/lib/pdf/__tests__/techpack-template.test.ts
git commit -m "feat: show placement note and mockup role labels in techpack"
```

If git is not available, note completion in the task tracker and continue.

---

### Task 9: Run the full regression suite and do manual verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full automated test suite**

Run:

```powershell
npm test
```

Expected:

```text
Test Files  passed
Tests       passed
```

- [ ] **Step 2: Run the app and manually verify the workflow**

Run:

```powershell
node .\node_modules\next\dist\bin\next dev -p 3011
```

Manual checklist:

- Paste a grouped-size WhatsApp order like:

```text
size S
1. ALYAA - 13
2. TIKAH - 04

size M
1. AIMI - 21
```

- Confirm review shows:
  - inherited sizes on the player rows
  - no fake `size` roster rows
  - correct totals
- Upload files named:
  - `team-front.png`
  - `team-back.png`
  - `mockup-final.png`
- Confirm review groups them as:
  - `Front`
  - `Back`
  - `Unassigned`
- Add a placement note and save.
- Open `Generate`.
- Click `Preview PDF`.
- Confirm the iframe shows the final combined PDF and that the note, branding, and artwork page look correct.

- [ ] **Step 3: Record final progress**

If git is available:

```powershell
git add .
git commit -m "feat: add whatsapp intake automation flow"
```

If git is not available, record the completed verification and implementation notes in the delivery summary.

---

## Self-review

### Spec coverage

Covered requirements:

- grouped size heading parsing: Task 1
- safer review behavior for unresolved rows: Tasks 1 and 5
- filename-based front/back detection: Task 2
- one placement note per job: Tasks 3, 4, 5, 7, 8
- final combined PDF preview in-browser: Tasks 6 and 7

No spec gaps remain for the scoped feature.

### Placeholder scan

No `TBD`, `TODO`, or “implement later” placeholders remain. Code-bearing steps include concrete snippets or explicit route/component changes.

### Type consistency

Names used consistently across tasks:

- `placementNote`
- `detectMockupRole()`
- `MockupRole`
- preview route key `combined`

The plan keeps the same field names across parser, review, generation, and PDF rendering.

