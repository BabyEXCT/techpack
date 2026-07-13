# WhatsApp intake automation design

## Purpose

This feature makes the app easier for internal daily use by accepting normal WhatsApp order messages and converting them into a reviewable order draft.

The goal is not to force customers into a rigid template. The goal is to let customers keep using familiar WhatsApp habits, while the app does the hard work of interpreting the message and only asking for manual review when needed.

## Scope

This design covers:

- multi-format WhatsApp parsing for internal paste-only use
- grouped size heading support
- safer row confidence and review behavior
- automatic front and back mockup detection from filenames
- one general placement note per job
- in-browser preview of the final combined supplier PDF

This design does not cover:

- customer-facing forms
- direct WhatsApp integrations
- OCR from screenshots
- full per-logo placement matrix editing

## User

Primary user:

- internal staff or owner who receives orders in WhatsApp, pastes them into the app, reviews the draft, and generates supplier documents

External customers do not use this feature directly. Their experience should remain as simple and natural as possible inside WhatsApp.

## Product direction

The app should behave like a WhatsApp order interpreter.

The user pastes raw text into the app. The system then:

1. detects the most likely input pattern
2. extracts rows, sizes, numbers, quantities, and notes
3. marks unclear items for review
4. generates size totals from confirmed rows
5. lets the user preview the final combined PDF before download

The system should prioritize correctness and transparency over aggressive guessing.

## Supported input patterns

### Grouped size headings

The parser must support headings such as:

```text
size S
size M
size XL
size 2XL
```

All roster rows that follow inherit the active size until another size heading appears.

Example:

```text
size S
1. ALYAA - 13
2. TIKAH - 04
```

Should become:

- `ALYAA / 13 / S`
- `TIKAH / 04 / S`

### Inline size rows

The parser must continue to support existing inline formats such as:

```text
ALYAA 13 S
Naz(2XL)x1
LUFFY K (XL) x2 (retro collar)
```

### Mixed WhatsApp rows

The parser must tolerate partially structured text, including:

- numbered rows like `1. NAME - 13`
- invisible WhatsApp characters
- mixed punctuation
- names with dots, initials, or short suffixes
- missing numbers
- missing notes

### Fallback rows

If the parser cannot confidently determine a size or row structure, it must create a draft row marked for review instead of silently counting it.

## Parser strategy

The parser should process input in this order:

1. grouped size heading detection
2. inline size row detection
3. quantity and notes extraction
4. fallback detection for unclear rows

### Grouped size mode

When a heading line matches `size <token>`, the parser stores that token as the current active size.

Supported normalized sizes:

- `XS`
- `S`
- `M`
- `L`
- `XL`
- `2XL`
- `3XL`
- `4XL`
- `5XL`

Accepted user variants may include lowercase and spacing variants such as `2xl`, `2 xl`, `xl`.

### Row extraction

For grouped rows like:

```text
1. ALYAA - 13
```

the parser should extract:

- name: `ALYAA`
- number: `13`
- size: inherited active size
- qty: `1` unless another quantity is explicitly found

### Notes extraction

The parser should continue extracting notes such as:

- `retro collar`
- `captain`
- `biasa`

If notes are ambiguous, preserve the text in remarks rather than discarding it.

## Confidence model

Each row should conceptually fall into one of three states:

- `parsed`
- `inherited`
- `needs_review`

`parsed` means the row had a clear inline size or structure.

`inherited` means the row relied on an active grouped size heading.

`needs_review` means the row could not be safely completed.

The first version does not need a complex scoring engine, but the UI behavior should reflect these states.

## Review behavior

The review page should make parser uncertainty visible.

### Required behavior

- rows with unresolved fields should show a visible warning state
- rows without a valid size should appear as `Needs review` or `Unassigned`
- totals should exclude unresolved rows until fixed
- editing a row should immediately recalculate totals

### Editing support

The review screen must already support editing. This feature extends that flow by making parser errors easier to see and faster to fix.

The user should be able to correct:

- name
- number
- size
- qty
- remarks

## Front and back mockup detection

Mockup image roles should be inferred from filenames.

### Filename mapping

Front keywords:

- `front`
- `depan`

Back keywords:

- `back`
- `belakang`

Matching should be case-insensitive.

### Safety rule

If a filename does not clearly match front or back, the system must not guess.

It should classify that image as `Unassigned`.

### Review behavior

The review screen should show mockups grouped as:

- `Front`
- `Back`
- `Unassigned`

This allows the user to quickly spot missing or unclear file naming.

## Placement note

Each job should include one general placement note field.

This field is free text and should be usable for instructions such as:

```text
left chest logo, sponsor center, back name 3 inch
```

The note should appear in:

- review screen
- supplier tech pack
- artwork confirmation page

This keeps the workflow lightweight and avoids forcing the user into a detailed placement table for every job.

## PDF preview

The generate step should support in-browser preview of the final combined supplier PDF.

### Preview target

The preview should show the final combined PDF, not just the tech pack section.

This is the exact document the supplier will receive, so it is the most useful validation point.

### Preview goals

The preview should help the user verify:

- section order
- branding
- front and back mockup placement
- placement note visibility
- artwork confirmation page content
- order sheet totals and rows

The preview should happen before final download, not replace download.

## Data flow

### Intake

The user pastes raw WhatsApp text into `New job`.

The parser returns:

- roster rows
- size totals
- unresolved rows list if needed

### Review

The job review page loads:

- parsed roster
- mockup grouping
- placement note
- existing job fields

The user corrects anything unclear and saves.

### Generate

The generation step uses the reviewed job state and produces:

1. supplier tech pack section
2. artwork confirmation page
3. order sheet
4. final combined supplier PDF

### Preview

The final combined PDF can be opened in-browser before download.

## Error handling

The system should not silently produce false totals.

Rules:

- unresolved rows do not count toward size totals until fixed
- unclear image role detection becomes `Unassigned`
- parse warnings should be visible on review
- generation should still work when possible, but unresolved items should be obvious

## Success criteria

This feature is successful when:

- normal WhatsApp grouped-size orders parse correctly without manual rewriting
- older inline formats still continue to work
- front and back mockups usually auto-classify from filenames
- unclear cases are visible rather than hidden
- the user can preview the final combined PDF before download
- customers do not need to learn a strict machine format

## Recommended implementation order

1. extend parser with grouped size headings and safer fallback rows
2. surface unresolved row state in the review UI
3. add placement note field through intake, review, storage, and PDF output
4. add filename-based front and back mockup grouping
5. add final combined PDF preview in-browser

