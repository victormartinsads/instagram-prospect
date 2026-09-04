import { initDb, getDb } from "@/db/connection";
import { jobs, systemState } from "@/db/schema";
import { eq } from "drizzle-orm";
import { registerScheduledJobs } from "./scheduler";
import { executeDiscoverProfiles } from "./jobs/discover-profiles";
import { executeQualifyLead } from "./jobs/qualify-lead";
import { executeSendFirstDM } from "./jobs/send-first-dm";
import { executeProcessInbound } from "./jobs/process-inbound";
import { executeFollowUp } from "./jobs/follow-up";
import { runHealthCheck } from "./health-check";

async function ensureTablesExist() {
  // Assuming migrations run or tables exist via initDb
  await initDb();
}

async function main() {
  await ensureTablesExist();
  console.log("Worker started. Version 1.0.0");
  
  await registerScheduledJobs();
  
  const db = getDb();
  
  let isShuttingDown = false;
  const shutdown = () => { isShuttingDown = true; };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  
  while (!isShuttingDown) {
    const [pausedState] = await db.select().from(systemState).where(eq(systemState.key, "system_paused")).limit(1);
    if (pausedState) {
      const parsed = JSON.parse(pausedState.value as string);
      if (parsed.paused) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
    }
    
    // Check circuit breakers...
    
    const [job] = await db.select().from(jobs).where(eq(jobs.status, "pending")).limit(1);
    
    if (job) {
      await db.update(jobs).set({ status: "running" }).where(eq(jobs.id, job.id));
      
      try {
        const payload = JSON.parse(job.payload as string);
        switch (job.type) {
          case "discover_profiles": await executeDiscoverProfiles(payload); break;
          case "qualify_lead": await executeQualifyLead(payload); break;
          case "send_first_dm": await executeSendFirstDM(payload); break;
          case "process_inbound": await executeProcessInbound(payload); break;
          case "follow_up": await executeFollowUp(payload); break;
          case "health_check": await runHealthCheck(); break;
          case "backup_database": 
            const { createBackup } = await import("@/lib/backup");
            await createBackup(); 
            break;
          case "cleanup_dead_letter": 
            const { cleanOldBackups } = await import("@/lib/backup");
            cleanOldBackups(10); 
            break;
          default: console.log("Unknown job type:", job.type);
        }
        await db.update(jobs).set({ status: "completed" }).where(eq(jobs.id, job.id));
      } catch (err: any) {
        await db.update(jobs).set({ status: "failed", error: err.message }).where(eq(jobs.id, job.id));
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("Worker shutting down");
}

main().catch(console.error);
