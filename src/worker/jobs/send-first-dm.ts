import { getDb } from "@/db/connection";
import { leads, conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { draftFirstMessage } from "@/integrations/openai/conversation-engine";
import { getEnvConfig } from "@/lib/config";

export async function executeSendFirstDM(payload: any) {
  const { leadId } = payload;
  const db = getDb();
  
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("Lead not found");
  
  if (lead.pipelineStatus !== "qualified" || lead.doNotContact) {
    throw new Error("Lead not eligible for first DM");
  }
  
  // Rate limits mock
  const env = getEnvConfig();
  
  // Experiment mock
  const variant = "default";
  
  const profileData = JSON.stringify({ handle: lead.instagramHandle, bio: lead.bio });
  const draft = await draftFirstMessage(profileData, lead.icpSegment || "default", leadId, variant);
  
  // Browser DM sending mocked
  
  await db.transaction(async (tx) => {
    let [conv] = await tx.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
    if (!conv) {
      const inserted = await tx.insert(conversations).values({ leadId, channel: "browser" }).returning();
      conv = inserted[0];
    }
    
    await tx.insert(messages).values({
      conversationId: conv.id,
      leadId: leadId,
      direction: "outbound",
      channel: "browser",
      content: draft,
    });
    
    await tx.update(leads).set({ pipelineStatus: "contacted", channelStatus: "browser_contact_sent" }).where(eq(leads.id, leadId));
  });
}
