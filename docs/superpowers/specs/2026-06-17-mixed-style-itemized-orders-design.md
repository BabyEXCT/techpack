# Mixed-style itemized orders design

## Goal

Allow one customer order to contain multiple apparel styles in a single job, while keeping each style separated clearly for review, totals, and supplier output.

This is for cases where one customer sends one WhatsApp order containing different combinations such as:

- Muslimah cutting
- Standard round neck long sleeve
- Standard cutting with polo collar

## Product direction

One customer order should remain **one job**.

Inside that job, the system should create multiple **item sections** when it detects different styles.

This avoids splitting one customer conversation into many jobs, while still making supplier preparation much clearer.

## Scope

This design covers:

- one WhatsApp message containing multiple styles
- automatic splitting into item sections by style keywords
- one job containing multiple item groups
- separate review and totals per item group
- grouped supplier output per item

This design does not cover:

- customer-facing forms
- manual visual block selection as the main method
- automatic creation of separate jobs for each style

## Input behavior

The user pastes one WhatsApp message into the app.

The parser scans the message for style-defining keywords such as:

- `muslimah`
- `polo`
- `round neck`
- `long sleeve`

The system then splits the order into separate item sections automatically.

## Item section naming

Detected item sections should use the style name directly.

Examples:

- `Muslimah`
- `Polo`
- `Round Neck Long Sleeve`

This keeps the review page and supplier output easier to read.

## Data model direction

The current app stores one job with one roster and one set of apparel settings.

This feature requires one job to contain multiple item groups.

Each item group should contain its own:

- item name
- cutting
- collar
- sleeve type
- material
- roster rows
- size totals
- notes if needed

The parent job should still keep shared order-level fields such as:

- project name
- customer name
- brand name
- general placement note if shared
- uploaded mockups and logos if shared

## Parsing behavior

### Detection

The parser should scan the pasted message in sequence and identify when the message changes from one style group to another.

The first version should use keyword-driven grouping.

### Grouping rule

When a new style keyword block begins, the parser should start a new item section.

All following roster rows belong to that section until another style block is detected.

### Safety

If the parser cannot confidently split a block:

- keep the block in the current item section if confidence is acceptable, or
- mark the block for review

The parser should not silently guess a style split that could produce the wrong supplier totals.

## Review experience

The review page should have two layers:

### Order-level section

At the top:

- project name
- customer name
- brand name
- shared notes
- mockups/logos if shared

### Item-level sections

Below that:

- one editable card per detected item section

Each item card should show:

- item name
- cutting
- collar
- sleeve type
- material
- roster rows
- size totals

Each item card should be editable independently.

This makes it easier to update only one style when the customer changes part of the order.

## Generation behavior

Supplier output should be grouped by item section.

The final combined supplier document should clearly separate:

1. item section 1 tech pack content
2. item section 1 order list
3. item section 2 tech pack content
4. item section 2 order list
5. and so on

This avoids mixing Muslimah and Polo rows into one confusing supplier page.

## Output naming

Within the supplier file, item section headings should use the detected names directly.

Examples:

- `Muslimah`
- `Polo`
- `Round Neck Long Sleeve`

If the detected name is too vague, the system may still display:

- `Item 1 - Muslimah`
- `Item 2 - Polo`

but the style name should remain visible.

## Recommended first version

For the first version, keep it practical:

- one job can hold multiple item groups
- auto-detect sections by style keywords
- allow editing each item separately in review
- generate supplier output grouped by item

Do not add advanced per-item version history or cross-item dependency logic yet.

## Acceptance criteria

- one pasted WhatsApp message can produce multiple style-based item sections
- one customer order still remains one job
- each item section has its own apparel settings, roster, and size totals
- the review page shows separate editable blocks for each item
- supplier output is grouped clearly by item section

