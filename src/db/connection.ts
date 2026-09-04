import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: Client | null = null;
let _tablesEnsured = false;

export function getLibsqlClient(): Client {
  if (_client) return _client;

  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    if (process.env.VERCEL) {
      dbUrl = "/tmp/prospector.db";
    } else {
      dbUrl = "./data/prospector.db";
    }
  }

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

async function ensureTablesOnce() {
  if (_tablesEnsured) return;
  _tablesEnsured = true;
  try {
    const { ensureTablesExist } = await import("./migrate");
    await ensureTablesExist();
  } catch (err) {
    console.error("Auto table creation error:", err);
  }
}

/** Execute raw SQL directly on the client */
export async function execSql(sql: string, args?: unknown[]): Promise<void> {
  try {
    const client = getLibsqlClient();
    if (!_tablesEnsured && !sql.includes("CREATE TABLE")) {
      await ensureTablesOnce();
    }
    await client.execute({ sql, args: (args ?? []) as (string | number | null | Uint8Array)[] });
  } catch (err) {
    console.error("[DB execSql error]:", err);
  }
}

/** Execute raw SQL and get result */
export async function querySql(sql: string, args?: unknown[]) {
  try {
    const client = getLibsqlClient();
    if (!_tablesEnsured) {
      await ensureTablesOnce();
    }
    return await client.execute({ sql, args: (args ?? []) as (string | number | null | Uint8Array)[] });
  } catch (err) {
    console.error("[DB querySql error]:", err);
    return { rows: [], columns: [] };
  }
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
