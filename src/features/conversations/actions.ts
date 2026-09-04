"use server";

import { getDb } from "@/db/connection";
import { conversations, messages, auditLog, leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendMessageWithHumanAgent } from "@/integrations/instagram/api-client";

export async function sendManualReply(conversationId: string, content: string) {
  const db = getDb();
  
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) throw new Error("Conversation not found");
  
  const [lead] = await db.select().from(leads).where(eq(leads.id, conv.leadId)).limit(1);
  if (!lead) throw new Error("Lead not found");
  
  if (lead.channelStatus === "api_active") {
    await sendMessageWithHumanAgent(conv.leadId, content);
  }
  
  await db.insert(messages).values({
    conversationId,
    leadId: conv.leadId,
    direction: "outbound",
    channel: lead.channelStatus === "api_active" ? "api" : "browser",
    content
  });
  
  await db.insert(auditLog).values({
    entityType: "conversation",
    entityId: conversationId,
    action: "manual_reply",
    actor: "operator",
    details: JSON.stringify({ content })
  });
}

export async function escalateConversation(conversationId: string) {
  const db = getDb();
  
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) throw new Error("Conversation not found");
  
  await db.update(leads).set({ channelStatus: "human_review_required" }).where(eq(leads.id, conv.leadId));
}

export async function closeConversationAction(conversationId: string, reason: string) {
  const db = getDb();
  await db.update(conversations).set({ status: "closed", closeReason: reason }).where(eq(conversations.id, conversationId));
}
