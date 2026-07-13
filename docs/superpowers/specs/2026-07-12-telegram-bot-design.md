# Telegram Bot Integration — Design Spec

**Date:** 2026-07-12
**App:** Techpack Mobile App (Next.js + Prisma + SQLite)

## Overview

Add a Telegram bot for monitoring, order creation, and message templates. The bot talks to the same app server — no separate process needed.

---

## Section 1: Bot Infrastructure & Webhook

### Setup

1. User creates bot via Telegram's `@BotFather`, gets a token.
2. Token + admin chat ID stored in `.env.local`:
   ```env
   TELEGRAM_BOT_TOKEN=xxx
   TELEGRAM_ADMIN_CHAT_ID=yyy
   ```
3. One-time webhook registration points Telegram to `/api/telegram/webhook`. The webhook route is the single entry point for all bot messages.

### Files

| File | Purpose |
|---|---|
| `src/lib/telegram/send.ts` | Core `sendMessage(botToken, chatId, text)` helper. Uses Telegram Bot API directly via `fetch`. |
| `src/app/api/telegram/webhook/route.ts` | POST handler — receives updates from Telegram, dispatches to command handlers. |
| `src/app/api/telegram/test/route.ts` | GET handler — sends a test message to the configured admin chat ID. Used to verify env config. |
| `src/app/api/telegram/register-webhook/route.ts` | POST handler — called once to tell Telegram where to send updates. |

### Security

- Webhook route validates that `TELEGRAM_BOT_TOKEN` is set.
- In this version, only the admin chat ID receives messages (no multi-user auth).
- All responses go to that chat only.

### Deployment notes

- Webhook URL must be HTTPS in production. For local dev, use a tunnel or just set up the webhook pointing to production URL. The `register-webhook` endpoint can be called again after deploy.

---

## Section 2: Bot Commands

### Supported commands

| Command | Description |
|---|---|
| `/start` | Welcome message listing all commands |
| `/help` | Same as start |
| `/summary` | Current job counts by workflow stage (NEW / DESIGN / WAITING_APPROVAL / PRODUCTION / DONE) |
| `/urgent` | List all URGENT and RUSH priority jobs |
| `/today` | Show jobs with today's date label |
| `/create` | Initiate order creation flow. Bot asks for order text, then runs `parseWhatsAppOrder` and creates job via API |
| `/template <name>` | Fetch a named message template, auto-fill placeholders from a recent job, reply with copy-paste-ready customer text |

### Dispatch logic (in webhook route)

```
POST /api/telegram/webhook
  → parse message text
  → match command with regex
  → call handler function
  → send reply via sendMessage()
```

Each handler is a pure async function that receives `(chatId, args)` and calls `sendMessage` to respond.

---

## Section 3: Order Creation from Telegram

### Flow

1. User sends `/create` to bot.
2. Bot replies: "Send me the order text (WhatsApp format)."
3. User pastes WhatsApp-style order text (same format as the web form's textarea).
4. Bot runs `parseWhatsAppOrder(text)` from `src/lib/jobs/parse-whatsapp.ts`.
5. Bot calls `POST /api/jobs` with the parsed data to create the job in DB.
6. Bot replies: "✅ Job created: [projectName] — [workflowStage] ([priority])"

### What's reused

- `parseWhatsAppOrder` — already handles roster rows, sizes, quantities.
- `POST /api/jobs` — already accepts the same schema.
- No new parsing logic needed.

### What's new

- A handler in the webhook that orchestrates the multi-step conversation (step 1: receive `/create`, step 2: receive text, step 3: parse + create).
- Session state stored in memory (a `Map<chatId, {state: "awaiting_order_text"}>`). Survives within the server's lifetime. No DB needed for session state.

### Edge cases

- Parser fails → bot replies with the error and asks user to re-send.
- Missing required fields (project name) → bot shows what's missing.
- Network/DB error → bot says "Something went wrong, try again later."

---

## Section 4: Message Templates

### Model

```prisma
model MessageTemplate {
  id           String   @id @default(cuid())
  name         String   @unique  // e.g. "customer_confirmation"
  label        String            // e.g. "Customer confirmation"
  body         String            // template text with {{placeholders}}
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Placeholder system

Template body supports `{{placeholder}}` syntax. When the bot fills a template, it substitutes:
- `{{customerName}}` — from the job's customer name
- `{{projectName}}` — from the job's project name
- `{{category}}` — job category
- `{{sizeLabel}}` — size range
- `{{dateLabel}}` — target date
- `{{cuttingType}}`, `{{material}}`, `{{collarType}}` — garment specs
- `{{workflowStage}}` — current stage
- `{{priority}}` — current priority

### Web UI

- New page `/templates` — list all templates with name + label + preview snippet.
- New page `/templates/new` and `/templates/[id]/edit` — create/edit template body.
- Template body is a textarea with placeholder hints shown below.

### Bot usage

```
/template customer_confirmation
```
Bot finds the template, fills placeholders from a recently created or mentioned job, and replies with the formatted text ready to copy-paste. The user selects which job to reference by including a job ID or project name in the command: `/template customer_confirmation Acme FC`.

---

## Section 5: Notifications (Automatic)

### Events that trigger bot DM

All notifications are sent to the admin chat ID when the corresponding server-side action completes.

| Event | When | Message example |
|---|---|---|
| Job created | After POST /api/jobs | 🆕 New job: Acme FC (URGENT) |
| Workflow stage changed | After PATCH /api/jobs/[id] (stage field) | 🔄 Acme FC moved to PRODUCTION |
| Priority set to URGENT/RUSH | On create or update | ⚡ Acme FC marked as URGENT |
| Invoice payment received | After POST /api/invoices/[id]/payments | 💰 Invoice TP-042 paid (RM 500) |
| Invoice overdue | Checked daily (see cron) | ⏰ Invoice TP-042 is overdue |
| New customer registered | After POST /api/customers | 👤 New customer: John Doe |

### Implementation

- Notification logic lives in `src/lib/telegram/notify.ts` with a function per event type.
- Each API route that triggers an event calls the appropriate notify function (fire-and-forget, no await blocking the response).
- Cron-based check (invoice overdue) runs via a scheduled endpoint or external cron job.

---

## Section 6: Database Changes

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

Run `prisma migrate dev --name add_message_template` after adding the model.

---

## Non-Goals (for this version)

- No multi-user auth (admin-only).
- No interactive buttons (inline keyboards) — plain text commands only.
- No editing templates FROM Telegram — only from the web UI.
- No scheduled summary reports (daily digests) — manual commands only.

---

## Files Summary

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add `MessageTemplate` model |
| `src/lib/telegram/send.ts` | Create — sendMessage helper |
| `src/lib/telegram/notify.ts` | Create — notification functions per event |
| `src/lib/telegram/handlers.ts` | Create — command handler functions |
| `src/app/api/telegram/webhook/route.ts` | Create — webhook receiver + dispatcher |
| `src/app/api/telegram/test/route.ts` | Create — test endpoint |
| `src/app/api/telegram/register-webhook/route.ts` | Create — one-time setup |
| `src/app/templates/page.tsx` | Create — template list page |
| `src/app/templates/new/page.tsx` | Create — new template page |
| `src/app/templates/[id]/edit/page.tsx` | Create — edit template page |
| `src/app/api/templates/route.ts` | Create — CRUD for templates |
| `src/app/api/templates/[id]/route.ts` | Create — single template CRUD |
| Various API routes | Patch — add notification calls |

---

## Notification Integration Points

| Existing route | Add call |
|---|---|
| `POST /api/jobs` | `notifyJobCreated()` |
| `PATCH /api/jobs/[jobId]` | `notifyStageChange()` + `notifyPriorityChange()` |
| `POST /api/invoices/[id]/payments` | `notifyPaymentReceived()` |
| `POST /api/customers` | `notifyNewCustomer()` |
