# Mixed dashboard, customer database, job tracker, and invoice design

## Goal

Create one operational dashboard that helps manage the business day to day from one place:

- customer database
- job tracking
- invoice tracking

The dashboard should make it easy to:

- see active work quickly
- follow each customer history
- track job stage and urgency
- connect jobs to invoice totals and payment status

## Product direction

This should be built as one connected system with three linked record types:

- `Customer`
- `Job`
- `Invoice`

The dashboard sits on top of those records and becomes the main working page.

## Why this structure

The current app is job-first and stores only basic customer text inside each job.

That is no longer enough for the workflow you described. You want to:

- keep repeat customer records
- gather customer details in one place
- track jobs by stage and urgency
- connect jobs to invoice pricing

So the next version should move from a simple job list into a connected operations system.

## Scope

This design covers:

- mixed dashboard home page
- customer database
- job tracker with stage and priority
- invoice system with history and payment status
- links between customers, jobs, and invoices
- mobile-friendly use on phone for daily tracking and generation flow

This design does not cover:

- online payment gateway
- automatic WhatsApp messaging
- accounting integration with external software

## Mobile-first requirement

The system should remain usable on phone, not only desktop.

This is important because you want to be able to:

- open the dashboard from your phone
- check customers and job stages quickly
- review invoice information
- move into the generation flow without needing a desktop

The first version does not need a separate mobile app, but the web UI should be designed as mobile-first and responsive.

## Core records

### Customer

The customer record should become the main source of truth for buyer information.

Recommended first version fields:

- customer name
- company name
- phone
- email
- address
- delivery note
- preferred payment
- internal notes
- outstanding balance

The customer record should also show:

- linked jobs
- linked invoices
- recent activity

### Job

Jobs remain the production record, but should now be linked to a customer instead of only storing a free-text customer name.

Each job should support:

- project name
- linked customer
- stage
- priority
- created date
- due date optional
- category
- section/item details already supported by the current system
- invoice link if billed

### Invoice

The invoice record should connect customer and jobs into one billable summary.

Recommended first version fields:

- invoice number
- linked customer
- linked jobs
- subtotal
- notes
- total
- payment status
- created date
- due date optional

Payment status options for first version:

- `Draft`
- `Sent`
- `Partially Paid`
- `Paid`
- `Overdue`

## Job workflow

You approved a simple stage workflow plus urgency.

### Job stages

First version stages:

- `New`
- `Design`
- `Waiting approval`
- `Production`
- `Done`

### Priority

First version priority:

- `Normal`
- `Urgent`
- `Rush`

The dashboard should make both stage and priority visible without opening the job.

## Mixed dashboard layout

The main dashboard page should combine all three areas in one screen.

### Top summary row

Show high-level cards such as:

- active jobs
- waiting approval
- in production
- overdue invoices
- unpaid balance
- total customers

These cards should act as quick operational signals.

On phone:

- summary cards should stack vertically or in a 2-column compact grid
- the most urgent cards should appear first
- each card should remain tappable with large touch targets

### Main dashboard sections

Below the summary row, show three main areas:

1. `Customer database`
2. `Job tracker`
3. `Invoices`

On desktop these can appear as stacked dashboard sections.

On phone they should remain a single-column flow with clear section headings and fast actions near the top of each block.

### Customer section

This section should show:

- searchable customer list
- quick customer info
- outstanding balance
- job count
- invoice count

Clicking a customer should open a customer detail view with:

- full profile
- linked jobs
- linked invoices
- notes

### Job section

This section should show:

- jobs grouped by stage
- visible priority badge
- linked customer name
- invoice state if already billed

Recommended interaction:

- fast filters by stage
- filter by priority
- filter by customer
- quick action to open review page

On phone, the job section should prioritize:

- tap-friendly stage badges
- large priority badges
- one primary action button such as `Open` or `Generate`
- no dense table that requires horizontal scrolling for the main workflow

### Invoice section

This section should show:

- invoice number
- customer
- related jobs
- total
- payment status
- due date if used

Recommended interaction:

- quick filter for unpaid invoices
- quick filter for overdue invoices
- open invoice detail/preview

On phone, invoice cards should show:

- invoice number
- customer
- total
- payment status
- one main action such as `View` or `Print`

## Customer detail design

The customer detail page should be a simple business profile page.

Recommended blocks:

### Profile

- name
- company
- phone
- email
- address
- payment preference
- delivery note
- notes

### Jobs

- all linked jobs
- stage
- priority
- latest activity

### Invoices

- invoice history
- total billed
- total paid
- outstanding balance

This page is important because you said you want to gather customer database information in one place.

## Invoice behavior

The invoice system should be a real record system, not just a single total field.

### Invoice creation

An invoice should be created from one or more jobs linked to the same customer.

### Invoice detail

The invoice detail should show:

- invoice number
- customer details
- included jobs
- subtotal
- notes
- total
- payment status

### Invoice output

First version should support:

- invoice preview page
- print/save as PDF

On phone, the invoice preview page should still be readable and printable, even if the actual print/save step is easier on desktop.

Later versions can add more advanced billing actions if needed.

## Data relationships

The recommended data model should become:

- one `Customer` has many `Job`
- one `Customer` has many `Invoice`
- one `Invoice` belongs to one `Customer`
- one `Invoice` can include many `Job`
- one `Job` belongs to one `Customer`
- one `Job` may belong to zero or one `Invoice` in the first version

This keeps the first version simpler than a fully flexible many-to-many invoice system, while still covering normal use.

## Migration direction

The current app stores `customerName` as text on `Job`.

The new version should:

1. add real `Customer` records
2. link jobs to customers
3. keep backward compatibility during migration
4. allow existing jobs with only text customer names to be mapped later

This is important so the current job data is not lost.

## Mobile behavior

The first version should treat mobile usage as a real daily workflow.

### Mobile dashboard priorities

When opened on phone, the dashboard should help the user do these actions quickly:

1. check urgent jobs
2. open a customer
3. open a job
4. continue to generation
5. check invoice/payment status

### Mobile layout rules

- use stacked cards instead of wide tables for primary pages
- keep top actions visible without excessive scrolling
- use larger touch targets for buttons and filters
- avoid multi-column layouts that become cramped on small screens
- keep the most important information visible in the first screen height

### Mobile generation support

The user should be able to start from the dashboard on phone and continue into the existing job review and generation pages.

That means:

- dashboard links must work cleanly on phone
- customer pages must link into jobs
- job cards must link into review/generate actions
- the interface should not depend on hover behavior or desktop-only spacing

## Dashboard success criteria

The dashboard is successful if you can:

- open one page and see which jobs need attention
- find any customer quickly
- open a customer and see their jobs and invoice history
- track job stage and urgency clearly
- create and follow invoices from the same system
- check unpaid and overdue invoices easily
- do the main tracking and generation flow from a phone without the layout breaking

## Acceptance criteria

- mixed dashboard page exists
- customer database exists with full customer records
- jobs support approved stage workflow
- jobs support priority
- invoices support invoice number, total, notes, and payment status
- customer, job, and invoice records are linked
- customer detail page shows jobs and invoices
- dashboard shows summary cards and operational lists
- dashboard and key flows are mobile-friendly for phone use
