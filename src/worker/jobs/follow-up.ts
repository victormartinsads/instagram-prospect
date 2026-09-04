import { getDb } from "@/db/connection";
import { leads, conversations, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { draftReply } from "@/integrations/openai/conversation-engine";
import { sendMessage } from "@/integrations/instagram/api-client";

export async function executeFollowUp(payload: any) {
  const { leadId } = payload;
  const db = getDb();
  
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead || lead.doNotContact || lead.pipelineStatus === "closed") return;
  
  const [conv] = await db.select().from(conversations).where(eq(conversations.leadId, leadId)).limit(1);
  if (!conv) return;
  
  const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conv.id));
  const history = allMessages.map(m => `${m.direction}: ${m.content}`).join("\n");
  const profileData = JSON.stringify({ handle: lead.instagramHandle });
  
  const reply = await draftReply(profileData, history, "ask_question", true, leadId, conv.id);
  
  if (lead.channelStatus === "api_active") {
    await sendMessage(leadId, reply);
    await db.insert(messages).values({
      conversationId: conv.id,
      leadId,
      direction: "outbound",
      channel: "api",
      content: reply,
    });
  } else {
    // browser logic (mocked)
    await db.insert(messages).values({
      conversationId: conv.id,
      leadId,
      direction: "outbound",
      channel: "browser",
      content: reply,
    });
  }
}
