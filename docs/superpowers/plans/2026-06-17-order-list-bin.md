# Order List and Bin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add order list actions for view, edit, soft delete to bin, restore from bin, and permanent delete from bin.

**Architecture:** Extend the current jobs list from local-storage-only display to a DB-backed list with a soft-delete state, while keeping the existing review route for both viewing and editing. Add a separate bin view that filters deleted jobs and exposes restore/permanent-delete actions through dedicated API endpoints.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, Vitest

---

## File map

**Modify:**
- `prisma/schema.prisma`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/__tests__/jobs-route.test.ts`
- `src/components/jobs/jobs-list.tsx`
- `src/app/jobs/page.tsx`

**Create:**
- `src/app/api/jobs/[jobId]/trash/route.ts`
- `src/app/api/jobs/[jobId]/trash/__tests__/route.test.ts`
- `src/app/jobs/bin/page.tsx`
- `src/components/jobs/bin-list.tsx`

---

### Task 1: Add soft-delete field to job model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add soft-delete field**

Update `Job` model:

```prisma
model Job {
  id              String            @id @default(cuid())
  projectName     String
  customerName    String?
  category        String?
  material        String?
  collarType      String?
  cuttingType     String?
  colorNotes      String?
  sourceMessage   String?
  productionNotes String?
  status          JobStatus         @default(DRAFT)
  deletedAt       DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  ownerId         String
  owner           User              @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  rosterItems     RosterItem[]
  files           UploadedFile[]
  outputs         GeneratedOutput[]
}
```

- [ ] **Step 2: Generate migration**

Run:

```powershell
npx prisma migrate dev --name add-job-soft-delete
```

Expected: migration created successfully.

---

### Task 2: List active jobs from DB

**Files:**
- Modify: `src/app/api/jobs/route.ts`
- Modify: `src/app/api/jobs/__tests__/jobs-route.test.ts`

- [ ] **Step 1: Write failing GET route test**

Add to `jobs-route.test.ts`:

```ts
it("lists only active jobs", async () => {
  dbMocks.jobFindMany.mockResolvedValueOnce([
    { id: "job_1", projectName: "Active Job", createdAt: new Date("2026-06-17T10:00:00.000Z"), deletedAt: null },
    { id: "job_2", projectName: "Deleted Job", createdAt: new Date("2026-06-17T11:00:00.000Z"), deletedAt: new Date("2026-06-17T12:00:00.000Z") }
  ]);

  const response = await GET();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual([
    expect.objectContaining({ id: "job_1", projectName: "Active Job" })
  ]);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm test -- src/app/api/jobs/__tests__/jobs-route.test.ts
```

Expected: FAIL because `GET` does not exist yet.

- [ ] **Step 3: Implement GET active jobs route**

In `src/app/api/jobs/route.ts` add:

```ts
export async function GET() {
  try {
    const jobs = await db.job.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(jobs, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run:

```powershell
npm test -- src/app/api/jobs/__tests__/jobs-route.test.ts
```

Expected: PASS.

---

### Task 3: Add trash/restore/permanent-delete API

**Files:**
- Create: `src/app/api/jobs/[jobId]/trash/route.ts`
- Create: `src/app/api/jobs/[jobId]/trash/__tests__/route.test.ts`

- [ ] **Step 1: Write failing trash route tests**

Create `route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  jobUpdate: vi.fn(),
  jobDelete: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {
    job: {
      update: dbMocks.jobUpdate,
      delete: dbMocks.jobDelete
    }
  }
}));

import { DELETE, PATCH } from "../route";

describe("job trash route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves a job to bin", async () => {
    dbMocks.jobUpdate.mockResolvedValueOnce({ id: "job_1" });
    const response = await DELETE(new Request("http://localhost/api/jobs/job_1/trash"), {
      params: Promise.resolve({ jobId: "job_1" })
    });
    expect(response.status).toBe(200);
  });

  it("restores a job from bin", async () => {
    dbMocks.jobUpdate.mockResolvedValueOnce({ id: "job_1" });
    const response = await PATCH(new Request("http://localhost/api/jobs/job_1/trash"), {
      params: Promise.resolve({ jobId: "job_1" })
    });
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/trash/__tests__/route.test.ts
```

Expected: FAIL because route file does not exist.

- [ ] **Step 3: Implement trash route**

Create `src/app/api/jobs/[jobId]/trash/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  try {
    await db.job.update({
      where: { id: jobId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  try {
    await db.job.update({
      where: { id: jobId },
      data: { deletedAt: null }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  try {
    await db.job.delete({ where: { id: jobId } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
npm test -- src/app/api/jobs/[jobId]/trash/__tests__/route.test.ts
```

Expected: PASS.

---

### Task 4: Replace jobs list with DB-backed cards + actions

**Files:**
- Modify: `src/components/jobs/jobs-list.tsx`
- Modify: `src/app/jobs/page.tsx`

- [ ] **Step 1: Implement DB-backed loading**

Update `jobs-list.tsx` to fetch active jobs from `/api/jobs`:

```tsx
type JobListItem = {
  id: string;
  projectName: string;
  createdAt: string;
};

useEffect(() => {
  let isMounted = true;

  async function loadJobs() {
    const response = await fetch("/api/jobs", { cache: "no-store" });
    const body = response.ok ? await response.json() : [];
    if (isMounted) setJobs(body);
  }

  void loadJobs();

  return () => {
    isMounted = false;
  };
}, []);
```

- [ ] **Step 2: Render actions**

Replace card content:

```tsx
<div key={job.id} className="rounded-xl border bg-white p-4 shadow-sm">
  <p className="text-base font-semibold">{job.projectName}</p>
  <p className="mt-1 text-xs text-neutral-500">
    {new Date(job.createdAt).toLocaleString()}
  </p>
  <div className="mt-3 flex gap-2">
    <Link href={`/jobs/${job.id}/review`} className="rounded-md border px-3 py-2 text-sm">
      View
    </Link>
    <Link href={`/jobs/${job.id}/review`} className="rounded-md border px-3 py-2 text-sm">
      Edit
    </Link>
    <button
      type="button"
      onClick={() => moveToBin(job.id)}
      className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
    >
      Delete
    </button>
  </div>
</div>
```

- [ ] **Step 3: Implement moveToBin**

Add:

```tsx
async function moveToBin(jobId: string) {
  const response = await fetch(`/api/jobs/${jobId}/trash`, { method: "DELETE" });
  if (!response.ok) return;
  setJobs((current) => current.filter((job) => job.id !== jobId));
}
```

- [ ] **Step 4: Add Bin button to Jobs page**

In `src/app/jobs/page.tsx`:

```tsx
<div className="flex items-center gap-2">
  <Link href="/jobs/bin" className="rounded-md border px-4 py-2">
    Bin
  </Link>
  <Link href="/jobs/new" className="rounded-md bg-black px-4 py-2 text-white">
    New job
  </Link>
</div>
```

- [ ] **Step 5: Run existing jobs route tests**

Run:

```powershell
npm test -- src/app/api/jobs/__tests__/jobs-route.test.ts
```

Expected: PASS.

---

### Task 5: Add Bin page with restore and permanent delete

**Files:**
- Create: `src/app/jobs/bin/page.tsx`
- Create: `src/components/jobs/bin-list.tsx`

- [ ] **Step 1: Implement bin page**

Create `src/app/jobs/bin/page.tsx`:

```tsx
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { BinList } from "@/components/jobs/bin-list";

export default function BinPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Bin</h1>
          <Link href="/jobs" className="rounded-md border px-4 py-2">
            Back to jobs
          </Link>
        </div>
        <BinList />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Implement bin list**

Create `src/components/jobs/bin-list.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

type JobListItem = {
  id: string;
  projectName: string;
  createdAt: string;
  deletedAt: string | null;
};

export function BinList() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      const response = await fetch("/api/jobs?scope=bin", { cache: "no-store" });
      const body = response.ok ? await response.json() : [];
      if (isMounted) setJobs(body);
    }

    void loadJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  async function restore(jobId: string) {
    const response = await fetch(`/api/jobs/${jobId}/trash`, { method: "PATCH" });
    if (!response.ok) return;
    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  async function removePermanently(jobId: string) {
    const confirmed = window.confirm("Delete permanently?");
    if (!confirmed) return;

    const response = await fetch(`/api/jobs/${jobId}/trash`, { method: "POST" });
    if (!response.ok) return;
    setJobs((current) => current.filter((job) => job.id !== jobId));
  }

  if (!jobs.length) {
    return <EmptyState title="Bin is empty" description="Deleted jobs will appear here." />;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-base font-semibold">{job.projectName}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(job.deletedAt ?? job.createdAt).toLocaleString()}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => restore(job.id)} className="rounded-md border px-3 py-2 text-sm">
              Restore
            </button>
            <button
              type="button"
              onClick={() => removePermanently(job.id)}
              className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
            >
              Delete permanently
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Extend jobs GET scope**

Update `src/app/api/jobs/route.ts`:

```ts
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const jobs = await db.job.findMany({
      where: scope === "bin" ? { deletedAt: { not: null } } : { deletedAt: null },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(jobs, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run API tests**

Run:

```powershell
npm test -- src/app/api/jobs/__tests__/jobs-route.test.ts src/app/api/jobs/[jobId]/trash/__tests__/route.test.ts
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

- [ ] **Step 3: Manual flow**

Verify:
- `/jobs` shows View/Edit/Delete
- Delete removes from Jobs and sends to Bin
- `/jobs/bin` shows deleted orders
- Restore removes from Bin and returns order to `/jobs`
- Permanent delete only appears in Bin and asks for confirmation

---

## Self-review

- Spec coverage: Jobs list actions, Bin page, soft delete, restore, permanent delete are all covered.
- No placeholders remain.
- Types and route names are consistent: `/api/jobs`, `/api/jobs/[jobId]/trash`, `/jobs/bin`.

