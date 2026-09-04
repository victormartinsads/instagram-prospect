import { getDb } from "@/db/connection";
import { jobs, systemState } from "@/db/schema";
import { getBusinessConfig } from "@/lib/config";
import { eq, and } from "drizzle-orm";

export async function registerScheduledJobs() {
  const db = getDb();
  
  const ensureJob = async (type: string, payload: any = {}) => {
    const existing = await db.select().from(jobs).where(and(eq(jobs.type, type), eq(jobs.status, "pending")));
    if (existing.length === 0) {
      await db.insert(jobs).values({
        type,
        payload: JSON.stringify(payload)
      });
    }
  };

  const biz = getBusinessConfig();
  for (const keyword of biz.icp.keywords) {
    await ensureJob("discover_profiles", { keyword });
  }

  await ensureJob("follow_up");
  await ensureJob("health_check");
  await ensureJob("backup_database");
  await ensureJob("cleanup_dead_letter");
}
