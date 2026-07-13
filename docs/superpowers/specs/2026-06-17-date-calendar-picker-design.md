# Date calendar picker design

## Goal

Make the `Date` field easier to use on mobile by replacing manual typing with a calendar picker in both:

- `New job` page
- `Review` page

## UX behavior

### New job

- Use a native date input: `<input type="date">`
- Auto-fill today’s date by default
- Store the value in the same format used today: `YYYY-MM-DD`

### Review page

- Use the same native date input: `<input type="date">`
- Show the saved value (or blank if not set)
- Saving the review continues to send `dateLabel` as `YYYY-MM-DD`

## Data / compatibility

- No database schema change
- No PDF template change required
- Existing behavior remains compatible because the stored `dateLabel` string stays the same

## Acceptance criteria

- On mobile, tapping the Date field opens a calendar UI
- New jobs start with today’s date filled in
- Review edits persist and generation uses the updated date

