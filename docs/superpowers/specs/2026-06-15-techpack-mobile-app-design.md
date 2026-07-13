# Mobile-first tech pack generator design

## Purpose

This system is for a sublimation apparel business that currently collects order details from WhatsApp, prepares design assets in Adobe Illustrator, uses mockups to show customers, and manually builds tech packs for suppliers.

The goal is to reduce repetitive work and make the process usable from a phone as well as a desktop browser.

## Problem

The current workflow depends on mixed inputs:

- WhatsApp messages with names, numbers, sizes, and notes
- design files or exports from Adobe Illustrator
- mockup images for customer approval
- manual document assembly for production

These inputs are inconsistent from one order to another, so a fully automatic system would be unreliable. The design therefore uses a standard intake and review step before generation.

## Product direction

The recommended product is a mobile-first web app.

It should work well on a phone for quick order intake, editing, review, and generation. It should also work on desktop for larger file handling and admin tasks.

Design work itself still happens outside the system in Adobe Illustrator. The web app manages order data, uploads, generation, and document packaging.

## Users

Primary user:

- business owner or staff managing customer orders and supplier handoff

Secondary user:

- internal helper who may prepare order records, verify sizes, or send generated files

External recipients:

- customers receiving mockup outputs
- suppliers receiving tech pack and order details

## Main workflow

### Intake

The user starts a new job from a phone or desktop browser.

The intake method is a WhatsApp-oriented page where the user:

- pastes customer text from WhatsApp
- uploads available files such as logos, mockups, PDF exports, artwork exports, or reference images
- optionally adds quick notes

### Normalization

The system extracts and structures the order into a single job record.

Fields include:

- project name
- team or customer name
- category
- material
- collar type
- cutting type
- color references
- artwork references
- logo placements
- player list
- names
- numbers
- sizes
- notes for production

Because WhatsApp input varies, extraction is treated as a draft, not final truth.

### Review

Before generation, the user reviews and edits the extracted record.

This screen must be optimized for phone use:

- large text fields
- simple grouped sections
- easy row editing for names, numbers, and sizes
- quick totals by size
- clear missing-field warnings

### Generation

After review, the system generates a complete job package.

Default outputs:

- customer mockup set
- supplier tech pack PDF
- size or order sheet
- archive folder for the job

## Output package

Each order should produce one consistent folder structure.

Example:

```text
job-2026-06-15-kraxtom-fc/
  01_customer_mockup/
  02_supplier_techpack/
  03_order_sheet/
  04_source_files/
  05_exports/
```

The system should generate predictable file names so jobs are easy to search later.

## Supplier tech pack structure

Based on the uploaded sample, the first supported tech pack template should include:

1. cover page
2. project details page
3. main mockup and summary page
4. artwork confirmation page
5. player list and size breakdown pages
6. production notes page if notes are provided

The layout should be template-based so the same visual structure can be reused for future jobs with different data.

## Customer output structure

Customer-facing output should be lighter than the supplier pack.

Recommended first version:

- mockup preview images
- summary page with project name and selected options

This keeps the customer package simple while the supplier pack remains detailed.

## Data model

Each job record should contain:

- job id
- created date
- project name
- customer or team name
- category
- material
- collar type
- cutting type
- color notes
- source message text
- uploaded files
- artwork preview images
- mockup images
- roster rows
- size totals
- production notes
- generated output references
- status

Each roster row should contain:

- row number
- name
- jersey number
- size
- remarks

## Core components

### Mobile intake page

Used to create a new job quickly from WhatsApp text and uploaded files.

### Job parser

Extracts useful fields from pasted text and builds draft rows for the roster and size counts.

### Review editor

Allows correction of extracted data before generation. This is the reliability layer of the whole product.

### Template engine

Places text, images, colors, and tables into predefined customer and supplier templates.

### File manager

Stores source files, generated outputs, and archive folders under each job.

### Job archive

Provides searchable access to previous jobs by date, project name, or customer name.

## Reliability rules

The system should not silently guess when important information is missing.

Examples:

- if project name is missing, ask the user to enter it
- if a roster row has a size but no name, flag it
- if no artwork or mockup file exists, allow generation only for the order sheet, not the full tech pack

The review step should block final generation when required fields are incomplete.

## Phone usability requirements

The phone experience is a key requirement, not a secondary one.

The interface should:

- use large tap targets
- avoid dense tables on first view
- let the user edit roster rows in stacked cards or simplified rows
- support image upload directly from the phone
- support copy-paste from WhatsApp with minimal cleanup
- allow sharing generated files easily to WhatsApp or other apps

## Desktop role

Desktop remains useful for:

- preparing Illustrator exports
- uploading larger sets of files
- admin cleanup
- template maintenance

The system should support both phone and desktop with one shared job record.

## Architecture

Recommended architecture:

- mobile-first web frontend
- backend API for job processing and file handling
- document generation service for PDFs and export packages
- persistent storage for job records and files

This can be implemented as a standard web app rather than a native mobile app, which keeps development simpler and makes it available on both phone and desktop immediately.

## Generation logic

The system should treat generation as deterministic template filling.

Inputs:

- reviewed job record
- uploaded artwork and mockup assets
- selected template

Outputs:

- customer pack
- supplier tech pack PDF
- size sheet
- archive package

If some assets are missing, the system should generate only the outputs that can be completed and clearly show what was skipped.

## Error handling

Common failure cases:

- pasted WhatsApp text is messy or incomplete
- names, numbers, and sizes are merged in inconsistent formats
- required images are missing
- uploaded files do not match expected formats

The system should respond with clear correction prompts instead of technical errors.

## Security and access

The first version can assume a single business owner or a very small team.

Basic login is enough at first. More complex permissions can wait until multi-user collaboration becomes necessary.

## First release scope

Version 1 should focus on the smallest useful flow:

- create job from WhatsApp paste and file upload
- review and fix parsed order data
- generate supplier tech pack
- generate size or order sheet
- save a clean archive folder

Version 2 can add:

- customer mockup automation
- better parsing for more WhatsApp formats
- reusable presets for collar, cutting, material, and layout choices
- previous-job duplication for repeat customers

## Testing

Testing should focus on practical business cases:

- messy WhatsApp roster formats
- missing values in roster rows
- large team orders with many names
- jobs with incomplete assets
- generation from phone screen sizes
- sharing final files from phone

Success means the user can create and send a production-ready job package faster than the current manual process and without needing to rebuild the same layout every time.

## Recommendation

Build the product as a mobile-first web app with a mandatory review step between intake and generation.

This fits the real workflow, supports phone use, and avoids the main risk of over-automation from inconsistent WhatsApp input.

## Open assumptions

This design assumes:

- Illustrator remains the main design tool
- the web app receives exported artwork files rather than editing AI files directly
- the same supplier tech pack layout can be reused with templated content
- the first version serves one business process before expanding to team collaboration
