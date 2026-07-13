# Section-based single PDF design

## Goal

Keep one customer order as one PDF, but split the content inside that PDF into clear section-based groups such as:

- Standard Cutting
- Muslimah
- Polo

Each section should carry its own production references and order list, so the supplier receives one file but can still work section by section without confusion.

## Product direction

One customer order remains **one job**.

One generated supplier output remains **one combined PDF**.

Inside that combined PDF, the order is split into **sections** based on item type or cutting/collar grouping.

## Scope

This design covers:

- one combined PDF
- multiple internal sections in the same PDF
- separate order lists per section
- separate totals per section
- shared mockup with optional per-section override
- per-section artwork cut pieces
- per-section color confirmation

This design does not cover:

- splitting one order into multiple PDF files
- requiring every section to always have its own mockup
- customer-facing uploads

## Section behavior

Each section inside the same order should represent one production grouping, such as:

- Standard Cutting
- Muslimah
- Polo

Each section should be reviewed and generated independently inside the same job.

## Order list behavior

The order list should not be mixed across sections.

Example:

- `Standard Cutting` list only contains Standard Cutting rows
- `Muslimah` list only contains Muslimah rows
- `Polo` list only contains Polo rows

Each section should have its own size totals and its own filtered roster list.

## Mockup behavior

### Shared mockup

The job can still have one shared mockup at the order level.

### Section override

Each section may optionally have its own section-specific mockup.

### Resolution rule

When generating the PDF:

- if a section-specific mockup exists, use it for that section
- otherwise, use the shared mockup

This keeps the default workflow simple while still supporting collar/cutting-specific visuals.

## Artwork cut pieces

Artwork cut pieces should be uploaded and stored **per section**.

Example:

- Standard Cutting section has its own cut pieces
- Muslimah section has its own cut pieces
- Polo section has its own cut pieces

These should appear only inside the matching section of the combined PDF.

## Color confirmation

Color confirmation should also be uploaded and stored **per section**.

This is important because different sections may use different color treatments or construction references.

These should appear only inside the matching section of the combined PDF.

## Review structure

The review page should contain:

### Job-level area

- project name
- customer name
- shared notes
- shared mockup

### Section cards

For each section:

- section name
- roster rows for that section
- size totals for that section
- optional section-specific mockup
- artwork cut pieces upload
- color confirmation upload

## Generation behavior

The generated output remains a single PDF.

Inside that PDF, sections should be rendered one after another.

Recommended order for each section:

1. section header
2. section mockup or shared mockup fallback
3. artwork cut pieces
4. color confirmation
5. section order list
6. section totals

Then move to the next section in the same PDF.

## Fallback rules

### Mockup

- use section mockup if available
- otherwise use shared mockup

### Artwork cut pieces

- no shared fallback
- section upload only

### Color confirmation

- no shared fallback
- section upload only

This keeps the most critical per-section production references accurate.

## Acceptance criteria

- one order generates one combined PDF
- each section has its own filtered order list
- each section has its own totals
- each section can use a section-specific mockup
- if no section mockup exists, shared mockup is used
- each section has its own artwork cut pieces
- each section has its own color confirmation
- the final PDF is easier for supplier to read section by section

