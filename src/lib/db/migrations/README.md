# Database Migrations

## Convention: hand-written SQL, applied via `npm run db:migrate`

Migrations from `0006_inbox_items.sql` onward are **hand-written**. A small runner (`scripts/db-apply.ts`) applies them in order and tracks applied filenames in a `schema_migrations` table. Drizzle-kit is no longer used for generation or application:

- `meta/_journal.json` only contains entries for `0000`–`0004` (the original kit-generated migrations). It has not been kept in sync.
- `drizzle.__drizzle_migrations` in the production database is empty — the kit's migrate command has never been the source of truth here.

As a result, **`npm run db:generate` stays intentionally disabled** in `package.json` — it prints a pointer to this file and exits non-zero. Don't re-enable it without a full rebaseline (see "Future cleanup" below). `npm run db:migrate` is the runner described above and is the only supported way to apply migrations.

### First run against an existing DB

The runner auto-detects the bootstrap case: if `schema_migrations` is empty _and_ a `users` table already exists, it prompts to mark every current file as applied **without executing them**. Confirm with `y` once per environment and tracking is in sync from then on. Pass `--yes` to skip the prompt in scripted/CI use.

## How to add a new migration

1. **Update the schema** in [`../schema.ts`](../schema.ts) — add the new table, column, index, etc. using the existing patterns (snake_case in SQL, camelCase in Drizzle, FK + cascade on `user_id`, per-user indexes).
2. **Write the SQL** in `00NN_<name>.sql`, where `NN` is the next sequential number after the highest existing file. Match the style of [`0017_partners.sql`](./0017_partners.sql):
   - `CREATE TABLE IF NOT EXISTS …` (idempotent)
   - `--> statement-breakpoint` between statements
   - `CREATE INDEX IF NOT EXISTS …`
   - Inline `REFERENCES "users"("id") ON DELETE CASCADE` for FK columns
3. **Apply it** to the dev DB:
   ```bash
   npm run db:status                # confirm the new file shows up as pending
   npm run db:migrate               # applies pending migrations in order, inside transactions
   npm run db:psql -- -c "\d <new_table>"     # spot-check the result
   ```
4. **Do not** run `drizzle-kit generate` — it diffs against the stale snapshot in `meta/` and will produce SQL that re-creates already-existing tables.

### Ad-hoc DB access — `npm run db:psql`

When you need a quick query or interactive shell against the dev DB, `npm run db:psql` reads `DATABASE_URL` from `.env.local` and execs `psql` against it. Anything after `--` is forwarded to psql:

```bash
npm run db:psql                                    # interactive shell
npm run db:psql -- -c "SELECT now()"               # one-off query
npm run db:psql -- -f path/to/seed.sql             # run a SQL file
```

Prefer this over exporting `DATABASE_URL` yourself — the helper handles the `.env.local` parsing so the URL never lands in your shell history.

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
