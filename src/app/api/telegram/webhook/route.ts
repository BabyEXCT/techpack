import { NextResponse } from "next/server";
import { sendMessage, sendDocument, getFileUrl, MENU_KEYBOARD } from "@/lib/telegram/send";
import {
  handleStart,
  handleSummary,
  handleUrgent,
  handleToday,
  handleTemplate
} from "@/lib/telegram/handlers";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────

type CustomerInput = {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  preferredPaymentMethod?: string;
  deliveryNote?: string;
  notes?: string;
};

type JobInput = {
  projectName: string;
  brandName?: string;
  category: string;
  sizeLabel?: string;
  dateLabel?: string;
  cuttingType?: string;
  material?: string;
  collarType?: string;
  sourceMessage?: string;
};

type CreateSession =
  | { step: "choose_customer" }
  | { step: "search_customer"; matches?: Array<{ id: string; name: string }> }
  | { step: "new_customer_name" }
  | { step: "new_customer_company"; cust: CustomerInput }
  | { step: "new_customer_phone"; cust: CustomerInput }
  | { step: "new_customer_email"; cust: CustomerInput }
  | { step: "new_customer_address"; cust: CustomerInput }
  | { step: "new_customer_payment"; cust: CustomerInput }
  | { step: "new_customer_delivery"; cust: CustomerInput }
  | { step: "new_customer_notes"; cust: CustomerInput }
  | { step: "job_project_name"; cust: CustomerInput; customerId: string }
  | { step: "job_brand"; cust: CustomerInput; customerId: string; projectName: string }
  | { step: "job_category"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string }
  | { step: "job_size_label"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string; category: string }
  | { step: "job_date_label"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string; category: string; sizeLabel?: string }
  | { step: "job_cutting_type"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string; category: string; sizeLabel?: string; dateLabel?: string }
  | { step: "job_material"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string; category: string; sizeLabel?: string; dateLabel?: string; cuttingType?: string }
  | { step: "job_collar_type"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string; category: string; sizeLabel?: string; dateLabel?: string; cuttingType?: string; material?: string }
  | { step: "job_source_message"; cust: CustomerInput; customerId: string; projectName: string; brandName?: string; category: string; sizeLabel?: string; dateLabel?: string; cuttingType?: string; material?: string; collarType?: string }
  | { step: "confirm"; cust: CustomerInput; customerId: string; job: JobInput }
  // after job created
  | { step: "add_images"; jobId: string; customerName: string; customerId: string; projectName: string }
  | { step: "offer_pdf"; jobId: string; customerName: string; customerId: string; projectName: string }
  // ask if user wants another job for same customer
  | { step: "ask_another_job"; cust: CustomerInput; customerId: string };

const sessions = new Map<string, CreateSession>();

// ─── Helpers ──────────────────────────────────────────────

async function createCustomerViaApi(cust: CustomerInput): Promise<{ id: string; name: string } | string> {
  try {
    const res = await fetch(`${process.env.APP_BASE_URL ?? "http://localhost:3011"}/api/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cust)
    });
    if (!res.ok) return `❌ Customer create failed: ${await res.text()}`;
    return await res.json();
  } catch (err) {
    return `❌ Error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

async function searchCustomers(query: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const res = await fetch(`${process.env.APP_BASE_URL ?? "http://localhost:3011"}/api/customers`);
    if (!res.ok) return [];
    const all = await res.json();
    const q = query.toLowerCase();
    return (Array.isArray(all) ? all : []).filter(
      (c: { name?: string }) => c.name?.toLowerCase().includes(q)
    ).slice(0, 5).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}

async function createJobViaApi(
  job: JobInput, customerId: string, customerName: string
): Promise<{ ok: false; error: string } | { ok: true; id: string; projectName: string; workflowStage: string; category: string; priority: string }> {
  try {
    const input = {
      projectName: job.projectName,
      customerName,
      customerId,
      category: job.category,
      cuttingType: job.cuttingType ?? "",
      material: job.material ?? "",
      collarType: job.collarType ?? "",
      sourceMessage: job.sourceMessage ?? "",
      priority: "NORMAL"
    };
    const res = await fetch(`${process.env.APP_BASE_URL ?? "http://localhost:3011"}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!res.ok) return { ok: false as const, error: await res.text() };
    const j = await res.json();
    return { ok: true as const, id: j.id, projectName: j.projectName, workflowStage: j.workflowStage, category: j.category, priority: j.priority };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "unknown" };
  }
}

async function downloadTelegramPhoto(fileId: string): Promise<{ buffer: Buffer; ext: string }> {
  const url = await getFileUrl(fileId);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Photo download failed ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  // Telegram photos are always JPEG
  return { buffer, ext: "jpg" };
}

async function uploadPhotoToJob(jobId: string, buffer: Buffer, filename: string): Promise<string | null> {
  const r2Worker = process.env.R2_WORKER_URL;

  // 1) Try R2 Worker first (permanent cloud storage)
  if (r2Worker) {
    try {
      const r2Url = `${r2Worker.replace(/\/$/, "")}/${jobId}/${filename}`;
      const headers: Record<string, string> = {};
      const auth = process.env.R2_AUTH_SECRET;
      if (auth) headers["X-Auth-Key"] = auth;
      const res = await fetch(r2Url, {
        method: "PUT",
        headers,
        body: buffer,
      } as unknown as RequestInit);
      if (res.ok) {
        console.log(`R2 upload OK: ${r2Url}`);
        return filename;
      }
      console.warn(`R2 upload failed ${res.status}: ${await res.text()}`);
    } catch (e) {
      console.warn("R2 upload error:", e);
    }
  }

  // 2) Fallback: local API (via cloudflared tunnel)
  try {
    const form = new FormData();
    form.append("kind", "MOCKUP");
    const blob = new Blob([buffer as BlobPart], { type: "image/jpeg" });
    form.append("files", blob, filename);
    const res = await fetch(
      `${process.env.APP_BASE_URL ?? "http://localhost:3011"}/api/jobs/${jobId}/files`,
      { method: "POST", body: form }
    );
    if (!res.ok) {
      const body = await res.text();
      console.warn(`Local upload failed ${res.status}: ${body}`);
      return null;
    }
    return filename;
  } catch (e) {
    console.warn("Local upload error:", e);
    return null;
  }
}

async function sendJobPdf(chatId: string, jobId: string, projectName: string): Promise<void> {
  try {
    const resp = await fetch(
      `${process.env.APP_BASE_URL ?? "http://localhost:3011"}/api/jobs/${jobId}/preview`
    );
    if (!resp.ok) throw new Error(`Preview fetch failed ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    await sendDocument(chatId, buffer, `${projectName.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`);
  } catch (err) {
    await sendMessage(chatId, `❌ PDF gen failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
}

// ─── Dispatcher ───────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const message = update?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const session = sessions.get(chatId);

    // ── Handle photo during add_images ──
    if (session?.step === "add_images" && message.photo) {
      const photos = message.photo;
      // Telegram sends multiple sizes; take the largest
      const best = photos[photos.length - 1];
      if (best?.file_id) {
        await sendMessage(chatId, "Downloading photo…");
        try {
          const { buffer } = await downloadTelegramPhoto(best.file_id);
          const ok = await uploadPhotoToJob(session.jobId, buffer, `telegram_${Date.now()}.jpg`);
          if (ok) {
            await sendMessage(chatId, "✅ Photo saved as mockup. Send more or /skip.");
          } else {
            await sendMessage(chatId, "❌ Failed to save photo.");
          }
        } catch (err) {
          await sendMessage(chatId, `❌ Download failed: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const text = message.text?.trim();
    // If a photo arrives outside add_images, let user know
    if (!text && message.photo) {
      if (session) {
        await sendMessage(chatId, "You're not in photo-upload mode. Send /cancel then /create to start a new order.");
      }
      return NextResponse.json({ ok: true });
    }
    if (!text) return NextResponse.json({ ok: true });

    // ── Cancel any ongoing flow ──
    if (text === "/cancel" && session) {
      sessions.delete(chatId);
      await sendMessage(chatId, "Cancelled.", MENU_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // ── /create from ANY state → reset and start fresh ──
    // This is the "one customer, many jobs" fix: user can always
    // start a new order even while inside add_images / offer_pdf.
    if (text.startsWith("/create") && session) {
      sessions.set(chatId, { step: "choose_customer" });
      await sendMessage(chatId, "Use *existing* customer or create a *new* one?\n\nReply: `existing` or `new`\n\nSend /cancel to stop.");
      return NextResponse.json({ ok: true });
    }

    // ── Handle add_images text commands ──
    if (session?.step === "add_images") {
      if (text === "/skip" || text === "/done" || text.toLowerCase() === "skip" || text.toLowerCase() === "done") {
        sessions.set(chatId, { step: "offer_pdf", jobId: session.jobId, customerName: session.customerName, customerId: session.customerId, projectName: session.projectName });
        await sendMessage(chatId, "Want the PDF job order? Reply `yes` or `/pdf`.\nSend `/done` to finish.");
      } else {
        await sendMessage(chatId, "Send a photo, or /skip to continue.");
      }
      return NextResponse.json({ ok: true });
    }

    // ── Handle offer_pdf ──
    if (session?.step === "offer_pdf") {
      if (text.toLowerCase().startsWith("y") || text.startsWith("/pdf")) {
        await sendMessage(chatId, "Generating PDF…");
        await sendJobPdf(chatId, session.jobId, session.projectName);
      }
      // after PDF (or skipped), ask to create another job for SAME customer
      sessions.set(chatId, { step: "ask_another_job", cust: { name: session.customerName }, customerId: session.customerId });
      await sendMessage(
        chatId,
        `Create *another* job for *${session.customerName}*?\n\nReply \`yes\` to add a new job (no need to re-enter customer),\nor \`no\` to finish.`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Handle ask_another_job (same customer, many jobs) ──
    if (session?.step === "ask_another_job") {
      if (text.toLowerCase().startsWith("y")) {
        sessions.set(chatId, { step: "job_project_name", cust: session.cust, customerId: session.customerId });
        await sendMessage(
          chatId,
          `Customer: *${session.cust.name}*\n\nNow tell me the *project name*:`
        );
      } else {
        sessions.delete(chatId);
        await sendMessage(chatId, "OK. Done! Use /create for a different customer.", MENU_KEYBOARD);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Command dispatcher (only when not mid-conversation) ──
    if (!session) {
      const labelMap: Record<string, string> = {
        "📊 Summary": "/summary",
        "⚡ Urgent": "/urgent",
        "📅 Today": "/today",
        "➕ New Order": "/create",
        "❓ Help": "/help"
      };
      const resolved = labelMap[text] ?? text;

      if (resolved.startsWith("/start") || resolved.startsWith("/help")) {
        await handleStart(chatId);
      } else if (resolved.startsWith("/summary")) {
        await handleSummary(chatId);
      } else if (resolved.startsWith("/urgent")) {
        await handleUrgent(chatId);
      } else if (resolved.startsWith("/today")) {
        await handleToday(chatId);
      } else if (resolved.startsWith("/template")) {
        await handleTemplate(chatId, resolved.replace("/template", ""));
      } else if (resolved.startsWith("/create")) {
        sessions.set(chatId, { step: "choose_customer" });
        await sendMessage(chatId, "Use *existing* customer or create a *new* one?\n\nReply: `existing` or `new`\n\nSend /cancel to stop.");
      } else {
        await sendMessage(chatId, "Unknown command. Tap ❓ Help.");
      }
      return NextResponse.json({ ok: true });
    }

    // ── Rest of conversation steps (unchanged customer + job flow) ──

    if (session.step === "choose_customer") {
      if (text.toLowerCase().startsWith("new") || text.toLowerCase() === "n") {
        sessions.set(chatId, { step: "new_customer_name" });
        await sendMessage(chatId, "Send me the *customer name* (required):");
      } else if (text.toLowerCase().startsWith("exist") || text.toLowerCase() === "e") {
        sessions.set(chatId, { step: "search_customer" });
        await sendMessage(chatId, "Send me the *customer name* to search for:");
      } else {
        await sendMessage(chatId, "Reply `existing` or `new`.\nSend /cancel to stop.");
      }
      return NextResponse.json({ ok: true });
    }

    if (session.step === "search_customer") {
      const prevMatches = session.matches;
      if (prevMatches && /^\d+$/.test(text)) {
        const idx = parseInt(text, 10) - 1;
        if (idx >= 0 && idx < prevMatches.length) {
          const c = prevMatches[idx];
          const cust: CustomerInput = { name: c.name };
          sessions.set(chatId, { step: "job_project_name", cust, customerId: c.id });
          await sendMessage(chatId, `Customer: *${c.name}*\n\nNow tell me the *project name*:`);
          return NextResponse.json({ ok: true });
        }
        await sendMessage(chatId, "Invalid number. Try again or /cancel.");
        return NextResponse.json({ ok: true });
      }
      const matches = await searchCustomers(text);
      if (matches.length === 0) {
        await sendMessage(chatId, `No matches for "${text}". Try again or /cancel.`);
        return NextResponse.json({ ok: true });
      }
      if (matches.length === 1) {
        const c = matches[0];
        const cust: CustomerInput = { name: c.name };
        sessions.set(chatId, { step: "job_project_name", cust, customerId: c.id });
        await sendMessage(chatId, `Customer: *${c.name}*\n\nNow tell me the *project name*:`);
        return NextResponse.json({ ok: true });
      }
      sessions.set(chatId, { step: "search_customer", matches });
      const list = matches.map((m, i) => `${i + 1}. ${m.name}`).join("\n");
      await sendMessage(chatId, `Multiple matches:\n${list}\n\nReply with the number or a more specific name.\n/cancel to stop.`);
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_name") {
      if (!text) { await sendMessage(chatId, "Name is required."); return NextResponse.json({ ok: true }); }
      sessions.set(chatId, { step: "new_customer_company", cust: { name: text } });
      await sendMessage(chatId, `Name: *${text}*\n\nCompany name? (or \`-\` to skip)`);
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_company") {
      sessions.set(chatId, { step: "new_customer_phone", cust: { ...session.cust, companyName: text === "-" ? "" : text } });
      await sendMessage(chatId, "Phone? (or `-` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_phone") {
      sessions.set(chatId, { step: "new_customer_email", cust: { ...session.cust, phone: text === "-" ? "" : text } });
      await sendMessage(chatId, "Email? (or `-` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_email") {
      sessions.set(chatId, { step: "new_customer_address", cust: { ...session.cust, email: text === "-" ? "" : text } });
      await sendMessage(chatId, "Address? (or `-` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_address") {
      sessions.set(chatId, { step: "new_customer_payment", cust: { ...session.cust, address: text === "-" ? "" : text } });
      await sendMessage(chatId, "Payment method? (`CASH`, `BANK_TRANSFER`, or `-` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_payment") {
      sessions.set(chatId, { step: "new_customer_delivery", cust: { ...session.cust, preferredPaymentMethod: text === "-" ? "" : text } });
      await sendMessage(chatId, "Delivery note? (or `-` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_delivery") {
      sessions.set(chatId, { step: "new_customer_notes", cust: { ...session.cust, deliveryNote: text === "-" ? "" : text } });
      await sendMessage(chatId, "Extra notes? (or `-` to skip)\n\nThen I'll create the customer.");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "new_customer_notes") {
      const cust = { ...session.cust, notes: text === "-" ? "" : text };
      await sendMessage(chatId, "Creating customer…");
      const result = await createCustomerViaApi(cust);
      if (typeof result === "string") {
        await sendMessage(chatId, result);
        sessions.delete(chatId);
        return NextResponse.json({ ok: true });
      }
      sessions.set(chatId, { step: "job_project_name", cust, customerId: result.id });
      await sendMessage(chatId, `✅ Customer: *${result.name}*\n\nNow tell me the *project name*:`);
      return NextResponse.json({ ok: true });
    }

    // ── Job details flow ──
    if (session.step === "job_project_name") {
      if (!text) { await sendMessage(chatId, "Project name is required."); return NextResponse.json({ ok: true }); }
      sessions.set(chatId, { ...session, step: "job_brand", projectName: text });
      await sendMessage(chatId, `Project: *${text}*\n\nBrand name? (or \`-\` to skip)`);
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_brand") {
      sessions.set(chatId, { ...session, step: "job_category", brandName: text === "-" ? "" : text });
      await sendMessage(chatId, "Category? (default: `Sublimation`, or \`-\` to accept)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_category") {
      sessions.set(chatId, { ...session, step: "job_size_label", category: text === "-" ? "Sublimation" : text });
      await sendMessage(chatId, "Size label? (e.g. `S-3XL`, or \`-\` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_size_label") {
      sessions.set(chatId, { ...session, step: "job_date_label", sizeLabel: text === "-" ? "" : text });
      await sendMessage(chatId, "Delivery date? (YYYY-MM-DD, or \`-\` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_date_label") {
      sessions.set(chatId, { ...session, step: "job_cutting_type", dateLabel: text === "-" ? "" : text });
      await sendMessage(chatId, "Cutting type? (or \`-\` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_cutting_type") {
      sessions.set(chatId, { ...session, step: "job_material", cuttingType: text === "-" ? "" : text });
      await sendMessage(chatId, "Material? (or \`-\` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_material") {
      sessions.set(chatId, { ...session, step: "job_collar_type", material: text === "-" ? "" : text });
      await sendMessage(chatId, "Collar type? (or \`-\` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_collar_type") {
      sessions.set(chatId, { ...session, step: "job_source_message", collarType: text === "-" ? "" : text });
      await sendMessage(chatId, "WhatsApp/order text? Paste it (or \`-\` to skip)");
      return NextResponse.json({ ok: true });
    }

    if (session.step === "job_source_message") {
      const job: JobInput = {
        projectName: session.projectName,
        brandName: session.brandName,
        category: session.category,
        sizeLabel: session.sizeLabel,
        dateLabel: session.dateLabel,
        cuttingType: session.cuttingType,
        material: session.material,
        collarType: session.collarType,
        sourceMessage: text === "-" ? "" : text
      };
      const summary = [
        `*Customer:* ${session.cust.name}${session.cust.companyName ? ` (${session.cust.companyName})` : ""}`,
        `*Project:* ${job.projectName}`,
        `*Category:* ${job.category}`,
        ...(job.brandName ? [`*Brand:* ${job.brandName}`] : []),
        ...(job.sizeLabel ? [`*Size:* ${job.sizeLabel}`] : []),
        ...(job.dateLabel ? [`*Date:* ${job.dateLabel}`] : []),
        ...(job.cuttingType ? [`*Cut:* ${job.cuttingType}`] : []),
        ...(job.material ? [`*Material:* ${job.material}`] : []),
        ...(job.collarType ? [`*Collar:* ${job.collarType}`] : [])
      ].join("\n");
      sessions.set(chatId, { step: "confirm", cust: session.cust, customerId: session.customerId, job });
      await sendMessage(chatId, `Summary:\n\n${summary}\n\nReply \`yes\` to confirm, \`no\` to cancel.`);
      return NextResponse.json({ ok: true });
    }

    // ── Confirm + create → add_images → offer_pdf ──
    if (session.step === "confirm") {
      if (text.toLowerCase().startsWith("y")) {
        sessions.delete(chatId);
        await sendMessage(chatId, "Creating job…");
        const result = await createJobViaApi(session.job, session.customerId, session.cust.name);
        if (!result.ok) {
          await sendMessage(chatId, `❌ ${result.error}`, MENU_KEYBOARD);
          return NextResponse.json({ ok: true });
        }
        sessions.set(chatId, { step: "add_images", jobId: result.id, customerName: session.cust.name, customerId: session.customerId, projectName: result.projectName });
        await sendMessage(
          chatId,
          `✅ Job created: *${result.projectName}* — ${result.workflowStage}\nCustomer: ${session.cust.name}\nCategory: ${result.category}\nPriority: ${result.priority}\n\nNow send *photos* to add as mockups, or /skip.`
        );
      } else {
        sessions.delete(chatId);
        await sendMessage(chatId, "Cancelled.", MENU_KEYBOARD);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
