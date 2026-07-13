# Section upload group and image labeling design

## Goal

Allow each section inside one order to have one upload group that accepts multiple images, then lets the user label each uploaded image so the PDF generator can place the right image in the right section.

This solves the case where one order contains multiple shirt types or collar types and each section needs its own:

- mockup
- cut pieces
- color code reference

## Product direction

One order remains one job.

One job can contain multiple sections.

Each section should have one upload group for section-specific images.

After upload, each image should be auto-detected from the filename first, then remain editable by the user.

## Scope

This design covers:

- one upload group per section
- multiple images per section
- filename-based auto-detection after upload
- manual correction after auto-detection
- label-based PDF placement
- a simple naming template for the design team
- support for both separate mockup sides and one combined mockup image

This design does not cover:

- mandatory separate upload boxes
- customer-facing upload flows

## Upload behavior

Each section card should have one upload group.

Inside that upload group, the user can upload multiple images related to that section.

Example for `Polo` section:

- polo mockup
- polo cut pieces
- polo color code

Example for `Round Neck` section:

- round neck mockup
- round neck cut pieces
- round neck color code

## File naming template

To make uploads easier for the design team and improve auto-detection, the app should support one simple naming convention:

```text
[section]-mockup-front
[section]-mockup-back
[section]-mockup-front-back
[section]-mockup-full
[section]-cutpiece
[section]-colorcode
```

Examples:

- `polo-mockup-front.jpg`
- `polo-mockup-back.jpg`
- `polo-mockup-front-back.jpg`
- `polo-mockup-full.jpg`
- `polo-cutpiece.jpg`
- `polo-colorcode.jpg`
- `muslimah-mockup-front.jpg`
- `muslimah-mockup-front-back.jpg`
- `muslimah-cutpiece.jpg`
- `muslimah-colorcode.jpg`

This naming style is short enough for designers to follow consistently and explicit enough for the app to classify files reliably.

## Mockup variants

The system should support three mockup styles inside a section:

- `Front only`
- `Back only`
- `Front + Back combined`

That means the design team can work in either of these ways:

### Separate mockups

- `polo-mockup-front.jpg`
- `polo-mockup-back.jpg`

### One combined mockup image

- `polo-mockup-front-back.jpg`
- `polo-mockup-full.jpg`

## Label detection behavior

After upload, the app should auto-detect a suggested label from the filename first.

Supported labels:

- `Mockup`
- `Cut Pieces`
- `Color Code`

The detected label should appear immediately in the UI, but the user must still be able to change it manually before generation.

### Recommended filename keywords

`Mockup`

- `mockup`
- `front`
- `back`
- `front-back`
- `full`
- `jersey`

`Cut Pieces`

- `cutpiece`
- `cut-piece`
- `cut`
- `pieces`

`Color Code`

- `colorcode`
- `color`
- `colour`
- `code`
- `pantone`

## Why hybrid detection

Filename-based detection is useful because it reduces repetitive manual work when the team follows a consistent naming pattern.

Manual correction is still required because:

- filenames may still be inconsistent sometimes
- one keyword may appear in the wrong file name
- the final PDF placement must remain under user control

This hybrid flow is safer than full auto-detection and faster than fully manual labeling.

## Review UI behavior

Each section card should show:

- section name
- one upload group
- uploaded image list
- detected label for each uploaded image
- editable label selector for each uploaded image

Example item row behavior:

- image thumbnail or filename
- detected label badge
- label selector:
  - `Mockup`
  - `Cut Pieces`
  - `Color Code`

## Storage behavior

Each uploaded image should remain attached to its section.

Each image record should store:

- file reference
- section ownership
- detected label
- chosen label

Generation should use the final chosen label. If the user does not change it, the detected label becomes the effective label.

This allows generation to filter images by:

1. section
2. label

## Generation behavior

The final output remains one combined PDF.

For each section:

- use the image labeled `Mockup` as the section mockup
- use images labeled `Cut Pieces` in the cut pieces area/page
- use images labeled `Color Code` in the color confirmation area/page

Only images labeled for that section should appear in that section.

### Mockup resolution rule

When a section has multiple mockup images, the system should resolve them in this order:

1. if a combined mockup exists, use the combined mockup image for that section
2. otherwise, if separate `front` and `back` mockups exist, use both
3. otherwise, if only one mockup image exists, use that one

This allows the team to work with either a single combined visual or separate front/back references.

## Fallback behavior

If a section has no image labeled `Mockup`, the system may still use the existing shared mockup fallback if available.

If a section has multiple mockup images:

- prefer a combined `front-back` or `full` mockup first
- otherwise use separate front/back files
- otherwise use the single available mockup

If a section has no `Cut Pieces` image:

- show nothing for cut pieces in that section

If a section has no `Color Code` image:

- show nothing for color confirmation in that section

## Acceptance criteria

- each section has one upload group
- multiple images can be uploaded into that group
- each uploaded image can be auto-detected from filename
- each uploaded image can still be corrected manually
- PDF generation uses labels to place the right image in the right section
- the app accepts both separate and combined mockup naming
- one order still produces one combined PDF
