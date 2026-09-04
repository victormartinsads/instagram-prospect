import { getDb } from "@/db/connection";
import { conversations, messages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getActiveConversations() {
  const db = getDb();
  const convs = await db.select().from(conversations).where(eq(conversations.status, "active"));
  
  const result = [];
  for (const conv of convs) {
    const [lastMsg] = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(desc(messages.sentAt)).limit(1);
    result.push({ ...conv, lastMessage: lastMsg });
  }
  
  return result;
}

export async function getConversationDetail(id: string) {
  const db = getDb();
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv) return null;
  
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.sentAt);
  
  return { ...conv, messages: msgs };
}
