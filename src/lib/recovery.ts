import { querySql, execSql } from "@/db/connection";
import { getLibsqlClient } from "@/db/connection";

export async function recoverDeadLetterJobs(): Promise<number> {
  const result = await querySql(
    "UPDATE jobs SET status = 'pending', attempts = 0 WHERE status = 'dead_letter' RETURNING id"
  );
  return result.rows.length;
}

export async function resetStuckJobs(): Promise<number> {
  // Reset jobs stuck in 'running' for more than 30 minutes
  const result = await querySql(
    "UPDATE jobs SET status = 'pending', lock_key = NULL WHERE status = 'running' AND started_at < datetime('now', '-30 minute') RETURNING id"
  );
  return result.rows.length;
}

export async function checkDatabaseIntegrity(): Promise<boolean> {
  const client = getLibsqlClient();
  const res = await client.execute("PRAGMA integrity_check");
  return res.rows[0]?.[0] === "ok";
}
