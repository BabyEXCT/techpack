# Order list and bin design

## Goal

Make the order list easier to manage by allowing the user to:

- view an order
- edit an order
- move an order to bin instead of deleting it permanently
- restore orders from bin
- delete permanently only from bin

## Main behavior

### Jobs page

The main `Jobs` page shows only active orders.

Each order card should provide:

- `View`
- `Edit`
- `Delete`

### View

Opens the order in its normal review flow so the user can inspect details.

### Edit

Opens the same review page for editing.

For the first version, `View` and `Edit` can go to the same route if there is no real read-only mode yet.

### Delete

Delete does not remove the order permanently.

Instead, it moves the order into `Bin`.

## Bin page

Add a simple bin page or section that shows deleted orders.

Each deleted order should have:

- `Restore`
- `Delete permanently`

## Data behavior

Orders should support soft delete.

Instead of removing the order immediately, mark it as deleted using a status or soft-delete field.

Recommended behavior:

- active orders appear in `Jobs`
- deleted orders appear in `Bin`
- restoring changes the status back to active
- permanent delete removes the record and its related generated data/file references

## UI structure

### Jobs page header

At the top of the Jobs page:

- `New job`
- `Bin`

### Order cards

Each job card should show:

- project name
- created date
- quick actions row

Recommended actions:

- `View`
- `Edit`
- `Delete`

### Bin page

Each deleted card should show:

- project name
- deleted or created date
- actions:
  - `Restore`
  - `Delete permanently`

## Safety rules

- deleting from Jobs always means “move to bin”
- permanent delete is only allowed inside Bin
- permanent delete should require confirmation

## Scope

This feature covers:

- Jobs list actions
- Bin list UI
- soft delete flow
- restore flow
- permanent delete flow

This feature does not require:

- file system cleanup in the first version if risky
- read-only detail page
- batch delete or batch restore

## Acceptance criteria

- user can view and edit from the Jobs list
- clicking delete on Jobs moves order to Bin
- deleted orders disappear from Jobs
- deleted orders appear in Bin
- restore brings order back to Jobs
- permanent delete is only available from Bin

