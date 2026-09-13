import { getDb } from "@/db/connection";
import { leads, jobs } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getBusinessConfig } from "@/lib/config";

export async function runDiscoveryCycle() {
  const db = getDb();
  const biz = getBusinessConfig();
  
  for (const keyword of biz.icp.keywords) {
    await db.insert(jobs).values({
      type: "discover_profiles",
      payload: JSON.stringify({ keyword })
    });
  }
}

export async function runContactCycle(limit = 10) {
  const db = getDb();
  const qualifiedLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.pipelineStatus, "qualified"),
        eq(leads.doNotContact, false)
      )
    )
    .limit(limit);
  
  for (const lead of qualifiedLeads) {
    // Verificar se já existe job pendente para esse lead
    const existingJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.type, "send_first_dm"),
          or(eq(jobs.status, "pending"), eq(jobs.status, "running"))
        )
      );
    
    const alreadyQueued = existingJobs.some(j => {
      try {
        const p = JSON.parse(j.payload as string);
        return p.leadId === lead.id;
      } catch {
        return false;
      }
    });

    if (!alreadyQueued) {
      await db.insert(jobs).values({
        type: "send_first_dm",
        payload: JSON.stringify({ leadId: lead.id })
      });
      console.log(`[CAMPAIGN] Lead @${lead.instagramHandle} enfileirado para abordagem`);
    }
  }
}

export async function getActiveCampaignStats() {
  const db = getDb();
  const allLeads = await db.select().from(leads);
  return {
    discovered: allLeads.filter(l => l.pipelineStatus === "discovered").length,
    qualified: allLeads.filter(l => l.pipelineStatus === "qualified").length,
    contacted: allLeads.filter(l => l.pipelineStatus === "contacted").length,
  };
}
