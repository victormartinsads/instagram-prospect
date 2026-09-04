import { getDb } from "@/db/connection";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scoreIcp } from "@/integrations/openai/conversation-engine";

export async function executeQualifyLead(payload: any) {
  const { leadId } = payload;
  const db = getDb();
  
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("Lead not found");
  
  if (lead.icpScore === 0) {
    const profileData = JSON.stringify({ handle: lead.instagramHandle, bio: lead.bio, category: lead.category });
    const scoreResult = await scoreIcp(profileData, leadId);
    
    const newStatus = scoreResult.score >= 30 ? "qualified" : lead.pipelineStatus;
    
    await db.update(leads).set({
      icpScore: scoreResult.score,
      icpSegment: scoreResult.segment,
      detectedRole: scoreResult.detectedRole,
      pipelineStatus: newStatus
    }).where(eq(leads.id, leadId));
  }
}
