import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: Client | null = null;

export function getLibsqlClient(): Client {
  if (_client) return _client;

  const dbUrl = process.env.DATABASE_URL || "./data/prospector.db";

  if (dbUrl === ":memory:") {
    _client = createClient({
      url: "file::memory:",
    });
  } else {
    const dbPath = resolve(dbUrl);
    // Ensure directory exists
    mkdirSync(dirname(dbPath), { recursive: true });

    _client = createClient({
      url: `file:${dbPath}`,
    });
  }

  return _client;
}

export function getDb() {
  if (_db) return _db;
  const client = getLibsqlClient();
  _db = drizzle(client, { schema });
  return _db;
}

/** Execute raw SQL directly on the client */
export async function execSql(sql: string, args?: unknown[]): Promise<void> {
  const client = getLibsqlClient();
  await client.execute({ sql, args: (args ?? []) as (string | number | null | Uint8Array)[] });
}

/** Execute raw SQL and get result */
export async function querySql(sql: string, args?: unknown[]) {
  const client = getLibsqlClient();
  return client.execute({ sql, args: (args ?? []) as (string | number | null | Uint8Array)[] });
}

export async function closeDb(): Promise<void> {
  if (_client) {
    _client.close();
    _client = null;
    _db = null;
  }
}

/** Initialize database with WAL mode and pragmas */
export async function initDb(): Promise<void> {
  const client = getLibsqlClient();
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA busy_timeout = 5000");
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("PRAGMA synchronous = NORMAL");
}
