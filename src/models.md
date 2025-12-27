# Data Model Changes

Use this checklist when adding a new column/field that should sync across devices.

## Local types and UI
- Update the relevant types in `src/models.ts`.
- Update any UI/persistence logic that reads/writes the field.

## CSV mapping
- Add the column name to `CSV_COLUMNS` in `src/csv.ts`.
- Update `buildExportRows` to emit the field.
- Update `parseCsvData` to read the field and populate the model.
- Update merge logic in `src/csv.ts` if the field should participate in "newer wins".

## Sync payload (client)
- Add the field to `SyncRow` in `src/syncClient.ts`.
- Update the `build*SyncRow` helpers to include it.

## Sync payload (server)
- Add the field to `convex/schema.ts` in the `sync_rows` table.
- Add the field to the `syncPush` validator in `convex/sync.ts`.
- Normalize/compare the field in `convex/syncHelpers.ts` if it affects equality.

## Tests
- Update or add tests in:
  - `tests/csv.test.ts`
  - `tests/sync-client.test.ts`
  - `tests/convex-sync-helpers.test.ts`

## Optional
- If the field is UI-only (not synced), you can skip the CSV + Convex steps.
