import { getDb } from "@/db/connection";
import { leads, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
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

export async function runContactCycle() {
  const db = getDb();
  const qualifiedLeads = await db.select().from(leads).where(eq(leads.pipelineStatus, "qualified")).limit(10);
  
  for (const lead of qualifiedLeads) {
    await db.insert(jobs).values({
      type: "send_first_dm",
      payload: JSON.stringify({ leadId: lead.id })
    });
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
