import { getDb } from "@/db/connection";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { draftFirstMessage } from "@/integrations/openai/conversation-engine";
import { sendFirstDM as executeBrowserDM } from "@/integrations/browser/dm-sender";

export async function executeSendFirstDM(payload: any) {
  const { leadId } = payload;
  const db = getDb();
  
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("Lead not found");
  
  if (lead.doNotContact) {
    throw new Error("Lead marked as doNotContact");
  }
  
  const variant = "default";
  const profileData = JSON.stringify({ handle: lead.instagramHandle, bio: lead.bio, name: lead.name });
  const draft = await draftFirstMessage(profileData, lead.icpSegment || "default", leadId, variant);
  
  console.log(`[WORKER] Sending first DM to @${lead.instagramHandle}: "${draft.slice(0, 40)}..."`);
  
  await executeBrowserDM(lead.instagramHandle, draft, leadId, variant);
}
