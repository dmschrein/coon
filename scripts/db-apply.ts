/**
 * Migration runner — applies hand-written SQL migrations in
 * src/lib/db/migrations/ to the Neon DB pointed at by DATABASE_URL.
 *
 * Tracks applied filenames in `schema_migrations`. On first run against
 * an existing DB (users table present, tracking empty), prompts to
 * baseline all current files as already-applied without executing them.
 *
 * Usage:
 *   npm run db:migrate          # apply pending
 *   npm run db:status           # list applied + pending, no changes
 *   npm run db:migrate -- --yes # skip baseline confirmation
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import readline from "node:readline/promises";
import * as dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MIGRATIONS_DIR = path.resolve(process.cwd(), "src/lib/db/migrations");
const FILENAME_RE = /^\d{4}_.*\.sql$/;
const BREAKPOINT_RE = /-->\s*statement-breakpoint\s*/i;

interface Args {
  status: boolean;
  autoYes: boolean;
}

function parseArgs(argv: string[]): Args {
  return {
    status: argv.includes("--status"),
    autoYes: argv.includes("--yes") || argv.includes("-y"),
  };
}

async function discoverFiles(): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  return entries.filter((f) => FILENAME_RE.test(f)).sort();
}

async function listApplied(pool: Pool): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  return new Set(rows.map((r) => r.filename));
}

async function hasUsersTable(pool: Pool): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    "SELECT to_regclass('public.users') IS NOT NULL AS exists"
  );
  return rows[0]?.exists ?? false;
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

async function ensureTrackingTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function baseline(
  pool: Pool,
  files: string[],
  autoYes: boolean
): Promise<void> {
  console.log(
    `\nschema_migrations is empty but the \`users\` table exists.\n` +
      `Assuming the ${files.length} migration file(s) in src/lib/db/migrations/ ` +
      `are already applied to this database.\n`
  );
  if (!autoYes) {
    const ok = await confirm("Mark them all as applied without executing?");
    if (!ok) {
      console.log("Aborted. No changes made.");
      process.exit(1);
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const f of files) {
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [f]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  console.log(`Baselined ${files.length} migration(s).`);
}

async function applyOne(pool: Pool, filename: string): Promise<void> {
  const text = await fs.readFile(path.join(MIGRATIONS_DIR, filename), "utf8");
  const statements = text
    .split(BREAKPOINT_RE)
    .map((s) => s.trim())
    .filter(Boolean);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Check community-builder/.env.local."
    );
  }

  const pool = new Pool({ connectionString: url });

  try {
    await ensureTrackingTable(pool);
    const files = await discoverFiles();
    const applied = await listApplied(pool);

    if (applied.size === 0 && (await hasUsersTable(pool))) {
      if (args.status) {
        console.log(
          `Status: tracking empty, but \`users\` table exists. ` +
            `Run \`npm run db:migrate\` to baseline (${files.length} files).`
        );
        return;
      }
      await baseline(pool, files, args.autoYes);
      return;
    }

    const pending = files.filter((f) => !applied.has(f));

    if (args.status) {
      console.log(`Applied: ${applied.size}`);
      console.log(`Pending: ${pending.length}`);
      for (const f of pending) console.log(`  pending: ${f}`);
      return;
    }

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const f of pending) {
      process.stdout.write(`Applying ${f}… `);
      await applyOne(pool, f);
      console.log("ok");
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nMigration runner failed:");
  console.error(err);
  process.exit(1);
});
