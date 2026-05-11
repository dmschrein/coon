# Database Migrations

## Convention: hand-written SQL, applied via `psql`

Migrations from `0006_inbox_items.sql` onward are **hand-written** and applied directly with `psql`. Drizzle-kit is no longer used for generation or application:

- `meta/_journal.json` only contains entries for `0000`–`0004` (the original kit-generated migrations). It has not been kept in sync.
- `drizzle.__drizzle_migrations` in the production database is empty — the kit's migrate command has never been the source of truth here.

As a result, **`npm run db:generate` and `npm run db:migrate` are intentionally disabled** in `package.json`. They will print a pointer to this file and exit non-zero. Don't re-enable them without a full rebaseline (see "Future cleanup" below).

## How to add a new migration

1. **Update the schema** in [`../schema.ts`](../schema.ts) — add the new table, column, index, etc. using the existing patterns (snake_case in SQL, camelCase in Drizzle, FK + cascade on `user_id`, per-user indexes).
2. **Write the SQL** in `00NN_<name>.sql`, where `NN` is the next sequential number after the highest existing file. Match the style of [`0017_partners.sql`](./0017_partners.sql):
   - `CREATE TABLE IF NOT EXISTS …` (idempotent)
   - `--> statement-breakpoint` between statements
   - `CREATE INDEX IF NOT EXISTS …`
   - Inline `REFERENCES "users"("id") ON DELETE CASCADE` for FK columns
3. **Apply it** to the dev DB:
   ```bash
   psql "$DATABASE_URL" -f src/lib/db/migrations/00NN_<name>.sql
   psql "$DATABASE_URL" -c "\d <new_table>"   # verify
   ```
4. **Do not** run `drizzle-kit generate` — it diffs against the stale snapshot in `meta/` and will produce SQL that re-creates already-existing tables.

## What `meta/` contains and why it's stale

`meta/_journal.json` and `meta/0000_snapshot.json` … `meta/0004_snapshot.json` represent the schema as of migration `0004`. Every change since then has been applied to the live DB without updating these files.

Leaving them in place is harmless — drizzle's runtime (`drizzle-orm`) doesn't read them; only the kit does, and the kit is disabled. If you delete them, `drizzle-kit pull` would have to be used to rebaseline before the kit could ever produce useful output again.

## Future cleanup (optional, not currently blocking anything)

If diffing-based generation is ever needed again:

1. Run `drizzle-kit pull` against a DB that exactly matches `schema.ts` to introspect a fresh baseline.
2. Replace `meta/` with the freshly introspected snapshot + a single new journal entry.
3. Optionally seed `drizzle.__drizzle_migrations` with synthetic rows so `drizzle-kit migrate` is a no-op against the current state.
4. Re-enable the `db:generate` / `db:migrate` scripts.

Until then, the convention above is the source of truth.
