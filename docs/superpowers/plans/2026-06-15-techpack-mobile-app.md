# Tech Pack Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app that lets the user paste WhatsApp order text, upload job assets, review extracted order data, and generate supplier tech packs, order sheets, and archive-ready job folders.

**Architecture:** Use a Next.js full-stack app with a mobile-first UI, a database-backed job record, file uploads for order assets, a parser that turns WhatsApp text into draft roster data, a review screen for correcting extracted fields, and a document generator that renders PDF outputs from reusable templates. Keep design creation outside the app; the app manages intake, structure, review, and export.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zod, Prisma, PostgreSQL, NextAuth, Playwright, Vitest, React Testing Library, pdf-lib, JSZip

---

## File structure

### App shell

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `vitest.config.ts`
- `playwright.config.ts`
- `prisma/schema.prisma`
- `.env.example`

### Routing

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/jobs/page.tsx`
- `src/app/jobs/new/page.tsx`
- `src/app/jobs/[jobId]/page.tsx`
- `src/app/jobs/[jobId]/review/page.tsx`
- `src/app/jobs/[jobId]/generate/page.tsx`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/[jobId]/route.ts`
- `src/app/api/jobs/[jobId]/parse/route.ts`
- `src/app/api/jobs/[jobId]/generate/route.ts`
- `src/app/api/uploads/route.ts`

### UI components

- `src/components/layout/app-shell.tsx`
- `src/components/jobs/job-form.tsx`
- `src/components/jobs/whatsapp-paste-card.tsx`
- `src/components/jobs/file-upload-card.tsx`
- `src/components/jobs/job-summary-form.tsx`
- `src/components/jobs/roster-editor.tsx`
- `src/components/jobs/roster-row-card.tsx`
- `src/components/jobs/size-totals-card.tsx`
- `src/components/jobs/generation-panel.tsx`
- `src/components/ui/empty-state.tsx`

### Domain and services

- `src/lib/auth.ts`
- `src/lib/db.ts`
- `src/lib/env.ts`
- `src/lib/utils.ts`
- `src/lib/jobs/job-schema.ts`
- `src/lib/jobs/job-mappers.ts`
- `src/lib/jobs/parse-whatsapp.ts`
- `src/lib/jobs/size-totals.ts`
- `src/lib/jobs/required-fields.ts`
- `src/lib/storage/storage.ts`
- `src/lib/storage/local-storage.ts`
- `src/lib/pdf/techpack-template.ts`
- `src/lib/pdf/order-sheet-template.ts`
- `src/lib/pdf/archive-bundle.ts`

### Tests

- `src/lib/jobs/__tests__/parse-whatsapp.test.ts`
- `src/lib/jobs/__tests__/size-totals.test.ts`
- `src/lib/jobs/__tests__/required-fields.test.ts`
- `src/app/api/jobs/__tests__/jobs-route.test.ts`
- `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
- `tests/e2e/new-job-flow.spec.ts`

## Implementation notes

- Build the first release for a single-owner workflow with login, not team permissions.
- Use PostgreSQL for persistent job records and uploaded file metadata.
- Store uploaded files on local disk for local development, behind a `storage` adapter so it can switch to cloud storage later.
- Treat WhatsApp parsing as draft extraction only. Generation must always use reviewed data.
- Use PDF generation for the supplier tech pack and order sheet. Bundle outputs into a ZIP archive for easy sharing.

### Task 1: Bootstrap the app and base tooling

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Create the project package manifest**

```json
{
  "name": "techpack-mobile-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^6.9.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.469.0",
    "next": "^15.3.3",
    "next-auth": "^5.0.0-beta.25",
    "pdf-lib": "^1.17.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.57.0",
    "zod": "^3.24.4",
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/jszip": "^3.4.1",
    "@types/node": "^22.15.21",
    "@types/react": "^19.1.5",
    "@types/react-dom": "^19.1.5",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.27.0",
    "eslint-config-next": "^15.3.3",
    "playwright": "^1.52.0",
    "postcss": "^8.5.3",
    "prisma": "^6.9.0",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.8.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: install completes without dependency conflicts

- [ ] **Step 3: Create the basic Next.js layout**

```tsx
// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tech Pack Mobile App",
  description: "Mobile-first intake and generation for sublimation orders."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-950">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Create a minimal landing page**

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Tech Pack Mobile App</h1>
      <p className="text-base text-neutral-600">
        Turn WhatsApp orders into reviewable job records and export-ready supplier files.
      </p>
      <Link href="/jobs" className="w-fit rounded-md bg-black px-4 py-2 text-white">
        Open jobs
      </Link>
    </main>
  );
}
```

- [ ] **Step 5: Run the app locally**

Run: `npm run dev`
Expected: homepage loads successfully at `http://localhost:3000`

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: bootstrap tech pack mobile app"
```

### Task 2: Define the data model and persistence layer

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `.env.example`
- Test: `src/lib/jobs/__tests__/required-fields.test.ts`

- [ ] **Step 1: Write the failing validation test for required job fields**

```ts
// src/lib/jobs/__tests__/required-fields.test.ts
import { describe, expect, it } from "vitest";
import { getMissingRequiredFields } from "../required-fields";

describe("getMissingRequiredFields", () => {
  it("returns required top-level fields before generation", () => {
    const result = getMissingRequiredFields({
      projectName: "",
      category: "",
      roster: []
    });

    expect(result).toEqual(["projectName", "category", "roster"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/jobs/__tests__/required-fields.test.ts`
Expected: FAIL with module not found for `required-fields`

- [ ] **Step 3: Define the Prisma schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  jobs      Job[]
}

model Job {
  id              String      @id @default(cuid())
  projectName     String
  customerName    String?
  category        String?
  material        String?
  collarType      String?
  cuttingType     String?
  colorNotes      String?
  sourceMessage   String?
  productionNotes String?
  status          JobStatus   @default(DRAFT)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  ownerId         String
  owner           User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  rosterItems     RosterItem[]
  files           UploadedFile[]
  outputs         GeneratedOutput[]
}

model RosterItem {
  id        String   @id @default(cuid())
  rowNumber Int
  name      String?
  number    String?
  size      String?
  remarks   String?
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
}

model UploadedFile {
  id           String   @id @default(cuid())
  kind         FileKind
  originalName String
  storagePath  String
  mimeType     String
  jobId        String
  createdAt    DateTime @default(now())
  job          Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
}

model GeneratedOutput {
  id          String     @id @default(cuid())
  outputType  OutputType
  storagePath String
  jobId       String
  createdAt   DateTime   @default(now())
  job         Job        @relation(fields: [jobId], references: [id], onDelete: Cascade)
}

enum JobStatus {
  DRAFT
  REVIEW_READY
  READY_TO_GENERATE
  GENERATED
}

enum FileKind {
  LOGO
  MOCKUP
  ARTWORK
  PDF_EXPORT
  REFERENCE
}

enum OutputType {
  TECHPACK_PDF
  ORDER_SHEET_PDF
  ARCHIVE_ZIP
  CUSTOMER_PREVIEW
}
```

- [ ] **Step 4: Add the Prisma client helper**

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 5: Add the environment example**

```env
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/techpack_mobile_app"
NEXTAUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_ROOT="./uploads"
```

- [ ] **Step 6: Add the minimal required-fields implementation**

```ts
// src/lib/jobs/required-fields.ts
type MinimalJob = {
  projectName?: string;
  category?: string;
  roster?: Array<unknown>;
};

export function getMissingRequiredFields(job: MinimalJob) {
  const missing: string[] = [];

  if (!job.projectName?.trim()) missing.push("projectName");
  if (!job.category?.trim()) missing.push("category");
  if (!job.roster?.length) missing.push("roster");

  return missing;
}
```

- [ ] **Step 7: Run tests and Prisma generation**

Run: `npm run test -- src/lib/jobs/__tests__/required-fields.test.ts ; npm run prisma:generate`
Expected: test PASS, Prisma client generated

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/db.ts src/lib/jobs/required-fields.ts src/lib/jobs/__tests__/required-fields.test.ts .env.example
git commit -m "feat: add job data model and prisma setup"
```

### Task 3: Add authentication and the base app shell

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write the failing shell render test**

```tsx
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";
import { describe, expect, it } from "vitest";

describe("AppShell", () => {
  it("renders the app title and child content", () => {
    render(
      <AppShell>
        <div>Jobs page</div>
      </AppShell>
    );

    expect(screen.getByText("Tech Pack Mobile App")).toBeInTheDocument();
    expect(screen.getByText("Jobs page")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/layout/app-shell.test.tsx`
Expected: FAIL with module not found for `app-shell`

- [ ] **Step 3: Add auth config and shell**

```ts
// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) return null;

        return {
          id: "demo-user",
          email: String(credentials.email)
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  }
});
```

```tsx
// src/components/layout/app-shell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div>
            <p className="text-lg font-semibold">Tech Pack Mobile App</p>
            <p className="text-sm text-neutral-500">WhatsApp intake to supplier exports</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Add the login page**

```tsx
// src/app/login/page.tsx
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-sm text-neutral-600">
        The first version uses a simple owner login for the business account.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Run the test again**

Run: `npm run test -- src/components/layout/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/components/layout/app-shell.tsx src/app/login/page.tsx
git commit -m "feat: add base auth and app shell"
```

### Task 4: Build the create-job flow with WhatsApp paste and file upload

**Files:**
- Create: `src/lib/jobs/job-schema.ts`
- Create: `src/components/jobs/job-form.tsx`
- Create: `src/components/jobs/whatsapp-paste-card.tsx`
- Create: `src/components/jobs/file-upload-card.tsx`
- Create: `src/app/jobs/new/page.tsx`
- Create: `src/app/api/jobs/route.ts`
- Create: `src/app/api/uploads/route.ts`
- Create: `src/lib/storage/storage.ts`
- Create: `src/lib/storage/local-storage.ts`
- Test: `src/app/api/jobs/__tests__/jobs-route.test.ts`

- [ ] **Step 1: Write the failing API test for creating a job**

```ts
import { describe, expect, it } from "vitest";
import { POST } from "../route";

describe("POST /api/jobs", () => {
  it("creates a draft job from intake payload", async () => {
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      body: JSON.stringify({
        projectName: "Kraxtom FC",
        sourceMessage: "Azlan 14 M"
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.projectName).toBe("Kraxtom FC");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/app/api/jobs/__tests__/jobs-route.test.ts`
Expected: FAIL with module not found for `route`

- [ ] **Step 3: Add the intake Zod schema**

```ts
// src/lib/jobs/job-schema.ts
import { z } from "zod";

export const createJobSchema = z.object({
  projectName: z.string().min(1),
  customerName: z.string().optional().default(""),
  category: z.string().optional().default("Sublimation"),
  sourceMessage: z.string().optional().default("")
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
```

- [ ] **Step 4: Add the create-job API route**

```ts
// src/app/api/jobs/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createJobSchema } from "@/lib/jobs/job-schema";

export async function POST(request: Request) {
  const json = await request.json();
  const input = createJobSchema.parse(json);

  const job = await db.job.create({
    data: {
      projectName: input.projectName,
      customerName: input.customerName,
      category: input.category,
      sourceMessage: input.sourceMessage,
      ownerId: "demo-user"
    }
  });

  return NextResponse.json(job, { status: 201 });
}
```

- [ ] **Step 5: Add local file storage adapter**

```ts
// src/lib/storage/storage.ts
export interface StorageAdapter {
  save(file: File, folder: string): Promise<{ storagePath: string; originalName: string; mimeType: string }>;
}
```

```ts
// src/lib/storage/local-storage.ts
import fs from "node:fs/promises";
import path from "node:path";
import { StorageAdapter } from "./storage";

export class LocalStorageAdapter implements StorageAdapter {
  async save(file: File, folder: string) {
    const root = process.env.UPLOAD_ROOT ?? "./uploads";
    const dir = path.join(root, folder);
    await fs.mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const outputPath = path.join(dir, file.name);
    await fs.writeFile(outputPath, buffer);

    return {
      storagePath: outputPath,
      originalName: file.name,
      mimeType: file.type
    };
  }
}
```

- [ ] **Step 6: Add the new-job screen**

```tsx
// src/app/jobs/new/page.tsx
import { AppShell } from "@/components/layout/app-shell";
import { JobForm } from "@/components/jobs/job-form";

export default function NewJobPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">New job</h1>
        <JobForm />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 7: Add the form and mobile-first input cards**

```tsx
// src/components/jobs/job-form.tsx
"use client";

import { useState } from "react";

export function JobForm() {
  const [projectName, setProjectName] = useState("");
  const [sourceMessage, setSourceMessage] = useState("");

  return (
    <form className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Project name</span>
        <input
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          className="w-full rounded-md border px-3 py-2"
          placeholder="Kraxtom FC"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">WhatsApp text</span>
        <textarea
          value={sourceMessage}
          onChange={(event) => setSourceMessage(event.target.value)}
          className="min-h-40 w-full rounded-md border px-3 py-2"
          placeholder="Paste customer message here"
        />
      </label>

      <button type="submit" className="w-full rounded-md bg-black px-4 py-3 text-white">
        Save draft job
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Run API test and smoke test the page**

Run: `npm run test -- src/app/api/jobs/__tests__/jobs-route.test.ts ; npm run dev`
Expected: API test PASS, `/jobs/new` loads with mobile-friendly form

- [ ] **Step 9: Commit**

```bash
git add src/lib/jobs/job-schema.ts src/app/api/jobs/route.ts src/lib/storage/storage.ts src/lib/storage/local-storage.ts src/app/jobs/new/page.tsx src/components/jobs/job-form.tsx
git commit -m "feat: add draft job intake flow"
```

### Task 5: Parse WhatsApp text into draft roster data

**Files:**
- Create: `src/lib/jobs/parse-whatsapp.ts`
- Create: `src/lib/jobs/job-mappers.ts`
- Create: `src/lib/jobs/__tests__/parse-whatsapp.test.ts`
- Create: `src/app/api/jobs/[jobId]/parse/route.ts`

- [ ] **Step 1: Write the failing parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseWhatsAppOrder } from "../parse-whatsapp";

describe("parseWhatsAppOrder", () => {
  it("extracts roster rows from simple lines", () => {
    const result = parseWhatsAppOrder("Azlan Shah 14 M\nIwan 24 L");

    expect(result.roster).toEqual([
      { rowNumber: 1, name: "Azlan Shah", number: "14", size: "M", remarks: "" },
      { rowNumber: 2, name: "Iwan", number: "24", size: "L", remarks: "" }
    ]);
  });

  it("counts totals by size", () => {
    const result = parseWhatsAppOrder("Azlan Shah 14 M\nIwan 24 L\nMode 92 M");

    expect(result.sizeTotals).toEqual({
      M: 2,
      L: 1
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/lib/jobs/__tests__/parse-whatsapp.test.ts`
Expected: FAIL with module not found for `parse-whatsapp`

- [ ] **Step 3: Implement the parser**

```ts
// src/lib/jobs/parse-whatsapp.ts
const SIZE_PATTERN = /\b(3XS|2XS|XS|S|M|L|XL|2XL|3XL|4XL|5XL)\b/i;
const NUMBER_PATTERN = /\b\d{1,3}\b/;

export function parseWhatsAppOrder(message: string) {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const roster = lines.map((line, index) => {
    const sizeMatch = line.match(SIZE_PATTERN);
    const numberMatch = line.match(NUMBER_PATTERN);

    const size = sizeMatch?.[1]?.toUpperCase() ?? "";
    const number = numberMatch?.[0] ?? "";

    let name = line;
    if (number) name = name.replace(number, "").trim();
    if (size) name = name.replace(new RegExp(`\\b${size}\\b`, "i"), "").trim();

    return {
      rowNumber: index + 1,
      name,
      number,
      size,
      remarks: ""
    };
  });

  const sizeTotals = roster.reduce<Record<string, number>>((acc, row) => {
    if (!row.size) return acc;
    acc[row.size] = (acc[row.size] ?? 0) + 1;
    return acc;
  }, {});

  return { roster, sizeTotals };
}
```

- [ ] **Step 4: Add the parse API route**

```ts
// src/app/api/jobs/[jobId]/parse/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseWhatsAppOrder } from "@/lib/jobs/parse-whatsapp";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const parsed = parseWhatsAppOrder(job.sourceMessage ?? "");

  await db.rosterItem.deleteMany({ where: { jobId } });
  await db.rosterItem.createMany({
    data: parsed.roster.map((row) => ({ ...row, jobId }))
  });

  await db.job.update({
    where: { id: jobId },
    data: { status: "REVIEW_READY" }
  });

  return NextResponse.json(parsed);
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/lib/jobs/__tests__/parse-whatsapp.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/jobs/parse-whatsapp.ts src/lib/jobs/__tests__/parse-whatsapp.test.ts src/app/api/jobs/[jobId]/parse/route.ts
git commit -m "feat: parse whatsapp text into draft roster data"
```

### Task 6: Build the mobile review screen and size totals

**Files:**
- Create: `src/lib/jobs/size-totals.ts`
- Create: `src/components/jobs/job-summary-form.tsx`
- Create: `src/components/jobs/roster-editor.tsx`
- Create: `src/components/jobs/roster-row-card.tsx`
- Create: `src/components/jobs/size-totals-card.tsx`
- Create: `src/app/jobs/[jobId]/review/page.tsx`
- Create: `src/lib/jobs/__tests__/size-totals.test.ts`

- [ ] **Step 1: Write the failing size totals test**

```ts
import { describe, expect, it } from "vitest";
import { buildSizeTotals } from "../size-totals";

describe("buildSizeTotals", () => {
  it("groups roster rows by size", () => {
    const result = buildSizeTotals([
      { size: "M" },
      { size: "L" },
      { size: "M" }
    ]);

    expect(result).toEqual({ M: 2, L: 1 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/jobs/__tests__/size-totals.test.ts`
Expected: FAIL with module not found for `size-totals`

- [ ] **Step 3: Implement size totals helper**

```ts
// src/lib/jobs/size-totals.ts
export function buildSizeTotals(rows: Array<{ size?: string | null }>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const size = row.size?.trim().toUpperCase();
    if (!size) return acc;
    acc[size] = (acc[size] ?? 0) + 1;
    return acc;
  }, {});
}
```

- [ ] **Step 4: Add roster editor UI**

```tsx
// src/components/jobs/roster-row-card.tsx
"use client";

type Props = {
  rowNumber: number;
  name: string;
  number: string;
  size: string;
};

export function RosterRowCard({ rowNumber, name, number, size }: Props) {
  return (
    <div className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm font-medium">Row {rowNumber}</p>
      <input defaultValue={name} className="rounded-md border px-3 py-2" placeholder="Name" />
      <div className="grid grid-cols-2 gap-3">
        <input defaultValue={number} className="rounded-md border px-3 py-2" placeholder="Number" />
        <input defaultValue={size} className="rounded-md border px-3 py-2" placeholder="Size" />
      </div>
    </div>
  );
}
```

```tsx
// src/components/jobs/size-totals-card.tsx
export function SizeTotalsCard({ totals }: { totals: Record<string, number> }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Size totals</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(totals).map(([size, total]) => (
          <div key={size} className="rounded-md bg-neutral-100 p-3 text-sm">
            {size}: {total}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add the review page**

```tsx
// src/app/jobs/[jobId]/review/page.tsx
import { AppShell } from "@/components/layout/app-shell";

export default function ReviewJobPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Review job</h1>
        <p className="text-sm text-neutral-600">
          Check the extracted project details, roster rows, and size totals before generation.
        </p>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 6: Run the test again**

Run: `npm run test -- src/lib/jobs/__tests__/size-totals.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/jobs/size-totals.ts src/lib/jobs/__tests__/size-totals.test.ts src/components/jobs/roster-row-card.tsx src/components/jobs/size-totals-card.tsx src/app/jobs/[jobId]/review/page.tsx
git commit -m "feat: add mobile review screen and size totals"
```

### Task 7: Generate supplier PDF, order sheet PDF, and ZIP archive

**Files:**
- Create: `src/lib/pdf/techpack-template.ts`
- Create: `src/lib/pdf/order-sheet-template.ts`
- Create: `src/lib/pdf/archive-bundle.ts`
- Create: `src/app/api/jobs/[jobId]/generate/route.ts`
- Test: `src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`

- [ ] **Step 1: Write the failing generation route test**

```ts
import { describe, expect, it, vi } from "vitest";
import { POST } from "../route";

describe("POST /api/jobs/[jobId]/generate", () => {
  it("returns generated output paths", async () => {
    const request = new Request("http://localhost/api/jobs/job_123/generate", {
      method: "POST"
    });

    const response = await POST(request, {
      params: Promise.resolve({ jobId: "job_123" })
    });

    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
Expected: FAIL with module not found for `route`

- [ ] **Step 3: Implement the PDF generators**

```ts
// src/lib/pdf/techpack-template.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildTechpackPdf(job: {
  projectName: string;
  category?: string | null;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Supplier Tech Pack", { x: 40, y: 780, size: 22, font, color: rgb(0, 0, 0) });
  page.drawText(`Project: ${job.projectName}`, { x: 40, y: 740, size: 14, font });
  page.drawText(`Category: ${job.category ?? "Sublimation"}`, { x: 40, y: 715, size: 14, font });

  return Buffer.from(await pdf.save());
}
```

```ts
// src/lib/pdf/order-sheet-template.ts
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function buildOrderSheetPdf(job: {
  projectName: string;
  roster: Array<{ name?: string | null; number?: string | null; size?: string | null }>;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText(`Order Sheet: ${job.projectName}`, { x: 40, y: 780, size: 20, font });

  let y = 740;
  for (const row of job.roster.slice(0, 25)) {
    page.drawText(`${row.name ?? ""}  ${row.number ?? ""}  ${row.size ?? ""}`, {
      x: 40,
      y,
      size: 12,
      font
    });
    y -= 22;
  }

  return Buffer.from(await pdf.save());
}
```

```ts
// src/lib/pdf/archive-bundle.ts
import JSZip from "jszip";

export async function buildArchiveZip(files: Array<{ name: string; data: Buffer }>) {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.data);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
```

- [ ] **Step 4: Add the generation API route**

```ts
// src/app/api/jobs/[jobId]/generate/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMissingRequiredFields } from "@/lib/jobs/required-fields";
import { buildTechpackPdf } from "@/lib/pdf/techpack-template";
import { buildOrderSheetPdf } from "@/lib/pdf/order-sheet-template";
import { buildArchiveZip } from "@/lib/pdf/archive-bundle";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = await db.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { rosterItems: true }
  });

  const missing = getMissingRequiredFields({
    projectName: job.projectName,
    category: job.category ?? "",
    roster: job.rosterItems
  });

  if (missing.length) {
    return NextResponse.json({ missing }, { status: 400 });
  }

  const techpack = await buildTechpackPdf(job);
  const orderSheet = await buildOrderSheetPdf({
    projectName: job.projectName,
    roster: job.rosterItems
  });
  const archive = await buildArchiveZip([
    { name: "supplier-techpack.pdf", data: techpack },
    { name: "order-sheet.pdf", data: orderSheet }
  ]);

  return NextResponse.json(
    {
      files: [
        { name: "supplier-techpack.pdf", size: techpack.byteLength },
        { name: "order-sheet.pdf", size: orderSheet.byteLength },
        { name: "job-archive.zip", size: archive.byteLength }
      ]
    },
    { status: 200 }
  );
}
```

- [ ] **Step 5: Run the test again**

Run: `npm run test -- src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf/techpack-template.ts src/lib/pdf/order-sheet-template.ts src/lib/pdf/archive-bundle.ts src/app/api/jobs/[jobId]/generate/route.ts src/app/api/jobs/[jobId]/generate/__tests__/generate-route.test.ts
git commit -m "feat: add document generation and archive export"
```

### Task 8: Add jobs list, job detail, and generation UI

**Files:**
- Create: `src/app/jobs/page.tsx`
- Create: `src/app/jobs/[jobId]/page.tsx`
- Create: `src/app/jobs/[jobId]/generate/page.tsx`
- Create: `src/components/jobs/generation-panel.tsx`
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Write the failing end-to-end scenario**

```ts
import { test, expect } from "@playwright/test";

test("owner can start a job from whatsapp text", async ({ page }) => {
  await page.goto("/jobs/new");
  await page.getByPlaceholder("Kraxtom FC").fill("Kraxtom FC");
  await page.getByPlaceholder("Paste customer message here").fill("Azlan Shah 14 M");
  await expect(page.getByRole("button", { name: "Save draft job" })).toBeVisible();
});
```

- [ ] **Step 2: Run the scenario to verify it fails**

Run: `npm run test:e2e -- tests/e2e/new-job-flow.spec.ts`
Expected: FAIL until routes and pages are wired together

- [ ] **Step 3: Add jobs list and detail pages**

```tsx
// src/app/jobs/page.tsx
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function JobsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <Link href="/jobs/new" className="rounded-md bg-black px-4 py-2 text-white">
            New job
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
```

```tsx
// src/components/jobs/generation-panel.tsx
"use client";

export function GenerationPanel() {
  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Generate outputs</h2>
      <p className="text-sm text-neutral-600">
        Create the supplier tech pack, order sheet, and archive package.
      </p>
      <button className="w-full rounded-md bg-black px-4 py-3 text-white">Generate files</button>
    </div>
  );
}
```

- [ ] **Step 4: Add generate page**

```tsx
// src/app/jobs/[jobId]/generate/page.tsx
import { AppShell } from "@/components/layout/app-shell";
import { GenerationPanel } from "@/components/jobs/generation-panel";

export default function GenerateJobPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Generate job package</h1>
        <GenerationPanel />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Run the end-to-end test again**

Run: `npm run test:e2e -- tests/e2e/new-job-flow.spec.ts`
Expected: PASS for initial create-job journey

- [ ] **Step 6: Commit**

```bash
git add src/app/jobs/page.tsx src/app/jobs/[jobId]/generate/page.tsx src/components/jobs/generation-panel.tsx tests/e2e/new-job-flow.spec.ts
git commit -m "feat: add jobs dashboard and generation entry point"
```

### Task 9: Finish validation, missing-state handling, and mobile polish

**Files:**
- Modify: `src/components/jobs/job-form.tsx`
- Modify: `src/components/jobs/roster-editor.tsx`
- Modify: `src/components/jobs/generation-panel.tsx`
- Modify: `src/lib/jobs/required-fields.ts`
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Write the failing validation behavior test**

```ts
import { describe, expect, it } from "vitest";
import { getMissingRequiredFields } from "../required-fields";

describe("getMissingRequiredFields generation checks", () => {
  it("flags missing artwork when generating full supplier outputs", () => {
    const result = getMissingRequiredFields({
      projectName: "Kraxtom FC",
      category: "Sublimation",
      roster: [{ name: "Azlan Shah", number: "14", size: "M" }],
      artworkFiles: []
    });

    expect(result).toContain("artworkFiles");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/lib/jobs/__tests__/required-fields.test.ts`
Expected: FAIL because artwork validation is not implemented

- [ ] **Step 3: Expand validation logic and surface missing-state UI**

```ts
// src/lib/jobs/required-fields.ts
type MinimalJob = {
  projectName?: string;
  category?: string;
  roster?: Array<{ name?: string; number?: string; size?: string }>;
  artworkFiles?: Array<unknown>;
};

export function getMissingRequiredFields(job: MinimalJob) {
  const missing: string[] = [];

  if (!job.projectName?.trim()) missing.push("projectName");
  if (!job.category?.trim()) missing.push("category");
  if (!job.roster?.length) missing.push("roster");
  if (!job.artworkFiles?.length) missing.push("artworkFiles");

  return missing;
}
```

```tsx
// src/components/ui/empty-state.tsx
export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-white p-6 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test`
Expected: all unit tests PASS

- [ ] **Step 5: Run the end-to-end test**

Run: `npm run test:e2e`
Expected: primary create-review-generate flow PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/jobs/required-fields.ts src/components/ui/empty-state.tsx src/components/jobs/job-form.tsx src/components/jobs/roster-editor.tsx src/components/jobs/generation-panel.tsx
git commit -m "feat: add validation and mobile missing-state polish"
```

## Spec coverage check

- Mobile-first browser access is covered by the Next.js web app, mobile-first forms, review UI, and generation screens in Tasks 1, 4, 6, and 8.
- WhatsApp paste intake is covered by Task 4 and parsing logic in Task 5.
- Review before generation is covered by Task 6 and validation in Task 9.
- Supplier tech pack, order sheet, and archive ZIP outputs are covered by Task 7.
- Shared job structure, persistence, and uploaded files are covered by Task 2 and Task 4.
- Basic owner login is covered by Task 3.

## Plan notes

- This plan intentionally keeps Adobe Illustrator outside the system. The app accepts exports and related assets instead of editing AI files.
- Customer mockup automation is not in the first implementation batch. The first release focuses on the supplier workflow, order sheet, archive packaging, and a structure that can later add customer-facing outputs.
- If customer mockup generation becomes mandatory in the first release, add a separate follow-up plan for image composition templates and preview rendering.
