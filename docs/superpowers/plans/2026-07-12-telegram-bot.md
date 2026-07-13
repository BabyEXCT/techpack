# Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Telegram bot that monitors the app, lets you create orders and query status from your phone, and generates copy-paste customer message templates.

**Architecture:** Single-purpose bot wired to existing API routes. One shared admin chat ID in env. Webhook receiver dispatches text commands to handlers. Order creation reuses `parseWhatsAppOrder` + `POST /api/jobs`. Templates stored in a new `MessageTemplate` model with a web CRUD UI and a `/template` bot command. Notifications fire from existing write routes via a small `notify` helper.

**Tech Stack:** Next.js 15 App Router (route handlers), Prisma + SQLite, Telegram Bot HTTP API via `fetch` (no extra dependency), Zod for validation.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `MessageTemplate` model |
| `src/lib/telegram/send.ts` | Create | `sendMessage()` + `setWebhook()` helpers |
| `src/lib/telegram/templates.ts` | Create | `fillTemplate()` placeholder substitution |
| `src/lib/telegram/notify.ts` | Create | Per-event notification functions |
| `src/lib/telegram/handlers.ts` | Create | Command handlers (`/start`, `/summary`, `/urgent`, `/today`, `/create`, `/template`) |
| `src/app/api/telegram/webhook/route.ts` | Create | POST receiver + dispatch |
| `src/app/api/telegram/test/route.ts` | Create | GET test message |
| `src/app/api/telegram/register-webhook/route.ts` | Create | POST webhook setup |
| `src/app/api/templates/route.ts` | Create | GET list + POST create |
| `src/app/api/templates/[id]/route.ts` | Create | GET one + PUT update + DELETE |
| `src/app/templates/page.tsx` | Create | List templates |
| `src/app/templates/new/page.tsx` | Create | New template form |
| `src/app/templates/[id]/edit/page.tsx` | Create | Edit template form |
| `src/app/api/jobs/route.ts` | Modify | Call `notifyJobCreated()` after create |
| `src/app/api/invoices/[invoiceId]/status/route.ts` | Modify | Call `notifyPaymentStatus()` after update |
| `src/app/api/customers/route.ts` | Modify | Call `notifyNewCustomer()` after create |

---

## Task 1: Add MessageTemplate model + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

- [ ] **Step 1: Add model to schema**

Append to `prisma/schema.prisma` (after the last model):

```prisma
model MessageTemplate {
  id        String   @id @default(cuid())
  name      String   @unique
  label     String
  body      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_message_template`
Expected: migration created and applied, no errors.

- [ ] **Step 3: Regenerate client**

Run: `npx prisma generate`
Expected: client regenerated with `MessageTemplate`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add MessageTemplate model"
```

---

## Task 2: Telegram send + webhook helpers

**Files:**
- Create: `src/lib/telegram/send.ts`

- [ ] **Step 1: Write the helper module**

```typescript
// src/lib/telegram/send.ts
const BASE = "https://api.telegram.org/bot";

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  const url = `${BASE}${token()}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram send failed ${res.status}: ${detail}`);
  }
}

export async function setWebhook(url: string): Promise<void> {
  const api = `${BASE}${token()}/setWebhook?url=${encodeURIComponent(url)}`;
  const res = await fetch(api);
  if (!res.ok) throw new Error(`setWebhook failed ${res.status}`);
}

export function adminChatId(): string | undefined {
  return process.env.TELEGRAM_ADMIN_CHAT_ID;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: no errors referencing send.ts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram/send.ts
git commit -m "feat: add telegram send + webhook helpers"
```

---

## Task 3: Template filler utility

**Files:**
- Create: `src/lib/telegram/templates.ts`

- [ ] **Step 1: Write the filler**

```typescript
// src/lib/telegram/templates.ts
type JobLike = {
  projectName?: string | null;
  customerName?: string | null;
  category?: string | null;
  sizeLabel?: string | null;
  dateLabel?: string | null;
  cuttingType?: string | null;
  material?: string | null;
  collarType?: string | null;
  workflowStage?: string | null;
  priority?: string | null;
};

export function fillTemplate(body: string, job?: JobLike | null): string {
  const map: Record<string, string> = {
    customerName: job?.customerName ?? "",
    projectName: job?.projectName ?? "",
    category: job?.category ?? "",
    sizeLabel: job?.sizeLabel ?? "",
    dateLabel: job?.dateLabel ?? "",
    cuttingType: job?.cuttingType ?? "",
    material: job?.material ?? "",
    collarType: job?.collarType ?? "",
    workflowStage: job?.workflowStage ?? "",
    priority: job?.priority ?? ""
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => map[key] ?? "");
}
```

- [ ] **Step 2: Write a quick unit check**

Create `src/lib/telegram/__tests__/templates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { fillTemplate } from "../templates";

describe("fillTemplate", () => {
  it("substitutes known placeholders", () => {
    const out = fillTemplate("Hi {{customerName}}, {{projectName}} ready", {
      customerName: "John",
      projectName: "FC Jersey"
    });
    expect(out).toBe("Hi John, FC Jersey ready");
  });

  it("leaves unknown placeholders empty", () => {
    expect(fillTemplate("{{nope}} here")).toBe(" here");
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/lib/telegram/__tests__/templates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/telegram/templates.ts src/lib/telegram/__tests__/templates.test.ts
git commit -m "feat: add template placeholder filler + test"
```

---

## Task 4: Notification helper

**Files:**
- Create: `src/lib/telegram/notify.ts`

- [ ] **Step 1: Write notify functions**

```typescript
// src/lib/telegram/notify.ts
import { sendMessage, adminChatId } from "./send";

async function push(text: string): Promise<void> {
  const chatId = adminChatId();
  if (!chatId) return;
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.error("Telegram notify failed:", err);
  }
}

export function notifyJobCreated(projectName: string, priority: string): Promise<void> {
  return push(`🆕 New job: ${projectName} (${priority})`);
}

export function notifyStageChange(projectName: string, stage: string): Promise<void> {
  return push(`🔄 ${projectName} moved to ${stage}`);
}

export function notifyPriorityChange(projectName: string, priority: string): Promise<void> {
  return push(`⚡ ${projectName} marked as ${priority}`);
}

export function notifyPaymentStatus(invoiceNumber: string, status: string): Promise<void> {
  return push(`💰 Invoice ${invoiceNumber} is now ${status}`);
}

export function notifyNewCustomer(name: string): Promise<void> {
  return push(`👤 New customer: ${name}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/telegram/notify.ts
git commit -m "feat: add telegram notification helpers"
```

---

## Task 5: Command handlers

**Files:**
- Create: `src/lib/telegram/handlers.ts`

- [ ] **Step 1: Write handlers**

```typescript
// src/lib/telegram/handlers.ts
import { db } from "@/lib/db";
import { sendMessage } from "./send";
import { fillTemplate } from "./templates";

const WELCOME = `Techpack bot ready. Commands:
/start - show this
/summary - job counts by stage
/urgent - urgent & rush jobs
/today - jobs due today
/create - create job from pasted text
/template <name> [project] - customer-ready message`;

export async function handleStart(chatId: string): Promise<void> {
  await sendMessage(chatId, WELCOME);
}

export async function handleSummary(chatId: string): Promise<void> {
  const stages = ["NEW", "DESIGN", "WAITING_APPROVAL", "PRODUCTION", "DONE"] as const;
  const lines = await Promise.all(
    stages.map(async (s) => {
      const count = await db.job.count({ where: { workflowStage: s, deletedAt: null } });
      return `${s}: ${count}`;
    })
  );
  await sendMessage(chatId, `📊 Summary\n${lines.join("\n")}`);
}

export async function handleUrgent(chatId: string): Promise<void> {
  const jobs = await db.job.findMany({
    where: { priority: { in: ["URGENT", "RUSH"] }, deletedAt: null },
    select: { projectName: true, priority: true }
  });
  if (!jobs.length) {
    await sendMessage(chatId, "No urgent or rush jobs.");
    return;
  }
  const lines = jobs.map((j) => `- ${j.projectName} (${j.priority})`);
  await sendMessage(chatId, `⚡ Urgent/Rush\n${lines.join("\n")}`);
}

export async function handleToday(chatId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const jobs = await db.job.findMany({
    where: { dateLabel: today, deletedAt: null },
    select: { projectName: true, dateLabel: true }
  });
  if (!jobs.length) {
    await sendMessage(chatId, "Nothing due today.");
    return;
  }
  const lines = jobs.map((j) => `- ${j.projectName} (${j.dateLabel})`);
  await sendMessage(chatId, `📅 Today\n${lines.join("\n")}`);
}

export async function handleTemplate(chatId: string, arg: string): Promise<void> {
  const [name, ...rest] = arg.trim().split(/\s+/);
  const project = rest.join(" ");
  const tpl = await db.messageTemplate.findUnique({ where: { name } });
  if (!tpl) {
    await sendMessage(chatId, `Template "${name}" not found.`);
    return;
  }
  let job = null;
  if (project) {
    job = await db.job.findFirst({
      where: { projectName: { contains: project }, deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
  }
  await sendMessage(chatId, fillTemplate(tpl.body, job));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/telegram/handlers.ts
git commit -m "feat: add telegram command handlers"
```

---

## Task 6: Webhook receiver + dispatcher

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// src/app/api/telegram/webhook/route.ts
import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram/send";
import {
  handleStart,
  handleSummary,
  handleUrgent,
  handleToday,
  handleTemplate
} from "@/lib/telegram/handlers";
import { parseWhatsAppOrder } from "@/lib/jobs/parse-whatsapp";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// In-memory conversation state (survives within server lifetime)
const awaitingOrder = new Set<string>();

async function createJobFromText(text: string, chatId: string): Promise<string> {
  try {
    const parsed = parseWhatsAppOrder(text);
    const input: Record<string, unknown> = {
      projectName: parsed.projectName,
      customerName: parsed.customerName ?? null,
      customerId: null,
      category: parsed.category ?? null,
      cuttingType: parsed.cuttingType ?? null,
      material: parsed.material ?? null,
      collarType: parsed.collarType ?? null,
      sourceMessage: text,
      workflowStage: "NEW",
      priority: parsed.priority ?? "NORMAL"
    };
    const res = await fetch(`${process.env.APP_BASE_URL ?? "http://localhost:3011"}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      const detail = await res.text();
      return `❌ Create failed: ${detail}`;
    }
    const job = await res.json();
    return `✅ Job created: ${job.projectName} — ${job.workflowStage} (${job.priority})`;
  } catch (err) {
    return `❌ Parse error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const message = update?.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    if (awaitingOrder.has(chatId)) {
      awaitingOrder.delete(chatId);
      const reply = await createJobFromText(text, chatId);
      await sendMessage(chatId, reply);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/start") || text.startsWith("/help")) {
      await handleStart(chatId);
    } else if (text.startsWith("/summary")) {
      await handleSummary(chatId);
    } else if (text.startsWith("/urgent")) {
      await handleUrgent(chatId);
    } else if (text.startsWith("/today")) {
      await handleToday(chatId);
    } else if (text.startsWith("/template")) {
      await handleTemplate(chatId, text.replace("/template", ""));
    } else if (text.startsWith("/create")) {
      awaitingOrder.add(chatId);
      await sendMessage(chatId, "Send me the order text (WhatsApp format).");
    } else {
      await sendMessage(chatId, "Unknown command. Send /start for help.");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: no errors referencing webhook/route.ts.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telegram/webhook/route.ts
git commit -m "feat: add telegram webhook receiver"
```

---

## Task 7: Test + register-webhook endpoints

**Files:**
- Create: `src/app/api/telegram/test/route.ts`
- Create: `src/app/api/telegram/register-webhook/route.ts`

- [ ] **Step 1: Write test route**

```typescript
// src/app/api/telegram/test/route.ts
import { NextResponse } from "next/server";
import { sendMessage, adminChatId } from "@/lib/telegram/send";

export const dynamic = "force-dynamic";

export async function GET() {
  const chatId = adminChatId();
  if (!chatId) {
    return NextResponse.json({ error: "TELEGRAM_ADMIN_CHAT_ID not set" }, { status: 400 });
  }
  try {
    await sendMessage(chatId, "✅ Telegram connected.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Write register-webhook route**

```typescript
// src/app/api/telegram/register-webhook/route.ts
import { NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram/send";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }
    await setWebhook(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/telegram/test/route.ts src/app/api/telegram/register-webhook/route.ts
git commit -m "feat: add telegram test + register-webhook endpoints"
```

---

## Task 8: Templates API

**Files:**
- Create: `src/app/api/templates/route.ts`
- Create: `src/app/api/templates/[id]/route.ts`

- [ ] **Step 1: Write list + create route**

```typescript
// src/app/api/templates/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  body: z.string().min(1)
});

export async function GET() {
  try {
    const templates = await db.messageTemplate.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(templates, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const tpl = await db.messageTemplate.create({ data: parsed.data });
    return NextResponse.json(tpl, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write single-template route**

```typescript
// src/app/api/templates/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  body: z.string().min(1)
});

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const tpl = await db.messageTemplate.findUnique({ where: { id } });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tpl, { status: 200 });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const json = await request.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const tpl = await db.messageTemplate.update({ where: { id }, data: parsed.data });
  return NextResponse.json(tpl, { status: 200 });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  await db.messageTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/templates/route.ts src/app/api/templates/[id]/route.ts
git commit -m "feat: add templates CRUD API"
```

---

## Task 9: Templates UI pages

**Files:**
- Create: `src/app/templates/page.tsx`
- Create: `src/app/templates/new/page.tsx`
- Create: `src/app/templates/[id]/edit/page.tsx`

- [ ] **Step 1: List page**

```tsx
// src/app/templates/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await db.messageTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Templates</h1>
          <Link href="/templates/new" className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">
            New template
          </Link>
        </div>
        <div className="grid gap-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}/edit`}
              className="block rounded-2xl border border-zinc-200 p-4 shadow-soft"
            >
              <p className="font-medium">{t.label}</p>
              <p className="text-sm text-zinc-500">{t.name}</p>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{t.body}</p>
            </Link>
          ))}
          {!templates.length && <p className="text-sm text-zinc-500">No templates yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: New template page**

```tsx
// src/app/templates/new/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, label, body })
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    router.push("/templates");
  }

  return (
    <AppShell>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">New template</h1>
        <input placeholder="name (unique, e.g. customer_confirmation)" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <input placeholder="label (e.g. Customer confirmation)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <textarea placeholder="body with {{customerName}} etc." value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full rounded-xl border px-3 py-2" />
        <p className="text-xs text-zinc-500">Placeholders: {"{{customerName}} {{projectName}} {{category}} {{sizeLabel}} {{dateLabel}} {{cuttingType}} {{material}} {{collarType}} {{workflowStage}} {{priority}}"}</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={submit} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">Save</button>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Edit template page**

```tsx
// src/app/templates/[id]/edit/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/templates/${id}`).then((r) => r.json()).then((t) => {
      setName(t.name); setLabel(t.label); setBody(t.body);
    });
  }, [id]);

  async function save() {
    setError("");
    const res = await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, label, body })
    });
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    router.push("/templates");
  }

  async function remove() {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    router.push("/templates");
  }

  return (
    <AppShell>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Edit template</h1>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full rounded-xl border px-3 py-2" />
        <p className="text-xs text-zinc-500">Placeholders: {"{{customerName}} {{projectName}} {{category}} {{sizeLabel}} {{dateLabel}} {{cuttingType}} {{material}} {{collarType}} {{workflowStage}} {{priority}}"}</p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white">Save</button>
          <button onClick={remove} className="rounded-xl border px-4 py-2 text-sm">Delete</button>
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Add nav link**

In `src/components/layout/sidebar-nav.tsx` (and `mobile-nav.tsx` if present), add a link to `/templates` labeled "Templates".

- [ ] **Step 5: Commit**

```bash
git add src/app/templates src/components/layout/sidebar-nav.tsx src/components/layout/mobile-nav.tsx
git commit -m "feat: add templates UI pages + nav"
```

---

## Task 10: Wire notifications into existing routes

**Files:**
- Modify: `src/app/api/jobs/route.ts`
- Modify: `src/app/api/invoices/[invoiceId]/status/route.ts`
- Modify: `src/app/api/customers/route.ts`

- [ ] **Step 1: Jobs route — notify on create**

In `src/app/api/jobs/route.ts`, add import and call after `db.job.create`:

```typescript
import { notifyJobCreated } from "@/lib/telegram/notify";
```

After the `const job = await db.job.create({ ... })` block (before `return NextResponse.json(job, ...)`):

```typescript
notifyJobCreated(job.projectName, job.priority);
```

- [ ] **Step 2: Invoice status route — notify on update**

In `src/app/api/invoices/[invoiceId]/status/route.ts`, add import and call after `db.invoice.update`:

```typescript
import { notifyPaymentStatus } from "@/lib/telegram/notify";
```

After `const updated = await db.invoice.update({ ... })`:

```typescript
notifyPaymentStatus(invoiceId, parsed.data.status);
```

- [ ] **Step 3: Customers route — notify on create**

In `src/app/api/customers/route.ts`, add import and call after `db.customer.create`:

```typescript
import { notifyNewCustomer } from "@/lib/telegram/notify";
```

After `const customer = await db.customer.create({ ... })`:

```typescript
notifyNewCustomer(customer.name);
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/jobs/route.ts src/app/api/invoices/[invoiceId]/status/route.ts src/app/api/customers/route.ts
git commit -m "feat: wire telegram notifications into write routes"
```

---

## Task 11: Env config + manual smoke test

**Files:**
- Modify: `.env.local` (create if missing)

- [ ] **Step 1: Add env vars**

Add to `.env.local`:

```env
TELEGRAM_BOT_TOKEN=8961213335:AAGILUvsKbKneFVrbOxQ9ElkQuilhZbb0jM
TELEGRAM_ADMIN_CHAT_ID=
APP_BASE_URL=http://localhost:3011
```

Leave `TELEGRAM_ADMIN_CHAT_ID` blank for now — you will fill it after getting it from `@userinfobot`.

- [ ] **Step 2: Restart dev server**

Run: stop existing server on 3011, then `npm run dev`

- [ ] **Step 3: Test endpoint (after chat ID set)**

Once you have your chat ID from `@userinfobot`, set `TELEGRAM_ADMIN_CHAT_ID` and restart, then:

Run: `curl http://localhost:3011/api/telegram/test`
Expected: `{"ok":true}` and you receive "✅ Telegram connected." in Telegram.

- [ ] **Step 4: Commit**

```bash
git add .env.local
git commit -m "chore: add telegram env config"
```

(Note: `.env.local` is usually gitignored — if so, skip this commit and just keep it locally.)

---

## Self-Review Notes

- **Spec coverage:** All 6 sections covered — infra (Tasks 2,6,7), commands (Task 5), order creation (Task 6 `/create`), templates model+UI+API (Tasks 1,8,9), notifications (Task 4,10).
- **Type consistency:** `sendMessage(chatId, text)` signature used identically across send.ts, notify.ts, handlers.ts, webhook. `fillTemplate(body, job)` matches handlers usage. `MessageTemplate` model fields (`name`, `label`, `body`) match API + UI.
- **No placeholders:** All code steps show full implementations.
- **Security:** Bot token already shared by user in chat — noted in spec. `APP_BASE_URL` used so webhook can call its own API; defaults to localhost:3011.
