# Date Calendar Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual date text inputs with a mobile-friendly calendar picker on both New Job and Review pages, defaulting to today for new jobs.

**Architecture:** Use native HTML date input (`type="date"`) so iOS/Android show a calendar UI automatically. Store the value as the existing `dateLabel` string (`YYYY-MM-DD`) to keep DB/PDF compatibility.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest

---

## File map

**Modify:**
- `src/components/jobs/job-form.tsx` (New job date input)
- `src/components/jobs/review-job-client.tsx` (Review date input)

**Optional tests (only if already present / easy):**
- No new tests required; verify via `npm test` + manual check in browser.

---

### Task 1: New job date picker + default today

**Files:**
- Modify: `src/components/jobs/job-form.tsx`

- [ ] **Step 1: Implement default today value**

In `JobForm()`, initialize `dateLabel` to today:

```ts
const today = new Date().toISOString().slice(0, 10);
const [dateLabel, setDateLabel] = useState(today);
```

- [ ] **Step 2: Convert input to native date**

Change the Date input:

```tsx
<input
  type="date"
  value={dateLabel}
  onChange={(event) => setDateLabel(event.target.value)}
  className="w-full rounded-md border px-3 py-2"
/>
```

- [ ] **Step 3: Run unit tests**

Run:

```powershell
npm test
```

Expected: PASS

---

### Task 2: Review page date picker

**Files:**
- Modify: `src/components/jobs/review-job-client.tsx`

- [ ] **Step 1: Convert input to native date**

Change the Date input to:

```tsx
<input
  type="date"
  value={job.dateLabel ?? ""}
  onChange={(event) => updateField("dateLabel", event.target.value)}
  className="w-full rounded-md border px-3 py-2"
/>
```

- [ ] **Step 2: Ensure save already includes dateLabel**

Verify `onSave()` PATCH body includes:

```ts
dateLabel: localDraft.dateLabel ?? "",
```

- [ ] **Step 3: Run unit tests**

Run:

```powershell
npm test
```

Expected: PASS

---

### Task 3: Manual verification

- [ ] **Step 1: Run dev server**

Run:

```powershell
npm run dev -- -p 3011
```

- [ ] **Step 2: Verify New Job**

1. Open `/jobs/new`
2. Confirm Date shows a calendar picker and is pre-filled with today

- [ ] **Step 3: Verify Review**

1. Open any job `/jobs/<id>/review`
2. Confirm Date shows a calendar picker
3. Change date, click Save, refresh page
4. Confirm the date persists

---

## Self-review

- Spec coverage: matches `docs/superpowers/specs/2026-06-17-date-calendar-picker-design.md`
- No schema or PDF changes required
- Keeps `YYYY-MM-DD` format by using native date input value

