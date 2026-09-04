'use server'

import { execSql, querySql } from "@/db/connection";
import { revalidatePath } from "next/cache";

export async function togglePauseAction(currentState: boolean) {
  const newState = !currentState;
  await execSql(
    `UPDATE system_state SET value = ?, updated_at = datetime('now') WHERE key = 'is_paused'`,
    [JSON.stringify(newState)]
  );
  revalidatePath("/");
  return newState;
}
