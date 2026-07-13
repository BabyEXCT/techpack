# Dashboard sidebar, calendar, and reminder redesign

## Goal

Redesign the current app into a more proper system-style UI with:

- a real sidebar
- a stronger dashboard homepage
- a monthly calendar for order tracking
- automatic reminder and to-do items

The redesign should still support phone use, so the dashboard remains useful when opened from mobile.

## Product direction

This is a dashboard-first shell redesign, not a full rebuild of every page at once.

The first implementation should:

- replace the simple top navigation with a proper system shell
- make the dashboard the real home page
- add the calendar and reminder workflow
- keep the current `Customers`, `Jobs`, and `Invoices` pages inside the new shell

This keeps the scope focused while still making the app feel like a proper system.

## Scope

This design covers:

- redesigned app shell
- left sidebar on desktop
- compact mobile header/navigation behavior
- redesigned dashboard
- monthly calendar
- automatic reminder list
- dashboard operational panels
- support for both approval date and delivery date
- visual polish direction for a more professional system UI

This design does not cover:

- redesigning every internal form page in full detail
- drag-and-drop scheduling
- external calendar sync
- manual reminder creation in the first version

## Design intent

The new UI should feel like an operations dashboard, not a basic utility page.

The visual direction should aim for:

- cleaner information hierarchy
- more polished spacing and layout
- stronger navigation structure
- better scanning for busy daily work
- fewer plain stacked boxes
- a more premium system feel

The later implementation should follow the `design-taste-frontend-v1` direction when applying the final UI styling and composition.

## App shell

The shell should become the main structural improvement.

### Desktop

Desktop should use a two-column layout:

- fixed or sticky left sidebar
- main content area on the right

### Sidebar

The sidebar should contain the main pinned navigation:

- `Dashboard`
- `Customers`
- `Jobs`
- `Calendar`
- `Invoices`

Recommended extra sidebar behavior:

- current page highlight
- clear icon + label pairing
- quick `New job` action near the top or bottom

### Mobile

On phone, the sidebar should collapse into a compact mobile pattern.

Recommended behavior:

- top header
- menu trigger or horizontal compact nav
- no permanently visible desktop sidebar on small screens

The mobile layout should remain easy to tap and should not depend on hover behavior.

## Dashboard structure

The dashboard should become the operational home page.

Recommended dashboard zones:

### Summary cards

Top row should show:

- active jobs
- waiting approval
- urgent jobs
- unpaid invoices
- outstanding balance
- total customers

These should be visually stronger than the current plain cards and easy to scan quickly.

### Reminder list

This should behave like a system-generated to-do panel.

The user requested reminder-style tracking, so the dashboard should show a clear list of work needing attention.

Examples:

- approval due soon
- delivery due soon
- overdue delivery
- urgent or rush job needing action
- unpaid or overdue invoice

This list should be ordered by urgency, not by creation time.

### Calendar panel

The dashboard should include a monthly calendar.

The calendar should visualize job deadlines using both:

- approval date
- delivery date

These should use different visual treatments so they can be distinguished at a glance.

### Operational panels

Below or beside the calendar, the dashboard should include smaller panels for:

- recent customers
- active jobs
- unpaid invoices

These panels should help the user jump deeper into the system quickly.

## Calendar behavior

The user wants both approval date and delivery date tracked.

So each job should eventually support:

- `approvalDate`
- `deliveryDate`

### Calendar rules

In the monthly calendar:

- approval deadlines should display differently from delivery deadlines
- each event should show enough context to identify the job quickly
- events should prefer short readable labels instead of dense text

Recommended event content:

- job/project name
- customer name
- stage or priority when useful

### Calendar interaction

The first version should support simple interaction:

- click/tap a calendar item to open the related job
- view month navigation
- highlight today clearly

The first version does not need drag-and-drop editing.

## Reminder system

The first version should use system-generated reminders only.

### Reminder sources

The system should automatically generate reminder items from:

- jobs with approval dates approaching
- jobs with delivery dates approaching
- overdue jobs
- urgent or rush jobs still not advanced
- unpaid invoices
- overdue invoices

### Reminder output

Each reminder should include:

- short title
- why it needs attention
- related customer or job
- direct action link when possible

Examples:

- `Approval due tomorrow for Team Alpha jersey`
- `Delivery overdue for SMK Putra order`
- `Invoice INV-014 still unpaid`

## Mobile-first behavior

The redesign must still work well on phone.

### Mobile dashboard priorities

On phone, the dashboard should help the user do these actions quickly:

1. check urgent reminders
2. check today and this week in the calendar
3. open a job
4. open a customer
5. continue to generation

### Mobile layout rules

- use stacked cards and panels
- avoid wide data tables for the main experience
- keep touch targets large
- keep the most important reminder and calendar information near the top
- allow the user to continue into current job review/generation pages without layout breakage

## Information architecture

The redesigned system should work like this:

### Dashboard

Main operational overview:

- summary
- reminders
- calendar
- quick panels

### Customers

Customer database and history

### Jobs

Production and order tracking

### Calendar

Dedicated date-driven view of jobs

### Invoices

Payment and invoice tracking

This structure matches the sidebar menu the user approved.

## Data model implications

The current dashboard redesign depends on a few record additions or stronger usage of existing data:

- `workflowStage`
- `priority`
- `approvalDate`
- `deliveryDate`
- invoice payment status

The customer, job, and invoice relationships already being introduced should remain the base of the system.

The calendar and reminder features should read from those records rather than inventing a separate tracking model.

## Implementation recommendation

The first UI redesign slice should include:

1. new app shell with sidebar and mobile nav
2. redesigned dashboard layout
3. monthly calendar panel
4. automatic reminder list
5. quick links into existing pages

This is the best first slice because it delivers a visible system upgrade without forcing a full rewrite of every page at once.

After that, the internal pages can be visually aligned with the new shell one by one.

## Acceptance criteria

- desktop layout has a real sidebar
- mobile layout has compact navigation that remains usable on phone
- dashboard becomes the main home page
- dashboard includes summary cards
- dashboard includes automatic reminder list
- dashboard includes monthly calendar
- calendar supports both approval date and delivery date
- dashboard links cleanly into customers, jobs, calendar, and invoices
- overall visual direction feels more like a proper system than a basic utility page

