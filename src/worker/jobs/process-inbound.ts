import { getDb } from "@/db/connection";
import { leads, conversations, messages, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processConversationTurn } from "@/integrations/openai/conversation-engine";
import { performHandoff } from "@/integrations/instagram/channel-handoff";
import { generateWhatsAppHandoff } from "@/integrations/whatsapp/handoff";
import { sendMessage } from "@/integrations/instagram/api-client";

export async function executeProcessInbound(payload: any) {
  const { metaMessageId, senderId, text, leadId: payloadLeadId } = payload;
  const db = getDb();
  
  let leadId = payloadLeadId;
  let [lead] = leadId ? await db.select().from(leads).where(eq(leads.id, leadId)).limit(1) : [];
  
  if (!lead) {
    const inserted = await db.insert(leads).values({
      instagramHandle: "unknown",
      instagramId: senderId,
      pipelineStatus: "discovered"
    }).returning();
    lead = inserted[0];
    leadId = lead.id;
  }
  
  let [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
  if (!conv) {
    const inserted = await db.insert(conversations).values({ leadId, channel: "api" }).returning();
    conv = inserted[0];
  }
  
  if (lead.channelStatus !== "api_active") {
    await performHandoff(leadId, senderId);
  }
  
  await db.insert(messages).values({
    conversationId: conv.id,
    leadId,
    direction: "inbound",
    channel: "api",
    content: text,
    metaMessageId
  });
  
  const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conv.id));
  const history = allMessages.map(m => `${m.direction}: ${m.content}`).join("\n");
  const profileData = JSON.stringify({ handle: lead.instagramHandle });
  
  const turn = await processConversationTurn(profileData, history, text, lead.pipelineStatus, leadId, conv.id);
  
  let newStatus = turn.newPipelineStatus || lead.pipelineStatus;
  
  if (turn.intent.intent === "opt_out") {
    await db.update(leads).set({ doNotContact: true, pipelineStatus: "closed" }).where(eq(leads.id, leadId));
    return;
  }
  
  if (turn.reply) {
    if (turn.intent.intent === "wants_whatsapp") {
      const link = await generateWhatsAppHandoff(leadId);
      turn.reply += `\n${link}`;
      newStatus = "whatsapp_handoff";
    }
    
    await sendMessage(leadId, turn.reply);
    
    await db.insert(messages).values({
      conversationId: conv.id,
      leadId,
      direction: "outbound",
      channel: "api",
      content: turn.reply,
    });
  }
  
  await db.update(leads).set({ pipelineStatus: newStatus }).where(eq(leads.id, leadId));
  
  if (turn.action.followUpDelayHours) {
    const delay = new Date();
    delay.setHours(delay.getHours() + turn.action.followUpDelayHours);
    await db.insert(jobs).values({
      type: "follow_up",
      payload: JSON.stringify({ leadId }),
      scheduledAt: delay.toISOString()
    });
  }
}
