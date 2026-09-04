import { getDb } from "@/db/connection";
import { jobs, systemState } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function runHealthCheck() {
  const db = getDb();
  const failedJobs = await db.select().from(jobs).where(eq(jobs.status, "failed"));
  const allJobs = await db.select().from(jobs);
  
  const errorRate = allJobs.length > 0 ? failedJobs.length / allJobs.length : 0;
  
  if (errorRate > 0.5) {
    await db.insert(systemState).values({
      key: "system_paused",
      value: JSON.stringify({ paused: true, reason: "High error rate" })
    }).onConflictDoUpdate({
      target: systemState.key,
      set: { value: JSON.stringify({ paused: true, reason: "High error rate" }) }
    });
  }
  
  return { status: errorRate > 0.5 ? "unhealthy" : "healthy", errorRate };
}
